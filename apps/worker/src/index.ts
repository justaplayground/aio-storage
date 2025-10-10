import * as amqplib from 'amqplib';
import { database } from '@aio-storage/database';
import { config } from './config';
import { logger } from './utils/logger';
import { uploadProcessor } from './processors/upload.processor';
import { downloadProcessor } from './processors/download.processor';

// Queue names
const QUEUES = {
  UPLOAD: 'file.upload',
  DOWNLOAD: 'file.download',
  TRANSCODE: 'video.transcode',
};

interface QueueSetupResult {
  success: boolean;
  connection?: amqplib.ChannelModel;
  channel?: amqplib.Channel;
}

const setupQueues = async (): Promise<QueueSetupResult> => {
  // Check if RabbitMQ is enabled
  if (!config.features.enableRabbitMQ) {
    logger.warn('⚠️  RabbitMQ is disabled. Worker will not process jobs.');
    return { success: false };
  }

  try {
    const connection = await amqplib.connect(config.rabbitmq.url);
    const channel = await connection.createChannel();

    // Assert queues
    await channel.assertQueue(QUEUES.UPLOAD, { durable: true });
    await channel.assertQueue(QUEUES.DOWNLOAD, { durable: true });
    await channel.assertQueue(QUEUES.TRANSCODE, { durable: true });

    // Set prefetch to process one message at a time
    channel.prefetch(1);

    logger.info('✅ Worker queues initialized');

    // Consume upload queue
    channel.consume(
      QUEUES.UPLOAD,
      async (msg) => {
        if (msg) {
          try {
            const job = JSON.parse(msg.content.toString());
            await uploadProcessor.process(job);
            channel.ack(msg);
          } catch (error) {
            logger.error('Error processing upload job:', error);
            channel.nack(msg, false, false); // Send to dead letter queue
          }
        }
      },
      { noAck: false }
    );

    // Consume download queue
    channel.consume(
      QUEUES.DOWNLOAD,
      async (msg) => {
        if (msg) {
          try {
            const job = JSON.parse(msg.content.toString());
            await downloadProcessor.process(job);
            channel.ack(msg);
          } catch (error) {
            logger.error('Error processing download job:', error);
            channel.nack(msg, false, false);
          }
        }
      },
      { noAck: false }
    );

    logger.info('🎯 Worker is listening for jobs...');
    return { success: true, connection, channel };
  } catch (error) {
    logger.warn('⚠️  Failed to connect to RabbitMQ, worker will idle:', error);
    return { success: false };
  }
};

const startWorker = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    await database.connect(config.mongodb.uri);

    // Setup RabbitMQ queues (optional with fallback)
    const { success, connection, channel } = await setupQueues();
    
    if (!success) {
      logger.warn('⚠️  Worker started in idle mode - no job processing available');
      logger.info('💡 To enable job processing, set ENABLE_RABBITMQ=true and ensure RabbitMQ is running');
    }

    // Graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      try {
        if (channel) {
          await channel.close();
        }
        if (connection) {
          await connection.close();
        }
        await database.disconnect();
        logger.info('✅ Worker shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('❌ Failed to start worker:', error);
    process.exit(1);
  }
};

startWorker();
