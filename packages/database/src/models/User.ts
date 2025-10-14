import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from '@aio-storage/shared';

export interface IUserDocument extends Omit<IUser, '_id'>, Document {}

const UserSchema = new Schema<IUserDocument>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    storageUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    storageQuota: {
      type: Number,
      default: 53687091200, // 50 GiB in bytes
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    isSuperAdmin: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });

export const User = mongoose.model<IUserDocument>('User', UserSchema);

