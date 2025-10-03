# File Management Design

## Overview

This document details the technical design and implementation approach for file management operations in Phase 2, including upload, download, metadata management, and file operations.

## File Upload

### Upload Flow Architecture

```
┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│   Client   │────>│    API     │────>│  Storage   │────>│  Database  │
│  (Web UI)  │     │  (Express) │     │  (Volume)  │     │ (MongoDB)  │
└────────────┘     └────────────┘     └────────────┘     └────────────┘
                          │
                          ▼
                   ┌────────────┐     ┌────────────┐
                   │  RabbitMQ  │────>│   Worker   │
                   │   Queue    │     │ (Process)  │
                   └────────────┘     └────────────┘
```

### Upload Process

#### 1. Client Initiates Upload
```typescript
// Frontend: Upload component
const handleFileUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', file.name);
  formData.append('folderId', currentFolderId);

  const response = await apiClient.uploadFile(formData, {
    onUploadProgress: (progressEvent) => {
      const progress = (progressEvent.loaded / progressEvent.total) * 100;
      setUploadProgress(progress);
    }
  });
};
```

#### 2. API Receives Upload
```typescript
// Backend: File controller
export class FileController {
  public async upload(req: Request, res: Response): Promise<void> {
    const file = req.file; // From Multer middleware
    const { name, folderId } = req.body;
    const userId = req.userId;

    // 1. Validate file
    if (!file) throw new AppError(400, 'No file provided');
    if (file.size > MAX_FILE_SIZE) {
      throw new AppError(400, 'File too large');
    }

    // 2. Check storage quota
    const user = await User.findById(userId);
    if (user.storageUsed + file.size > user.storageQuota) {
      throw new AppError(400, 'Storage quota exceeded');
    }

    // 3. Generate storage key
    const storageKey = generateStorageKey(userId, file.originalname);

    // 4. Move file to storage
    await fs.promises.rename(
      file.path,
      path.join(STORAGE_PATH, storageKey)
    );

    // 5. Create database entry
    const fileDoc = await File.create({
      userId,
      folderId: folderId || null,
      name: name || file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      storageKey,
      version: 1,
    });

    // 6. Enqueue processing job
    await queueService.publishToQueue('file.upload', {
      fileId: fileDoc._id.toString(),
      userId,
      fileName: fileDoc.name,
      filePath: storageKey,
      mimeType: fileDoc.mimeType,
      size: fileDoc.size,
    });

    // 7. Return response
    res.status(201).json({
      status: 'success',
      data: { file: formatFileResponse(fileDoc) }
    });
  }
}
```

#### 3. Worker Processes File
```typescript
// Worker: Upload processor
export class UploadProcessor {
  public async process(job: IUploadJob): Promise<void> {
    const filePath = path.join(STORAGE_PATH, job.filePath);

    // 1. Virus scan (if ClamAV available)
    if (await this.virusScan(filePath)) {
      await this.quarantineFile(job.fileId);
      return;
    }

    // 2. Generate thumbnail (if image)
    if (job.mimeType.startsWith('image/')) {
      await this.generateThumbnail(filePath, job.fileId);
    }

    // 3. Extract metadata
    const metadata = await this.extractMetadata(filePath, job.mimeType);

    // 4. Update file document
    await File.findByIdAndUpdate(job.fileId, {
      metadata,
      processed: true,
    });

    // 5. Update user storage
    await User.findByIdAndUpdate(job.userId, {
      $inc: { storageUsed: job.size }
    });

    // 6. Create audit log
    await AuditLog.create({
      userId: job.userId,
      action: 'upload',
      resourceId: job.fileId,
      details: {
        fileName: job.fileName,
        size: job.size,
        mimeType: job.mimeType,
      },
    });
  }
}
```

### Chunked Upload (Large Files)

For files >10MB, implement resumable chunked uploads:

```typescript
// Frontend: Chunked upload
const uploadLargeFile = async (file: File) => {
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
  const chunks = Math.ceil(file.size / CHUNK_SIZE);

  // 1. Initiate upload
  const { uploadId } = await apiClient.initiateUpload({
    fileName: file.name,
    fileSize: file.size,
    totalChunks: chunks,
  });

  // 2. Upload chunks
  for (let i = 0; i < chunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    await apiClient.uploadChunk(uploadId, i, chunk);
    setProgress(((i + 1) / chunks) * 100);
  }

  // 3. Complete upload
  await apiClient.completeUpload(uploadId);
};
```

```typescript
// Backend: Chunk handler
export class ChunkController {
  public async uploadChunk(req: Request, res: Response): Promise<void> {
    const { uploadId, chunkIndex } = req.body;
    const chunk = req.file;

    // Save chunk temporarily
    const chunkPath = path.join(TEMP_PATH, uploadId, `${chunkIndex}`);
    await fs.promises.writeFile(chunkPath, chunk.buffer);

    // Update progress in Redis
    await redisService.set(
      `upload:${uploadId}:chunk:${chunkIndex}`,
      'complete',
      3600 // 1 hour TTL
    );

    res.json({ status: 'success' });
  }

  public async completeUpload(req: Request, res: Response): Promise<void> {
    const { uploadId } = req.body;

    // Combine chunks
    const chunks = await this.getChunks(uploadId);
    const finalPath = path.join(STORAGE_PATH, uploadId);
    
    await this.combineChunks(chunks, finalPath);
    await this.cleanupChunks(uploadId);

    // Continue normal upload flow
    // Create file document, enqueue processing, etc.
  }
}
```

