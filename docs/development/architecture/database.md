# Database Schema & Design

## Database Technology

**MongoDB 8.0** - Document-oriented NoSQL database

### Why MongoDB?
- ✅ Flexible schema for evolving requirements
- ✅ JSON-like documents match API responses
- ✅ Excellent for hierarchical data (folders)
- ✅ Built-in indexing for performance
- ✅ Horizontal scalability with sharding
- ✅ Strong community and ecosystem
- ✅ Native support for arrays and nested documents

### MongoDB 8.0 Features
- ✅ Enhanced query performance and optimization
- ✅ Improved compound index efficiency
- ✅ Better aggregation pipeline performance
- ✅ Enhanced security features
- ✅ Optimized storage engine
- ✅ Better handling of large datasets

## Database Structure

```
aio_storage (database)
├── users
├── files
├── folders
├── shares
└── audit_logs
```

## Collections

### 1. Users Collection

**Purpose**: Store user accounts, authentication info, and storage quotas

**Schema**:
```typescript
{
  _id: ObjectId,              // Auto-generated unique ID
  username: String,            // Unique username (3-50 chars)
  email: String,               // Unique email address
  passwordHash: String,        // Bcrypt hashed password
  storageUsed: Number,         // Bytes used (default: 0)
  storageQuota: Number,        // Bytes allowed (default: 10GB)
  createdAt: Date,            // Account creation timestamp
  updatedAt: Date             // Last update timestamp
}
```

**Indexes**:
```javascript
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ username: 1 }, { unique: true })
```

**Example Document**:
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "username": "johndoe",
  "email": "john@example.com",
  "passwordHash": "$2a$12$abcdefghijklmnopqrstuvwxyz",
  "storageUsed": 1048576,
  "storageQuota": 10737418240,
  "createdAt": ISODate("2024-01-01T00:00:00Z"),
  "updatedAt": ISODate("2024-01-15T10:30:00Z")
}
```

**Business Rules**:
- Email must be unique and valid format
- Username must be unique, 3-50 characters, alphanumeric
- Password must be minimum 8 characters (hashed before storage)
- Storage quota default: 10GB (10737418240 bytes)
- Storage used updated on file operations

---

### 2. Files Collection

**Purpose**: Store file metadata and relationships

**Schema**:
```typescript
{
  _id: ObjectId,              // Auto-generated unique ID
  userId: String,              // Owner's user ID (ref: users._id)
  folderId: String | null,     // Parent folder ID (ref: folders._id)
  name: String,                // File name (max 255 chars)
  size: Number,                // File size in bytes
  mimeType: String,            // MIME type (e.g., 'image/jpeg')
  storageKey: String,          // Unique storage path/key
  version: Number,             // File version (default: 1)
  deletedAt: Date | null,      // Soft delete timestamp
  createdAt: Date,            // Upload timestamp
  updatedAt: Date             // Last modification timestamp
}
```

**Indexes**:
```javascript
db.files.createIndex({ userId: 1, folderId: 1 })
db.files.createIndex({ userId: 1, name: 1 })
db.files.createIndex({ storageKey: 1 }, { unique: true })
db.files.createIndex({ deletedAt: 1 })
db.files.createIndex({ mimeType: 1 })
db.files.createIndex({ createdAt: -1 })
```

**Example Document**:
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439012"),
  "userId": "507f1f77bcf86cd799439011",
  "folderId": "507f1f77bcf86cd799439013",
  "name": "vacation-photo.jpg",
  "size": 2048576,
  "mimeType": "image/jpeg",
  "storageKey": "507f1f77bcf86cd799439011/1640000000_vacation-photo.jpg",
  "version": 1,
  "deletedAt": null,
  "createdAt": ISODate("2024-01-10T14:30:00Z"),
  "updatedAt": ISODate("2024-01-10T14:30:00Z")
}
```

**Business Rules**:
- File name cannot be empty
- Size must be positive
- Storage key must be unique
- Deleted files have deletedAt timestamp (soft delete)
- Version increments on file updates
- folderId null means root level

