import amqp, { Channel, Connection } from 'amqplib';
import { config } from '../config';
import { logger } from '../utils/logger';

class QueueService {
  private static instance: QueueService;
  private connection: Connection | null = null;
  private channel: Channel | null = null;

  // Queue names
  public readonly QUEUES = {
    UPLOAD: 'file.upload',
    DOWNLOAD: 'file.download',
    TRANSCODE: 'video.transcode',
  };

  private constructor() {}

  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  public async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(config.rabbitmq.url);
      this.channel = await this.connection.createChannel();

      // Assert queues
      await this.channel.assertQueue(this.QUEUES.UPLOAD, { durable: true });
      await this.channel.assertQueue(this.QUEUES.DOWNLOAD, { durable: true });
      await this.channel.assertQueue(this.QUEUES.TRANSCODE, { durable: true });

      logger.info('✅ RabbitMQ connected');

      this.connection.on('error', (error) => {
        logger.error('❌ RabbitMQ connection error:', error);
      });

      this.connection.on('close', () => {
        logger.warn('⚠️  RabbitMQ connection closed');
      });
    } catch (error) {
      logger.error('❌ Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  public async publishToQueue(queue: string, data: any): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    const message = JSON.stringify(data);
    this.channel.sendToQueue(queue, Buffer.from(message), {
      persistent: true,
    });

    logger.debug(`📤 Message published to queue: ${queue}`);
  }

  public async close(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
      logger.info('✅ RabbitMQ connection closed');
    } catch (error) {
      logger.error('❌ Error closing RabbitMQ connection:', error);
    }
  }

  public getChannel(): Channel | null {
    return this.channel;
  }
}

export const queueService = QueueService.getInstance();

