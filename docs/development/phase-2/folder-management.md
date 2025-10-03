# Folder Management Design

## Overview

This document details the design and implementation of hierarchical folder structure, navigation, and management operations for the AIO Storage platform.

## Folder Structure

### Hierarchical Model

```
Root (null parentId)
├── Documents
│   ├── Work
│   │   ├── Projects
│   │   └── Reports
│   └── Personal
├── Photos
│   ├── 2024
│   │   ├── January
│   │   └── February
│   └── 2023
└── Videos
```

### Database Representation

Each folder stores:
- `parentId`: Reference to parent folder (null for root)
- `path`: Computed full path for quick lookups
- `name`: Folder name

Example documents:
```json
// Root folder
{
  "_id": "folder1",
  "userId": "user1",
  "parentId": null,
  "name": "Documents",
  "path": "/Documents"
}

// Nested folder
{
  "_id": "folder2",
  "userId": "user1",
  "parentId": "folder1",
  "name": "Work",
  "path": "/Documents/Work"
}
```

---

## Folder Operations

### 1. Create Folder

#### API Endpoint
```typescript
POST /api/v1/folders

Request:
{
  name: string          // Folder name
  parentId?: string     // Parent folder ID (null for root)
}

Response:
{
  status: "success",
  data: {
    folder: IFolderResponse
  }
}
```

#### Implementation

```typescript
export class FolderController {
  public async createFolder(req: Request, res: Response): Promise<void> {
    const { name, parentId } = req.body;
    const userId = req.userId;

    // 1. Validate folder name
    if (!name || name.trim().length === 0) {
      throw new AppError(400, 'Folder name cannot be empty');
    }

    // 2. Verify parent folder if specified
    let parentPath = '';
    if (parentId) {
      const parent = await Folder.findOne({
        _id: parentId,
        userId,
        deletedAt: null,
      });

      if (!parent) {
        throw new AppError(404, 'Parent folder not found');
      }

      parentPath = parent.path;
    }

    // 3. Check for duplicate name in same location
    const duplicate = await Folder.findOne({
      userId,
      parentId: parentId || null,
      name,
      deletedAt: null,
    });

    if (duplicate) {
      throw new AppError(409, 'Folder with this name already exists');
    }

    // 4. Compute path
    const path = parentPath ? `${parentPath}/${name}` : `/${name}`;

    // 5. Create folder
    const folder = await Folder.create({
      userId,
      parentId: parentId || null,
      name,
      path,
    });

    // 6. Log activity
    await AuditLog.create({
      userId,
      action: 'create',
      resourceId: folder._id.toString(),
      details: { folderName: name, path },
    });

    res.status(201).json({
      status: 'success',
      data: { folder: formatFolderResponse(folder) }
    });
  }
}
```

---

### 2. Get Folder Contents

#### API Endpoint
```typescript
GET /api/v1/folders/:folderId

Query Parameters:
- sort: 'name' | 'createdAt' | 'size'
- order: 'asc' | 'desc'
- page: number
- limit: number

Response:
{
  status: "success",
  data: {
    folder: IFolderResponse
    folders: IFolderResponse[]    // Subfolders
    files: IFileResponse[]         // Files in folder
    pagination: {...}
  }
}
```

#### Implementation

```typescript
export class FolderController {
  public async getFolderContents(req: Request, res: Response): Promise<void> {
    const { folderId } = req.params;
    const userId = req.userId;
    const { sort = 'name', order = 'asc', page = 1, limit = 50 } = req.query;

    // 1. Get folder
    const folder = await Folder.findOne({
      _id: folderId,
      userId,
      deletedAt: null,
    });

    if (!folder) {
      throw new AppError(404, 'Folder not found');
    }

    // 2. Get subfolders
    const subfolders = await Folder.find({
      userId,
      parentId: folderId,
      deletedAt: null,
    }).sort({ [sort]: order === 'desc' ? -1 : 1 });

    // 3. Get files
    const files = await File.find({
      userId,
      folderId,
      deletedAt: null,
    })
      .sort({ [sort]: order === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalFiles = await File.countDocuments({
      userId,
      folderId,
      deletedAt: null,
    });

    res.json({
      status: 'success',
      data: {
        folder: formatFolderResponse(folder),
        folders: subfolders.map(formatFolderResponse),
        files: files.map(formatFileResponse),
        pagination: {
          page,
          limit,
          total: totalFiles,
          pages: Math.ceil(totalFiles / limit),
        }
      }
    });
  }

  // Get root folder contents (folderId = null)
  public async getRootContents(req: Request, res: Response): Promise<void> {
    const userId = req.userId;

    const folders = await Folder.find({
      userId,
      parentId: null,
      deletedAt: null,
    });

    const files = await File.find({
      userId,
      folderId: null,
      deletedAt: null,
    });

    res.json({
      status: 'success',
      data: {
        folders: folders.map(formatFolderResponse),
        files: files.map(formatFileResponse),
      }
    });
  }
}
```

