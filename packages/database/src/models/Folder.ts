import mongoose, { Schema, Document } from 'mongoose';
import { IFolder } from '@aio-storage/shared';

export interface IFolderDocument extends Omit<IFolder, '_id'>, Document {}

const FolderSchema = new Schema<IFolderDocument>(
  {
    userId: {
      type: String,
      required: true,
      ref: 'User',
    },
    parentId: {
      type: String,
      default: null,
      ref: 'Folder',
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    path: {
      type: String,
      required: true,
      trim: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'folders',
  }
);

// Indexes
FolderSchema.index({ userId: 1, parentId: 1 });
FolderSchema.index({ userId: 1, path: 1 });
FolderSchema.index({ deletedAt: 1 });

// Ensure unique folder names within the same parent
FolderSchema.index(
  { userId: 1, parentId: 1, name: 1, deletedAt: 1 },
  { unique: true }
);

export const Folder = mongoose.model<IFolderDocument>('Folder', FolderSchema);

