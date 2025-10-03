# Phase 2 Planning - Core Storage Features

## Overview

Phase 2 builds upon the foundation established in Phase 1 to implement the core storage functionality: file upload/download, folder management, sharing capabilities, and search features.

## Goals

### Primary Objectives
1. Implement file upload with progress tracking
2. Implement file download with signed URLs
3. Enable folder creation and navigation
4. Add file/folder sharing with permissions
5. Implement search functionality
6. Add user profile management

### Success Criteria
- Users can upload files up to 100MB
- Upload progress displays in real-time
- Files are organized in folders
- Users can share files with others
- Search returns relevant results
- Profile updates work correctly

## Feature Breakdown

### 1. File Upload

#### 1.1 Single File Upload
**Priority**: HIGH  
**Complexity**: Medium  
**Estimated Time**: 3-4 days

**Features**:
- Multipart form data handling
- File size validation (max 100MB)
- MIME type detection
- Storage quota checking
- Progress tracking via WebSocket or polling
- Chunk upload for large files (>10MB)
- Resume capability for interrupted uploads

**Technical Approach**:
```typescript
// API Endpoint
POST /api/v1/files/upload
Content-Type: multipart/form-data

// Request body
{
  file: Binary
  name: string
  folderId?: string
}

// Response
{
  fileId: string
  uploadUrl: string (if using signed URL approach)
  uploadId: string (for progress tracking)
}
```

**Implementation Steps**:
1. Add Multer middleware for file handling
2. Implement file validation
3. Generate unique storage key
4. Save file to Docker volume
5. Create database entry
6. Publish job to upload queue
7. Worker processes file (virus scan, thumbnail, etc.)
8. Update user storage quota
9. Notify client of completion

**UI Components**:
- File selection button
- Drag & drop zone
- Upload progress bar
- Upload queue list
- Error handling display

---

#### 1.2 Multiple File Upload
**Priority**: MEDIUM  
**Complexity**: Medium  
**Estimated Time**: 2 days

**Features**:
- Select multiple files at once
- Batch upload with individual progress
- Parallel uploads (max 3 concurrent)
- Overall progress indicator

---

### 2. File Download

#### 2.1 Direct Download
**Priority**: HIGH  
**Complexity**: Low  
**Estimated Time**: 2 days

**Features**:
- Generate signed URLs with expiration
- Permission checking
- Range request support (partial downloads)
- Download tracking in audit logs

**Technical Approach**:
```typescript
// API Endpoint
GET /api/v1/files/:fileId/download

// Response
{
  downloadUrl: string  // Signed URL
  expiresAt: string
  fileName: string
  size: number
}
```

**Implementation Steps**:
1. Verify file exists
2. Check user permissions
3. Generate signed URL (valid for 10 minutes)
4. Cache URL in Redis
5. Log download in audit logs
6. Return URL to client
7. Client initiates download from signed URL

---

#### 2.2 Batch Download
**Priority**: LOW  
**Complexity**: High  
**Estimated Time**: 3 days

**Features**:
- Download multiple files as ZIP
- Folder download
- Background ZIP generation
- Download link via email when ready

---

### 3. Folder Management

#### 3.1 Create Folder
**Priority**: HIGH  
**Complexity**: Low  
**Estimated Time**: 1 day

**Features**:
- Create folder at any level
- Nested folder support
- Duplicate name prevention
- Path computation

**Technical Approach**:
```typescript
// API Endpoint
POST /api/v1/folders

// Request
{
  name: string
  parentId?: string  // null for root level
}

// Response
{
  folder: IFolderResponse
}
```

---

#### 3.2 Navigate Folders
**Priority**: HIGH  
**Complexity**: Medium  
**Estimated Time**: 2 days

**Features**:
- Breadcrumb navigation
- Folder contents (files + subfolders)
- Sort and filter options
- Grid/list view toggle

**UI Components**:
- Breadcrumb component
- Folder grid/list item
- File grid/list item
- Sort dropdown
- View toggle

---

#### 3.3 Move Files/Folders
**Priority**: MEDIUM  
**Complexity**: Medium  
**Estimated Time**: 2 days

**Features**:
- Drag & drop to move
- Move dialog for selection
- Path update for nested items
- Conflict resolution

---

#### 3.4 Rename Files/Folders
**Priority**: MEDIUM  
**Complexity**: Low  
**Estimated Time**: 1 day

**Features**:
- Inline rename
- Duplicate name check
- Path update for nested items

---

#### 3.5 Delete with Trash
**Priority**: MEDIUM  
**Complexity**: Medium  
**Estimated Time**: 2 days

