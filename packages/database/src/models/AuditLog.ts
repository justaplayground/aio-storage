import mongoose, { Schema, Document } from 'mongoose';
import { IAuditLog } from '@aio-storage/shared';

export interface IAuditLogDocument extends Omit<IAuditLog, '_id'>, Document {}

const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    userId: {
      type: String,
      required: true,
      ref: 'User',
    },
    action: {
      type: String,
      required: true,
      enum: ['upload', 'download', 'delete', 'share', 'login', 'register', 'update'],
    },
    resourceId: {
      type: String,
      default: null,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    collection: 'audit_logs',
  }
);

// Indexes
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ resourceId: 1 });

export const AuditLog = mongoose.model<IAuditLogDocument>('AuditLog', AuditLogSchema);