---

## File Download

### Download Flow

```
┌────────────┐     ┌────────────┐     ┌────────────┐
│   Client   │────>│    API     │────>│  Database  │
│            │     │            │     │  (Check)   │
└────────────┘     └────────────┘     └────────────┘
      ▲                   │
      │                   ▼
      │            ┌────────────┐     ┌────────────┐
      └────────────│   Redis    │     │  Storage   │
                   │ (Cache URL)│     │  (Volume)  │
                   └────────────┘     └────────────┘
```

### Implementation

```typescript
// Backend: Download controller
export class FileController {
  public async getDownloadUrl(req: Request, res: Response): Promise<void> {
    const { fileId } = req.params;
    const userId = req.userId;

    // 1. Get file
    const file = await File.findById(fileId);
    if (!file || file.deletedAt) {
      throw new AppError(404, 'File not found');
    }

    // 2. Check permissions
    const hasAccess = await this.checkAccess(userId, fileId);
    if (!hasAccess) {
      throw new AppError(403, 'Access denied');
    }

    // 3. Check cache
    const cachedUrl = await redisService.get(`download:${fileId}:${userId}`);
    if (cachedUrl) {
      return res.json({
        status: 'success',
        data: { downloadUrl: cachedUrl }
      });
    }

    // 4. Generate signed URL
    const downloadUrl = this.generateSignedUrl(file.storageKey, 600); // 10 min

    // 5. Cache URL
    await redisService.set(
      `download:${fileId}:${userId}`,
      downloadUrl,
      600 // Same as URL expiration
    );

    // 6. Log download
    await AuditLog.create({
      userId,
      action: 'download',
      resourceId: fileId,
      details: { fileName: file.name },
    });

    res.json({
      status: 'success',
      data: {
        downloadUrl,
        fileName: file.name,
        size: file.size,
        expiresAt: new Date(Date.now() + 600000).toISOString(),
      }
    });
  }

  private generateSignedUrl(storageKey: string, ttl: number): string {
    // Generate JWT for file access
    const token = jwt.sign(
      { storageKey, exp: Math.floor(Date.now() / 1000) + ttl },
      config.jwt.secret
    );

    return `${config.apiUrl}/api/v1/files/serve/${token}`;
  }
}
```

### Range Request Support

For video streaming and resumable downloads:

```typescript
export class FileController {
  public async serveFile(req: Request, res: Response): Promise<void> {
    const { token } = req.params;

    // Verify token
    const { storageKey } = jwt.verify(token, config.jwt.secret);
    const filePath = path.join(STORAGE_PATH, storageKey);

    // Get file stats
    const stat = await fs.promises.stat(filePath);
    const fileSize = stat.size;

    // Handle range request
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'application/octet-stream',
      });

      const stream = fs.createReadStream(filePath, { start, end });
      stream.pipe(res);
    } else {
      // Full file download
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${path.basename(storageKey)}"`,
      });

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    }
  }
}
```

---

## File Metadata Operations

### List Files

```typescript
export class FileController {
  public async listFiles(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    const { folderId, page = 1, limit = 50, sort = 'createdAt', order = 'desc' } = req.query;

    const query = {
      userId,
      folderId: folderId || null,
      deletedAt: null,
    };

    const files = await File.find(query)
      .sort({ [sort]: order === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await File.countDocuments(query);

    res.json({
      status: 'success',
      data: {
        files: files.map(formatFileResponse),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        }
      }
    });
  }
}
```

### Update File Metadata

```typescript
export class FileController {
  public async updateFile(req: Request, res: Response): Promise<void> {
    const { fileId } = req.params;
    const { name } = req.body;
    const userId = req.userId;

    const file = await File.findOne({ _id: fileId, userId, deletedAt: null });
    if (!file) throw new AppError(404, 'File not found');

    // Check for duplicate name in same folder
    if (name) {
      const duplicate = await File.findOne({
        userId,
        folderId: file.folderId,
        name,
        _id: { $ne: fileId },
        deletedAt: null,
      });

      if (duplicate) {
        throw new AppError(409, 'File with this name already exists');
      }

      file.name = name;
    }

    await file.save();

    await AuditLog.create({
      userId,
      action: 'update',
      resourceId: fileId,
      details: { changes: { name } },
    });

    res.json({
      status: 'success',
      data: { file: formatFileResponse(file) }
    });
  }
}
```

### Delete File (Soft Delete)

```typescript
export class FileController {
  public async deleteFile(req: Request, res: Response): Promise<void> {
    const { fileId } = req.params;
    const userId = req.userId;

    const file = await File.findOne({ _id: fileId, userId, deletedAt: null });
    if (!file) throw new AppError(404, 'File not found');

    file.deletedAt = new Date();
    await file.save();

    await AuditLog.create({
      userId,
      action: 'delete',
      resourceId: fileId,
      details: { fileName: file.name },
    });

    res.json({
      status: 'success',
      message: 'File moved to trash'
    });
  }
}
```

### Move File

```typescript
export class FileController {
  public async moveFile(req: Request, res: Response): Promise<void> {
    const { fileId } = req.params;
    const { targetFolderId } = req.body;
    const userId = req.userId;

    const file = await File.findOne({ _id: fileId, userId, deletedAt: null });
    if (!file) throw new AppError(404, 'File not found');

    // Verify target folder exists and belongs to user
    if (targetFolderId) {
      const folder = await Folder.findOne({
        _id: targetFolderId,
        userId,
        deletedAt: null,
      });
      if (!folder) throw new AppError(404, 'Target folder not found');
    }

    // Check for name conflict
    const duplicate = await File.findOne({
      userId,
      folderId: targetFolderId || null,
      name: file.name,
      _id: { $ne: fileId },
      deletedAt: null,
    });

    if (duplicate) {
      throw new AppError(409, 'File with this name already exists in target folder');
    }

    file.folderId = targetFolderId || null;
    await file.save();

    res.json({
      status: 'success',
      data: { file: formatFileResponse(file) }
    });
  }
}
```

---

## Storage Management

### Storage Key Generation

```typescript
export const generateStorageKey = (userId: string, fileName: string): string => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(fileName);
  const baseName = path.basename(fileName, ext);
  const sanitized = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
  
