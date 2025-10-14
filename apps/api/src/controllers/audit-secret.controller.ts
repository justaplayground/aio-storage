import { Request, Response } from "express";
import crypto from "crypto";
import { AuditSecret } from "@aio-storage/database";
import { AuditLog } from "@aio-storage/database";
import { AppError, IAuditSecretResponse } from "@aio-storage/shared";
import { logger } from "../utils/logger";

export class AuditSecretController {
  /**
   * Generate a new audit secret key in WPA/WPA2 PSK format (256-bit)
   */
  private generateWPAKey(): string {
    // Generate 32 random bytes (256 bits)
    const randomBytes = crypto.randomBytes(32);
    
    // Convert to hexadecimal string (64 characters)
    const hexString = randomBytes.toString('hex');
    
    // Format as WPA/WPA2 PSK (64 hex characters)
    return hexString.toUpperCase();
  }

  /**
   * GET /api/v1/audit-secrets
   * Get list of all audit secrets
   */
  public async getAuditSecrets(req: Request, res: Response): Promise<void> {
    try {
      const secrets = await AuditSecret.find({}).sort({ _id: -1 });

      const secretsResponse: IAuditSecretResponse[] = secrets.map((secret) => ({
        id: String(secret._id),
        secretKey: secret.secretKey,
        isUsed: secret.isUsed,
      }));

      logger.info(`Retrieved ${secrets.length} audit secrets`);

      res.status(200).json({
        status: "success",
        data: {
          secrets: secretsResponse,
          count: secrets.length,
        },
      });
    } catch (error) {
      logger.error("Error retrieving audit secrets:", error);
      throw new AppError(500, "Failed to retrieve audit secrets");
    }
  }

  /**
   * POST /api/v1/audit-secrets
   * Generate a new audit secret
   */
  public async generateAuditSecret(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      
      // Generate new WPA/WPA2 PSK format key
      const secretKey = this.generateWPAKey();

      // Create new audit secret
      const auditSecret = await AuditSecret.create({
        secretKey,
        isUsed: false,
      });

      // Log audit
      await AuditLog.create({
        userId: String(userId),
        action: "update",
        resourceId: String(auditSecret._id),
        details: {
          action: "generate_audit_secret",
          secretKeyLength: secretKey.length,
        },
      });

      const secretResponse: IAuditSecretResponse = {
        id: String(auditSecret._id),
        secretKey: auditSecret.secretKey,
        isUsed: auditSecret.isUsed,
      };

      logger.info(`Generated new audit secret: ${String(auditSecret._id)}`);

      res.status(201).json({
        status: "success",
        data: {
          secret: secretResponse,
        },
      });
    } catch (error) {
      logger.error("Error generating audit secret:", error);
      throw new AppError(500, "Failed to generate audit secret");
    }
  }
}

export const auditSecretController = new AuditSecretController();
