import mongoose, { Schema, Document } from 'mongoose';
import { IFile } from '@aio-storage/shared';

export interface IFileDocument extends Omit<IFile, '_id'>, Document {}

const FileSchema = new Schema<IFileDocument>(
  {
    userId: {
      type: String,
      required: true,
      ref: 'User',
    },
    folderId: {
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
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    mimeType: {
      type: String,
      required: true,
    },
    storageKey: {
      type: String,
      required: true,
      unique: true,
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'files',
  }
);

// Indexes
FileSchema.index({ userId: 1, folderId: 1 });
FileSchema.index({ userId: 1, name: 1 });
FileSchema.index({ storageKey: 1 });
FileSchema.index({ deletedAt: 1 });
FileSchema.index({ mimeType: 1 });

export const File = mongoose.model<IFileDocument>('File', FileSchema);

