import { z } from 'zod';

// Auth Validation Schemas
export const registerSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// File Validation Schemas
export const uploadFileSchema = z.object({
  name: z.string().min(1).max(255),
  folderId: z.string().optional(),
  size: z.number().positive(),
  mimeType: z.string(),
});

export const createFolderSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().optional(),
});

export const shareResourceSchema = z.object({
  resourceId: z.string(),
  resourceType: z.enum(['file', 'folder']),
  sharedWithId: z.string(),
  permission: z.enum(['read', 'write', 'owner']),
  expiresAt: z.string().datetime().optional(),
});

// Export types from schemas
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UploadFileInput = z.infer<typeof uploadFileSchema>;
export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type ShareResourceInput = z.infer<typeof shareResourceSchema>;