---

### 3. Update Folder (Rename)

#### API Endpoint
```typescript
PATCH /api/v1/folders/:folderId

Request:
{
  name: string  // New folder name
}

Response:
{
  status: "success",
  data: {
    folder: IFolderResponse
  }
}
```

#### Implementation

```typescript
export class FolderController {
  public async updateFolder(req: Request, res: Response): Promise<void> {
    const { folderId } = req.params;
    const { name } = req.body;
    const userId = req.userId;

    // 1. Get folder
    const folder = await Folder.findOne({
      _id: folderId,
      userId,
      deletedAt: null,
    });

    if (!folder) {
      throw new AppError(404, 'Folder not found');
    }

    // 2. Check for duplicate name in same location
    const duplicate = await Folder.findOne({
      userId,
      parentId: folder.parentId,
      name,
      _id: { $ne: folderId },
      deletedAt: null,
    });

    if (duplicate) {
      throw new AppError(409, 'Folder with this name already exists');
    }

    const oldPath = folder.path;
    const oldName = folder.name;

    // 3. Update folder
    folder.name = name;
    
    // 4. Recompute path
    if (folder.parentId) {
      const parent = await Folder.findById(folder.parentId);
      folder.path = `${parent.path}/${name}`;
    } else {
      folder.path = `/${name}`;
    }

    await folder.save();

    // 5. Update paths for all descendants
    await this.updateDescendantPaths(folderId, oldPath, folder.path);

    // 6. Log activity
    await AuditLog.create({
      userId,
      action: 'update',
      resourceId: folderId,
      details: { oldName, newName: name },
    });

    res.json({
      status: 'success',
      data: { folder: formatFolderResponse(folder) }
    });
  }

  private async updateDescendantPaths(
    folderId: string,
    oldPath: string,
    newPath: string
  ): Promise<void> {
    // Find all folders that start with the old path
    const descendants = await Folder.find({
      path: new RegExp(`^${oldPath}/`),
      deletedAt: null,
    });

    // Update each descendant's path
    for (const descendant of descendants) {
      descendant.path = descendant.path.replace(oldPath, newPath);
      await descendant.save();
    }
  }
}
```

---

### 4. Move Folder

#### API Endpoint
```typescript
POST /api/v1/folders/:folderId/move

Request:
{
  targetParentId: string | null  // New parent (null for root)
}

Response:
{
  status: "success",
  data: {
    folder: IFolderResponse
  }
}
```

#### Implementation

```typescript
export class FolderController {
  public async moveFolder(req: Request, res: Response): Promise<void> {
    const { folderId } = req.params;
    const { targetParentId } = req.body;
    const userId = req.userId;

    // 1. Get folder to move
    const folder = await Folder.findOne({
      _id: folderId,
      userId,
      deletedAt: null,
    });

    if (!folder) {
      throw new AppError(404, 'Folder not found');
    }

    // 2. Prevent moving folder into itself or its descendants
    if (targetParentId) {
      const targetParent = await Folder.findOne({
        _id: targetParentId,
        userId,
        deletedAt: null,
      });

      if (!targetParent) {
        throw new AppError(404, 'Target folder not found');
      }

      if (this.isDescendant(targetParent.path, folder.path)) {
        throw new AppError(400, 'Cannot move folder into itself or its descendants');
      }
    }

    // 3. Check for name conflict in target location
    const duplicate = await Folder.findOne({
      userId,
      parentId: targetParentId || null,
      name: folder.name,
      _id: { $ne: folderId },
      deletedAt: null,
    });

    if (duplicate) {
      throw new AppError(409, 'Folder with this name already exists in target location');
    }

    const oldPath = folder.path;

    // 4. Update folder
    folder.parentId = targetParentId || null;

    // 5. Recompute path
    if (targetParentId) {
      const parent = await Folder.findById(targetParentId);
      folder.path = `${parent.path}/${folder.name}`;
    } else {
      folder.path = `/${folder.name}`;
    }

    await folder.save();

    // 6. Update all descendants
    await this.updateDescendantPaths(folderId, oldPath, folder.path);

    res.json({
      status: 'success',
      data: { folder: formatFolderResponse(folder) }
    });
  }

  private isDescendant(targetPath: string, sourcePath: string): boolean {
    return targetPath.startsWith(sourcePath + '/') || targetPath === sourcePath;
  }
}
```

---

### 5. Delete Folder

