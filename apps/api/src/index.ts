import { createApp } from './app';
import { config } from './config';
import { database } from '@aio-storage/database';
import { redisService } from './services/redis';
import { queueService } from './services/queue';
import { logger } from './utils/logger';

const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB (required)
    await database.connect(config.mongodb.uri);

    // Connect to Redis (required)
    redisService.getClient();

    // Connect to RabbitMQ (optional with fallback)
    await queueService.connect();
    if (!queueService.isAvailable()) {
      logger.warn('⚠️  Server starting without RabbitMQ - background jobs will be queued in memory');
    }

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`🚀 API server running on port ${config.port}`);
      logger.info(`📝 Environment: ${config.nodeEnv}`);
      logger.info(`🐰 RabbitMQ: ${queueService.isAvailable() ? 'enabled' : 'disabled (fallback mode)'}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await database.disconnect();
          if (queueService.isAvailable()) {
            await queueService.close();
          }
          logger.info('✅ Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