---

### 3. Folders Collection

**Purpose**: Store folder structure and hierarchy

**Schema**:
```typescript
{
  _id: ObjectId,              // Auto-generated unique ID
  userId: String,              // Owner's user ID (ref: users._id)
  parentId: String | null,     // Parent folder ID (ref: folders._id)
  name: String,                // Folder name (max 255 chars)
  path: String,                // Full path for quick lookups
  deletedAt: Date | null,      // Soft delete timestamp
  createdAt: Date,            // Creation timestamp
  updatedAt: Date             // Last modification timestamp
}
```

**Indexes**:
```javascript
db.folders.createIndex({ userId: 1, parentId: 1 })
db.folders.createIndex({ userId: 1, path: 1 })
db.folders.createIndex({ deletedAt: 1 })
db.folders.createIndex({ userId: 1, parentId: 1, name: 1, deletedAt: 1 }, { unique: true })
```

**Example Document**:
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439013"),
  "userId": "507f1f77bcf86cd799439011",
  "parentId": null,
  "name": "Photos",
  "path": "/Photos",
  "deletedAt": null,
  "createdAt": ISODate("2024-01-05T10:00:00Z"),
  "updatedAt": ISODate("2024-01-05T10:00:00Z")
}
```

**Nested Folder Example**:
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439014"),
  "userId": "507f1f77bcf86cd799439011",
  "parentId": "507f1f77bcf86cd799439013",
  "name": "2024",
  "path": "/Photos/2024",
  "deletedAt": null,
  "createdAt": ISODate("2024-01-10T11:00:00Z"),
  "updatedAt": ISODate("2024-01-10T11:00:00Z")
}
```

**Business Rules**:
- Folder name cannot be empty
- parentId null means root level
- Path computed from parent hierarchy
- No duplicate names in same parent folder
- Deleted folders have deletedAt timestamp
- Deleting folder cascades to children (soft delete)

---

### 4. Shares Collection

**Purpose**: Manage file/folder sharing and permissions

**Schema**:
```typescript
{
  _id: ObjectId,              // Auto-generated unique ID
  resourceId: String,          // File or folder ID
  resourceType: String,        // 'file' or 'folder'
  ownerId: String,             // Resource owner (ref: users._id)
  sharedWithId: String,        // User being shared with (ref: users._id)
  permission: String,          // 'read', 'write', or 'owner'
  expiresAt: Date | null,      // Share expiration (null = never)
  createdAt: Date             // Share creation timestamp
}
```

**Indexes**:
```javascript
db.shares.createIndex({ resourceId: 1, resourceType: 1 })
db.shares.createIndex({ ownerId: 1 })
db.shares.createIndex({ sharedWithId: 1 })
db.shares.createIndex({ expiresAt: 1 })
db.shares.createIndex({ resourceId: 1, resourceType: 1, sharedWithId: 1 }, { unique: true })
```