#### API Endpoint
```typescript
DELETE /api/v1/folders/:folderId

Response:
{
  status: "success",
  message: "Folder and contents moved to trash"
}
```

#### Implementation

```typescript
export class FolderController {
  public async deleteFolder(req: Request, res: Response): Promise<void> {
    const { folderId } = req.params;
    const userId = req.userId;

    // 1. Get folder
    const folder = await Folder.findOne({
      _id: folderId,
      userId,
      deletedAt: null,
    });

    if (!folder) {
      throw new AppError(404, 'Folder not found');
    }

    const now = new Date();

    // 2. Soft delete folder
    folder.deletedAt = now;
    await folder.save();

    // 3. Soft delete all descendants (folders and files)
    await this.deleteDescendants(folder.path, userId, now);

    // 4. Log activity
    await AuditLog.create({
      userId,
      action: 'delete',
      resourceId: folderId,
      details: {
        folderName: folder.name,
        path: folder.path,
      },
    });

    res.json({
      status: 'success',
      message: 'Folder and contents moved to trash'
    });
  }

  private async deleteDescendants(
    folderPath: string,
    userId: string,
    deletedAt: Date
  ): Promise<void> {
    // Delete all subfolders
    await Folder.updateMany(
      {
        userId,
        path: new RegExp(`^${folderPath}/`),
        deletedAt: null,
      },
      { deletedAt }
    );

    // Delete all files in this folder and subfolders
    const folderIds = await Folder.find({
      userId,
      path: new RegExp(`^${folderPath}`),
    }).distinct('_id');

    await File.updateMany(
      {
        userId,
        folderId: { $in: folderIds },
        deletedAt: null,
      },
      { deletedAt }
    );
  }
}
```

---

## Breadcrumb Navigation

### Generate Breadcrumb Path

```typescript
export class FolderService {
  public async getBreadcrumbs(folderId: string): Promise<IBreadcrumb[]> {
    const breadcrumbs: IBreadcrumb[] = [
      { id: null, name: 'Home', path: '/' }
    ];

    if (!folderId) {
      return breadcrumbs;
    }

    const folder = await Folder.findById(folderId);
    if (!folder) {
      return breadcrumbs;
    }

    // Split path and build breadcrumb trail
    const parts = folder.path.split('/').filter(p => p);
    let currentPath = '';

    for (const part of parts) {
      currentPath += `/${part}`;
      
      const folderAtPath = await Folder.findOne({
        userId: folder.userId,
        path: currentPath,
      });

      if (folderAtPath) {
        breadcrumbs.push({
          id: folderAtPath._id.toString(),
          name: folderAtPath.name,
          path: currentPath,
        });
      }
    }

    return breadcrumbs;
  }
}
```

### Frontend Component

```typescript
// components/Breadcrumb.tsx
export function Breadcrumb({ folderId }: { folderId: string | null }) {
  const [breadcrumbs, setBreadcrumbs] = useState<IBreadcrumb[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchBreadcrumbs = async () => {
      const response = await apiClient.getFolderBreadcrumbs(folderId);
      setBreadcrumbs(response.data.breadcrumbs);
    };

    fetchBreadcrumbs();
  }, [folderId]);

  return (
    <nav className="flex items-center space-x-2 text-sm">
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.id || 'root'} className="flex items-center">
          {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
          <button
            onClick={() => router.push(`/files${crumb.id ? `/${crumb.id}` : ''}`)}
            className="hover:underline"
          >
            {crumb.name}
          </button>
        </div>
      ))}
    </nav>
  );
}
```

---

## Folder Tree View

### Get Full Tree

```typescript
export class FolderService {
  public async getFolderTree(userId: string): Promise<IFolderTree[]> {
    // Get all folders for user
    const folders = await Folder.find({
      userId,
      deletedAt: null,
    }).sort({ path: 1 });

    // Build tree structure
    return this.buildTree(folders, null);
  }

  private buildTree(
    folders: IFolderDocument[],
    parentId: string | null
  ): IFolderTree[] {
    const tree: IFolderTree[] = [];

    const children = folders.filter(f => 
      (f.parentId === null && parentId === null) ||
      (f.parentId && f.parentId.toString() === parentId)
    );

    for (const folder of children) {
      tree.push({
        id: folder._id.toString(),
        name: folder.name,
        path: folder.path,
        children: this.buildTree(folders, folder._id.toString()),
      });
    }

    return tree;
  }
}
```

### Frontend Tree Component

