import amqp, { Channel, Connection } from 'amqplib';
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

let connection: Connection;
let channel: Channel;

const setupQueues = async (): Promise<void> => {
  try {
    connection = await amqp.connect(config.rabbitmq.url);
    channel = await connection.createChannel();

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
  } catch (error) {
    logger.error('❌ Failed to setup queues:', error);
    throw error;
  }
};

const startWorker = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    await database.connect(config.mongodb.uri);

    // Setup RabbitMQ queues
    await setupQueues();

    // Graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      try {
        await channel?.close();
        await connection?.close();
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