**Features**:
- Soft delete (mark deletedAt)
- Trash view
- Restore from trash
- Permanent delete after 30 days
- Auto-cleanup job

**Implementation**:
- Update deletedAt timestamp
- Exclude from normal queries
- Separate trash endpoint
- Scheduled job for cleanup

---

### 4. File Sharing

#### 4.1 Share Link Generation
**Priority**: HIGH  
**Complexity**: Medium  
**Estimated Time**: 3 days

**Features**:
- Generate unique share link
- Set permissions (read/write)
- Set expiration date
- Public links (no login required)
- Private links (login required)

**Technical Approach**:
```typescript
// API Endpoint
POST /api/v1/shares

// Request
{
  resourceId: string
  resourceType: 'file' | 'folder'
  sharedWithId: string  // or null for public
  permission: 'read' | 'write'
  expiresAt?: string
}

// Response
{
  shareId: string
  shareUrl: string
}
```

---

#### 4.2 Access Shared Resources
**Priority**: HIGH  
**Complexity**: Medium  
**Estimated Time**: 2 days

**Features**:
- Access via share link
- Permission enforcement
- Expiration checking
- Shared with me view

---

#### 4.3 Manage Shares
**Priority**: MEDIUM  
**Complexity**: Low  
**Estimated Time**: 1 day

**Features**:
- List all shares (sent/received)
- Revoke share access
- Update permissions
- Update expiration

---

### 5. Search Functionality

#### 5.1 Basic Search
**Priority**: MEDIUM  
**Complexity**: Medium  
**Estimated Time**: 2 days

**Features**:
- Search by file name
- Search by folder name
- Case-insensitive
- Fuzzy matching

**Technical Approach**:
```typescript
// API Endpoint
GET /api/v1/search?q=query&type=file,folder&limit=50

// Response
{
  files: IFileResponse[]
  folders: IFolderResponse[]
  total: number
}
```

**Implementation**:
- MongoDB text index on name fields
- Regex search for partial matches
- Pagination support
- Sort by relevance

---

#### 5.2 Advanced Search
**Priority**: LOW  
**Complexity**: High  
**Estimated Time**: 3 days

**Features**:
- Filter by file type
- Filter by date range
- Filter by size range
- Full-text content search (future)

---

### 6. User Profile Management

#### 6.1 Update Profile
**Priority**: MEDIUM  
**Complexity**: Low  
**Estimated Time**: 1 day

**Features**:
- Update username
- Update email (with verification)
- View storage usage details

**Technical Approach**:
```typescript
// API Endpoint
PATCH /api/v1/auth/profile

// Request
{
  username?: string
  email?: string
}
```

---

#### 6.2 Change Password
**Priority**: MEDIUM  
**Complexity**: Low  
**Estimated Time**: 1 day

**Features**:
- Require current password
- Validate new password
- Re-hash and update
- Invalidate existing tokens (future)

---

#### 6.3 Password Recovery
**Priority**: LOW  
**Complexity**: Medium  
**Estimated Time**: 2 days

**Features**:
- Request reset via email
- Generate reset token
- Email reset link
- Reset password with token
- Token expiration (1 hour)

---

## Technical Requirements

### Backend API

#### New Endpoints
```typescript
// Files
POST   /api/v1/files/upload
GET    /api/v1/files
GET    /api/v1/files/:id
GET    /api/v1/files/:id/download
PATCH  /api/v1/files/:id
DELETE /api/v1/files/:id
POST   /api/v1/files/:id/move

// Folders
POST   /api/v1/folders
GET    /api/v1/folders
GET    /api/v1/folders/:id
PATCH  /api/v1/folders/:id
DELETE /api/v1/folders/:id
POST   /api/v1/folders/:id/move

// Shares
POST   /api/v1/shares
GET    /api/v1/shares/sent
GET    /api/v1/shares/received
GET    /api/v1/shares/:id
PATCH  /api/v1/shares/:id
DELETE /api/v1/shares/:id

// Search
GET    /api/v1/search

// Trash
GET    /api/v1/trash
POST   /api/v1/trash/:id/restore
DELETE /api/v1/trash/:id

// Profile
PATCH  /api/v1/auth/profile
POST   /api/v1/auth/change-password
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
```

#### New Middleware
- File upload handler (Multer)
- Permission checker middleware
- Upload progress tracker
- File size validator

#### New Services
- File storage service
- Signed URL generator
- Permission service
- Search service

---

### Frontend UI