```typescript
// components/FolderTree.tsx
interface FolderTreeProps {
  tree: IFolderTree[];
  onSelect: (folderId: string | null) => void;
}

export function FolderTree({ tree, onSelect }: FolderTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (folderId: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpanded(newExpanded);
  };

  const renderTree = (nodes: IFolderTree[], level = 0) => {
    return nodes.map(node => (
      <div key={node.id} style={{ marginLeft: level * 20 }}>
        <div className="flex items-center py-1 hover:bg-gray-100 cursor-pointer">
          {node.children.length > 0 && (
            <button onClick={() => toggleExpand(node.id)}>
              {expanded.has(node.id) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
          <Folder className="h-4 w-4 mx-2" />
          <span onClick={() => onSelect(node.id)}>{node.name}</span>
        </div>
        {expanded.has(node.id) && renderTree(node.children, level + 1)}
      </div>
    ));
  };

  return (
    <div className="folder-tree">
      <div className="flex items-center py-1 hover:bg-gray-100 cursor-pointer">
        <Home className="h-4 w-4 mx-2" />
        <span onClick={() => onSelect(null)}>Home</span>
      </div>
      {renderTree(tree)}
    </div>
  );
}
```

---

## Trash and Recovery

### Get Trash Contents

```typescript
export class FolderController {
  public async getTrash(req: Request, res: Response): Promise<void> {
    const userId = req.userId;

    const folders = await Folder.find({
      userId,
      deletedAt: { $ne: null },
    }).sort({ deletedAt: -1 });

    const files = await File.find({
      userId,
      deletedAt: { $ne: null },
    }).sort({ deletedAt: -1 });

    res.json({
      status: 'success',
      data: {
        folders: folders.map(formatFolderResponse),
        files: files.map(formatFileResponse),
      }
    });
  }
}
```

### Restore Folder

```typescript
export class FolderController {
  public async restoreFolder(req: Request, res: Response): Promise<void> {
    const { folderId } = req.params;
    const userId = req.userId;

    // 1. Get deleted folder
    const folder = await Folder.findOne({
      _id: folderId,
      userId,
      deletedAt: { $ne: null },
    });

    if (!folder) {
      throw new AppError(404, 'Folder not found in trash');
    }

    // 2. Check if parent still exists (not deleted)
    if (folder.parentId) {
      const parent = await Folder.findOne({
        _id: folder.parentId,
        deletedAt: null,
      });

      if (!parent) {
        // Parent was deleted, move to root
        folder.parentId = null;
        folder.path = `/${folder.name}`;
      }
    }

    // 3. Check for name conflict
    const duplicate = await Folder.findOne({
      userId,
      parentId: folder.parentId,
      name: folder.name,
      _id: { $ne: folderId },
      deletedAt: null,
    });

    if (duplicate) {
      // Append (restored) to name
      folder.name = `${folder.name} (restored)`;
      folder.path = folder.parentId
        ? await this.getParentPath(folder.parentId) + `/${folder.name}`
        : `/${folder.name}`;
    }

    // 4. Restore folder
    folder.deletedAt = null;
    await folder.save();

    // 5. Restore all descendants
    await this.restoreDescendants(folder.path, userId);

    res.json({
      status: 'success',
      data: { folder: formatFolderResponse(folder) }
    });
  }

  private async restoreDescendants(
    folderPath: string,
    userId: string
  ): Promise<void> {
    // Restore subfolders
    await Folder.updateMany(
      {
        userId,
        path: new RegExp(`^${folderPath}/`),
      },
      { deletedAt: null }
    );

    // Restore files
    const folderIds = await Folder.find({
      userId,
      path: new RegExp(`^${folderPath}`),
      deletedAt: null,
    }).distinct('_id');

    await File.updateMany(
      {
        userId,
        folderId: { $in: folderIds },
      },
      { deletedAt: null }
    );
  }
}
```

---

## Performance Optimization

### Indexing Strategy

```typescript
// Folder indexes
FolderSchema.index({ userId: 1, parentId: 1 });
FolderSchema.index({ userId: 1, path: 1 });
FolderSchema.index({ deletedAt: 1 });
FolderSchema.index(
  { userId: 1, parentId: 1, name: 1, deletedAt: 1 },
  { unique: true }
);
```

### Caching Folder Structure

```typescript
export class FolderService {
  public async getFolderWithCache(folderId: string): Promise<IFolder> {
    // Check cache
    const cached = await redisService.get(`folder:${folderId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get from database
    const folder = await Folder.findById(folderId);
    if (!folder) {
      throw new AppError(404, 'Folder not found');
    }

    // Cache for 5 minutes
    await redisService.set(
      `folder:${folderId}`,
      JSON.stringify(folder),
      300
    );

    return folder;
  }
}
```

---

**Related Documentation**:
- [Phase 2 Planning](./planning.md)
- [File Management](./file-management.md)
- [Database Schema](../architecture/database.md)

