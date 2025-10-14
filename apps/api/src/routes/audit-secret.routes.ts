import { Router } from 'express';
import { auditSecretController } from '../controllers/audit-secret.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// GET /api/v1/audit-secrets - Get list of audit secrets
router.get('/', auditSecretController.getAuditSecrets.bind(auditSecretController));

// POST /api/v1/audit-secrets - Generate new audit secret
router.post('/', auditSecretController.generateAuditSecret.bind(auditSecretController));

export default router;