  return `${userId}/${timestamp}_${random}_${sanitized}${ext}`;
};
```

### File Organization

```
/app/storage/
└── {userId}/
    ├── {timestamp}_{random}_{filename}.ext
    ├── {timestamp}_{random}_{filename}.ext
    └── thumbnails/
        ├── {fileId}_thumb.jpg
        └── {fileId}_preview.jpg
```

### Quota Management

```typescript
export class QuotaService {
  public async checkQuota(userId: string, requiredSize: number): Promise<boolean> {
    const user = await User.findById(userId);
    return (user.storageUsed + requiredSize) <= user.storageQuota;
  }

  public async updateUsage(userId: string, delta: number): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      $inc: { storageUsed: delta }
    });
  }

  public async recalculateUsage(userId: string): Promise<void> {
    const result = await File.aggregate([
      { $match: { userId, deletedAt: null } },
      { $group: { _id: null, total: { $sum: '$size' } } }
    ]);

    const totalSize = result[0]?.total || 0;
    await User.findByIdAndUpdate(userId, { storageUsed: totalSize });
  }
}
```

---

## File Preview

### Thumbnail Generation

```typescript
import sharp from 'sharp';

export class ThumbnailService {
  public async generateThumbnail(
    sourcePath: string,
    fileId: string
  ): Promise<void> {
    const thumbnailPath = path.join(
      STORAGE_PATH,
      'thumbnails',
      `${fileId}_thumb.jpg`
    );

    await sharp(sourcePath)
      .resize(200, 200, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    // Also generate larger preview
    const previewPath = path.join(
      STORAGE_PATH,
      'thumbnails',
      `${fileId}_preview.jpg`
    );

    await sharp(sourcePath)
      .resize(800, 600, { fit: 'inside' })
      .jpeg({ quality: 90 })
      .toFile(previewPath);
  }
}
```

### Metadata Extraction

```typescript
export class MetadataService {
  public async extractMetadata(
    filePath: string,
    mimeType: string
  ): Promise<Record<string, any>> {
    const metadata: Record<string, any> = {};

    if (mimeType.startsWith('image/')) {
      const image = sharp(filePath);
      const info = await image.metadata();
      
      metadata.width = info.width;
      metadata.height = info.height;
      metadata.format = info.format;
      metadata.colorSpace = info.space;
    }

    // Add more metadata extraction for other file types

    return metadata;
  }
}
```

---

## Security Considerations

### File Validation

```typescript
export class FileValidator {
  private allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain',
    // ... more types
  ];

  public validate(file: Express.Multer.File): void {
    // Check MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new AppError(400, 'File type not allowed');
    }

    // Check file signature (magic numbers)
    const signature = this.getFileSignature(file.buffer);
    if (!this.verifySignature(signature, file.mimetype)) {
      throw new AppError(400, 'File signature mismatch');
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      throw new AppError(400, 'File too large');
    }
  }

  private getFileSignature(buffer: Buffer): string {
    return buffer.slice(0, 4).toString('hex');
  }

  private verifySignature(signature: string, mimeType: string): boolean {
    const signatures: Record<string, string[]> = {
      'image/jpeg': ['ffd8ffe0', 'ffd8ffe1'],
      'image/png': ['89504e47'],
      'application/pdf': ['25504446'],
      // ... more signatures
    };

    const expected = signatures[mimeType];
    return expected?.includes(signature) || false;
  }
}
```

---

**Related Documentation**:
- [Phase 2 Planning](./planning.md)
- [Folder Management](./folder-management.md)
- [API Design](../architecture/api-design.md)