#### New Pages
- `/files` - Main file browser
- `/files/:folderId` - Folder view
- `/shared` - Shared with me
- `/trash` - Deleted files
- `/search` - Search results
- `/profile` - User profile

#### New Components
- File uploader (with drag & drop)
- Upload progress indicator
- File/folder grid item
- File/folder list item
- Breadcrumb navigation
- Context menu (right-click)
- Share modal
- Move/copy modal
- Rename modal
- File preview modal
- Search bar

---

### Worker Jobs

#### New Processors
- File upload processor
  - Virus scanning (ClamAV integration)
  - Metadata extraction
  - Thumbnail generation (images)
  - Update user storage quota

- File download processor
  - Prepare large file downloads
  - Generate ZIP for batch downloads

- Cleanup processor
  - Delete files older than 30 days in trash
  - Remove expired shares

---

## Development Phases

### Phase 2.1: Basic File Operations (Week 1-2)
**Focus**: Upload & Download
- ✅ Single file upload
- ✅ File download
- ✅ Storage quota enforcement
- ✅ Basic file list view

**Deliverables**:
- Working file upload
- Working file download
- File list display
- Storage usage tracking

---

### Phase 2.2: Folder Management (Week 3)
**Focus**: Folders & Navigation
- ✅ Create folders
- ✅ Navigate folders
- ✅ Breadcrumb navigation
- ✅ Move files/folders

**Deliverables**:
- Folder creation
- Folder navigation
- File organization
- Breadcrumb UI

---

### Phase 2.3: Sharing (Week 4)
**Focus**: Collaboration
- ✅ Share file/folder
- ✅ Permission management
- ✅ Shared with me view
- ✅ Access control

**Deliverables**:
- Share functionality
- Permission enforcement
- Share management UI

---

### Phase 2.4: Search & Profile (Week 5)
**Focus**: Usability
- ✅ Basic search
- ✅ Profile management
- ✅ Password change
- ✅ Trash & restore

**Deliverables**:
- Search functionality
- Profile updates
- Trash management

---

## Testing Strategy

### Unit Tests
- File validation logic
- Permission checking
- Path computation
- Search query building

### Integration Tests
- Upload endpoint
- Download endpoint
- Folder operations
- Share operations
- Search endpoint

### E2E Tests
- Complete upload flow
- Complete download flow
- Share and access flow
- Move and organize flow

### Performance Tests
- Upload speed
- Concurrent uploads
- Search performance
- Large folder listings

---

## Dependencies

### New NPM Packages
- `multer` - File upload handling
- `sharp` - Image processing/thumbnails
- `archiver` - ZIP generation
- `mime-types` - MIME type detection
- `@aws-sdk/s3` (future) - S3 integration

### External Services (Future)
- ClamAV for virus scanning
- FFmpeg for video processing
- Email service for notifications

---

## Risks & Mitigation

### Risk 1: Large File Uploads
**Impact**: High  
**Mitigation**: 
- Implement chunked uploads
- Add resume capability
- Set reasonable file size limits
- Use pre-signed URLs for direct upload

### Risk 2: Storage Exhaustion
**Impact**: High  
**Mitigation**:
- Enforce quota limits strictly
- Implement cleanup jobs
- Monitor disk usage
- Alert on low space

### Risk 3: Permission Bypass
**Impact**: Critical  
**Mitigation**:
- Thorough permission testing
- Middleware for all endpoints
- Database-level checks
- Security audit

### Risk 4: Performance Degradation
**Impact**: Medium  
**Mitigation**:
- Database indexing
- Query optimization
- Pagination everywhere
- Caching frequently accessed data

---

## Success Metrics

### Functionality
- [ ] Users can upload files successfully
- [ ] Upload progress displays accurately
- [ ] Files download correctly
- [ ] Folders organize files properly
- [ ] Sharing works as expected
- [ ] Search returns relevant results

### Performance
- [ ] Upload completes in reasonable time
- [ ] API response < 200ms for metadata
- [ ] Search returns results < 500ms
- [ ] Folder navigation < 100ms

### User Experience
- [ ] Intuitive UI
- [ ] Clear error messages
- [ ] Responsive design
- [ ] Smooth animations

---

## Next Steps

After Phase 2 completion:
1. User acceptance testing
2. Performance optimization
3. Security audit
4. Documentation update
5. Move to Phase 3 (Advanced Features)

---

**Related Documentation**:
- [Phase 1 Summary](../phase-1/SUMMARY.md)
- [File Management Design](./file-management.md)
- [Folder Management Design](./folder-management.md)
- [API Design](../architecture/api-design.md)

