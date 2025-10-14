// User Types
export interface IUser {
  _id: string;
  username: string;
  email: string;
  passwordHash: string;
  storageUsed: number;
  storageQuota: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  isSuperAdmin: boolean;
}

export interface IUserResponse {
  id: string;
  username: string;
  email: string;
  storageUsed: number;
  storageQuota: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  isSuperAdmin: boolean;
}

// Folder Types
export interface IFolder {
  _id: string;
  userId: string;
  parentId: string | null;
  name: string;
  path: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface IFolderResponse {
  id: string;
  userId: string;
  parentId: string | null;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
}

// File Types
export interface IFile {
  _id: string;
  userId: string;
  folderId: string | null;
  name: string;
  size: number;
  mimeType: string;
  storageKey: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface IFileResponse {
  id: string;
  userId: string;
  folderId: string | null;
  name: string;
  size: number;
  mimeType: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// Share Types
export type SharePermission = 'read' | 'write' | 'owner';
export type ResourceType = 'file' | 'folder';

export interface IShare {
  _id: string;
  resourceId: string;
  resourceType: ResourceType;
  ownerId: string;
  sharedWithId: string;
  permission: SharePermission;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface IShareResponse {
  id: string;
  resourceId: string;
  resourceType: ResourceType;
  ownerId: string;
  sharedWithId: string;
  permission: SharePermission;
  expiresAt: string | null;
  createdAt: string;
}

// Audit Log Types
export type AuditAction = 'upload' | 'download' | 'delete' | 'share' | 'login' | 'register' | 'update';

export interface IAuditLog {
  _id: string;
  userId: string;
  action: AuditAction;
  resourceId: string | null;
  details: Record<string, any>;
  timestamp: Date;
}

// Audit Secret Types
export interface IAuditSecret {
  _id: string;
  secretKey: string;
  isUsed: boolean;
}

export interface IAuditSecretResponse {
  id: string;
  secretKey: string;
  isUsed: boolean;
}

// Job Types
export interface IUploadJob {
  fileId: string;
  userId: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
}

export interface IDownloadJob {
  fileId: string;
  userId: string;
  fileName: string;
}

export interface ITranscodeJob {
  fileId: string;
  userId: string;
  inputPath: string;
  outputFormat: 'hls' | 'dash';
}

