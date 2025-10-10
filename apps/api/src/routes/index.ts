import { Router } from 'express';
import authRoutes from './auth.routes';
import { queueService } from '../services/queue';
import { database } from '@aio-storage/database';
import { redisService } from '../services/redis';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  const services = {
    api: 'running',
    mongodb: database.isDbConnected() ? 'connected' : 'disconnected',
    redis: redisService.getClient().status === 'ready' ? 'connected' : 'disconnected',
    rabbitmq: queueService.isAvailable() ? 'connected' : 'disabled',
  };

  const allHealthy = services.mongodb === 'connected' && services.redis === 'connected';

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'success' : 'degraded',
    message: allHealthy ? 'API is running' : 'API is running with degraded services',
    timestamp: new Date().toISOString(),
    services,
  });
});

// Mount routes
router.use('/auth', authRoutes);

export default router;

