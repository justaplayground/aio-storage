import mongoose, { Schema, Document } from 'mongoose';
import { IShare } from '@aio-storage/shared';

export interface IShareDocument extends Omit<IShare, '_id'>, Document {}

const ShareSchema = new Schema<IShareDocument>(
  {
    resourceId: {
      type: String,
      required: true,
    },
    resourceType: {
      type: String,
      required: true,
      enum: ['file', 'folder'],
    },
    ownerId: {
      type: String,
      required: true,
      ref: 'User',
    },
    sharedWithId: {
      type: String,
      required: true,
      ref: 'User',
    },
    permission: {
      type: String,
      required: true,
      enum: ['read', 'write', 'owner'],
      default: 'read',
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'shares',
  }
);

// Indexes
ShareSchema.index({ resourceId: 1, resourceType: 1 });
ShareSchema.index({ ownerId: 1 });
ShareSchema.index({ sharedWithId: 1 });
ShareSchema.index({ expiresAt: 1 });

// Ensure unique share per resource and user
ShareSchema.index(
  { resourceId: 1, resourceType: 1, sharedWithId: 1 },
  { unique: true }
);

export const Share = mongoose.model<IShareDocument>('Share', ShareSchema);