**Example Document**:
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439015"),
  "resourceId": "507f1f77bcf86cd799439012",
  "resourceType": "file",
  "ownerId": "507f1f77bcf86cd799439011",
  "sharedWithId": "507f1f77bcf86cd799439020",
  "permission": "read",
  "expiresAt": ISODate("2024-12-31T23:59:59Z"),
  "createdAt": ISODate("2024-01-15T16:00:00Z")
}
```

**Permission Levels**:
- `read`: Can view and download
- `write`: Can view, download, edit, and delete
- `owner`: Full control (same as owner)

**Business Rules**:
- One user can have only one share per resource
- Expired shares (expiresAt < now) are invalid
- Owner always has implicit 'owner' permission
- Sharing a folder includes all its contents

---

### 5. Audit Logs Collection

**Purpose**: Track user actions for security and compliance

**Schema**:
```typescript
{
  _id: ObjectId,              // Auto-generated unique ID
  userId: String,              // User who performed action (ref: users._id)
  action: String,              // Action type enum
  resourceId: String | null,   // Related resource ID
  details: Object,             // Additional context (JSON)
  timestamp: Date             // When action occurred
}
```

**Action Types**:
- `register`: User registration
- `login`: User login
- `upload`: File upload
- `download`: File download
- `delete`: File/folder deletion
- `share`: Resource shared
- `update`: Resource updated

**Indexes**:
```javascript
db.audit_logs.createIndex({ userId: 1, timestamp: -1 })
db.audit_logs.createIndex({ action: 1, timestamp: -1 })
db.audit_logs.createIndex({ resourceId: 1 })
db.audit_logs.createIndex({ timestamp: -1 })
```

**Example Documents**:
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439016"),
  "userId": "507f1f77bcf86cd799439011",
  "action": "login",
  "resourceId": null,
  "details": {
    "email": "john@example.com",
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  },
  "timestamp": ISODate("2024-01-15T10:00:00Z")
}
```

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439017"),
  "userId": "507f1f77bcf86cd799439011",
  "action": "upload",
  "resourceId": "507f1f77bcf86cd799439012",
  "details": {
    "fileName": "vacation-photo.jpg",
    "size": 2048576,
    "mimeType": "image/jpeg"
  },
  "timestamp": ISODate("2024-01-15T14:30:00Z")
}
```

**Business Rules**:
- Logs are immutable (no updates/deletes)
- Retention policy: Keep for 90 days (configurable)
- Details object flexible for different action types
- Timestamp automatically set to current time

---

## Relationships

### Entity Relationship Diagram

```
┌─────────────┐
│    Users    │
└──────┬──────┘
       │ 1
       │
       ├──────────────────────────────────┐
       │                                   │
       │ *                                 │ *
┌──────▼──────┐  *          *      ┌──────▼──────┐
│   Folders   ├───────────────────>│    Files    │
└──────┬──────┘  (folderId)        └──────┬──────┘
       │                                   │
       │ * (self-ref)                      │
       │ (parentId)                        │
       │                                   │
       └─────┐                    ┌────────┘
             │                    │
             │                    │
       ┌─────▼────────────────────▼─────┐
       │          Shares                │
       │  (resourceId + resourceType)   │
       └────────────────────────────────┘
                     │
                     │ *
              ┌──────▼──────┐
              │ Audit Logs  │
              └─────────────┘
```

### Relationship Types

1. **User → Files** (1:N)
   - One user owns many files
   - User deletion should handle file cleanup

2. **User → Folders** (1:N)
   - One user owns many folders
   - User deletion should handle folder cleanup

3. **Folder → Files** (1:N)
   - One folder contains many files
   - Folder deletion cascades to files

4. **Folder → Folders** (1:N, Self-referential)
   - Folders can contain subfolders
   - Creates hierarchical structure
   - Root folders have null parentId

5. **Resources → Shares** (1:N)
   - One file/folder can be shared with multiple users
   - Shares reference either files or folders

6. **User → Audit Logs** (1:N)
   - One user generates many logs
   - Logs track all user actions

## Query Patterns

### Common Queries

#### 1. Get User's Files in Folder
```javascript
db.files.find({
  userId: "507f1f77bcf86cd799439011",
  folderId: "507f1f77bcf86cd799439013",
  deletedAt: null
}).sort({ createdAt: -1 })
```

#### 2. Get Folder Contents (Files + Subfolders)
```javascript
// Get subfolders
db.folders.find({
  userId: "507f1f77bcf86cd799439011",
  parentId: "507f1f77bcf86cd799439013",
  deletedAt: null
})

