import mongoose, { Schema, Document } from "mongoose";
import { IAuditSecret } from "@aio-storage/shared";

export interface IAuditSecretDocument extends Omit<IAuditSecret, "_id">, Document {}

const AuditSecretSchema = new Schema<IAuditSecretDocument>(
  {
    secretKey: {
      type: String,
      required: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: false,
    collection: "audit_secrets",
  }
);

// Indexes
AuditSecretSchema.index({ secretKey: 1 });

export const AuditSecret = mongoose.model<IAuditSecretDocument>("AuditSecret", AuditSecretSchema);