// Get files in folder
db.files.find({
  userId: "507f1f77bcf86cd799439011",
  folderId: "507f1f77bcf86cd799439013",
  deletedAt: null
})
```

#### 3. Check User's Storage Usage
```javascript
db.users.findOne(
  { _id: ObjectId("507f1f77bcf86cd799439011") },
  { storageUsed: 1, storageQuota: 1 }
)
```

#### 4. Get User's Shared Files
```javascript
db.shares.aggregate([
  { $match: { sharedWithId: "507f1f77bcf86cd799439011" } },
  { $lookup: {
      from: "files",
      localField: "resourceId",
      foreignField: "_id",
      as: "file"
  }},
  { $unwind: "$file" }
])
```

#### 5. Search Files by Name
```javascript
db.files.find({
  userId: "507f1f77bcf86cd799439011",
  name: { $regex: "vacation", $options: "i" },
  deletedAt: null
})
```

#### 6. Get Recently Deleted Files (Trash)
```javascript
db.files.find({
  userId: "507f1f77bcf86cd799439011",
  deletedAt: { $ne: null }
}).sort({ deletedAt: -1 })
```

## Data Integrity

### Constraints

1. **Unique Constraints**:
   - `users.email` - One email per account
   - `users.username` - One username per account
   - `files.storageKey` - One storage key per file
   - `folders.(userId, parentId, name)` - No duplicate folder names in same location
   - `shares.(resourceId, resourceType, sharedWithId)` - One share per user per resource

2. **Required Fields**:
   - All `_id` fields (auto-generated)
   - All `userId` references
   - File name, size, mimeType, storageKey
   - Folder name, path
   - Share resource IDs and types

3. **Referential Integrity**:
   - Handled at application level (not database constraint)
   - Orphaned records cleaned up by scheduled jobs

### Validation Rules

Implemented in Mongoose schemas:

```typescript
// Example: File size validation
size: {
  type: Number,
  required: true,
  min: [0, 'File size cannot be negative']
}

// Example: Enum validation
permission: {
  type: String,
  required: true,
  enum: ['read', 'write', 'owner'],
  default: 'read'
}
```

## Performance Optimization

### Indexing Strategy

1. **Single Field Indexes**:
   - Primary lookups (userId, email, storageKey)
   - Sorting fields (createdAt, updatedAt)
   - Filter fields (deletedAt, mimeType)

2. **Compound Indexes**:
   - Common query combinations
   - Example: `{ userId: 1, folderId: 1 }` for folder contents

3. **Unique Indexes**:
   - Enforce uniqueness at database level
   - Prevent duplicate emails, usernames, etc.

### Index Maintenance

```javascript
// Analyze index usage
db.files.aggregate([{ $indexStats: {} }])

// Check query performance
db.files.find({ userId: "..." }).explain("executionStats")

// Remove unused indexes
db.collection.dropIndex("indexName")
```

## Backup & Recovery

### Backup Strategy
```bash
# Full database backup
mongodump --uri="mongodb://admin:password@localhost:27017/aio_storage?authSource=admin" --out=/backup

# Collection-specific backup
mongodump --db=aio_storage --collection=users --out=/backup

# Restore
mongorestore --uri="mongodb://admin:password@localhost:27017" /backup
```

### Point-in-Time Recovery
- Enable replica sets
- Configure oplog
- Use MongoDB Atlas for automatic backups (production)

## Migration Strategy

### Schema Changes
1. MongoDB is schema-less, but Mongoose enforces schema
2. Add new fields with defaults
3. Deprecated fields marked as optional
4. Run migration scripts for major changes
5. Version control schema changes

### Example Migration Script
```typescript
// Add new field to existing documents
await User.updateMany(
  { newField: { $exists: false } },
  { $set: { newField: defaultValue } }
);
```

## Monitoring

### Key Metrics
- Collection sizes
- Index usage statistics
- Query performance
- Connection pool usage
- Replica lag (if applicable)

### Monitoring Queries
```javascript
// Database statistics
db.stats()

// Collection statistics
db.files.stats()

// Current operations
db.currentOp()

// Slow queries
db.system.profile.find().limit(10).sort({ ts: -1 })
```

---

**Related Documentation**:
- [Architecture Overview](./overview.md)
- [API Design](./api-design.md)
- [Phase 1 Implementation](../phase-1/implementation.md)

