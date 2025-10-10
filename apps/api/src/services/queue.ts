import * as amqplib from 'amqplib';
import { config } from '../config';
import { logger } from '../utils/logger';

class QueueService {
  private static instance: QueueService;
  private connection: amqplib.ChannelModel | null = null;
  private channel: amqplib.Channel | null = null;
  private isEnabled: boolean = false;
  private inMemoryQueue: Map<string, any[]> = new Map();

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
    // Check if RabbitMQ is enabled
    if (!config.features.enableRabbitMQ) {
      logger.warn('⚠️  RabbitMQ is disabled. Using in-memory queue fallback.');
      this.isEnabled = false;
      return;
    }

    try {
      this.connection = await amqplib.connect(config.rabbitmq.url);
      this.channel = await this.connection.createChannel();

      // Assert queues
      await this.channel.assertQueue(this.QUEUES.UPLOAD, { durable: true });
      await this.channel.assertQueue(this.QUEUES.DOWNLOAD, { durable: true });
      await this.channel.assertQueue(this.QUEUES.TRANSCODE, { durable: true });

      this.isEnabled = true;
      logger.info('✅ RabbitMQ connected');

      this.connection.on('error', (error) => {
        logger.error('❌ RabbitMQ connection error:', error);
        this.isEnabled = false;
      });

      this.connection.on('close', () => {
        logger.warn('⚠️  RabbitMQ connection closed');
        this.isEnabled = false;
      });
    } catch (error) {
      logger.warn('⚠️  Failed to connect to RabbitMQ, using fallback mode:', error);
      this.isEnabled = false;
      // Don't throw - allow the app to continue
    }
  }

  public async publishToQueue(queue: string, data: any): Promise<void> {
    if (this.isEnabled && this.channel) {
      // Use RabbitMQ
      const message = JSON.stringify(data);
      this.channel.sendToQueue(queue, Buffer.from(message), {
        persistent: true,
      });
      logger.debug(`📤 Message published to RabbitMQ queue: ${queue}`);
    } else {
      // Fallback: Store in memory (or could log/skip)
      if (!this.inMemoryQueue.has(queue)) {
        this.inMemoryQueue.set(queue, []);
      }
      this.inMemoryQueue.get(queue)!.push(data);
      logger.debug(`📤 Message stored in memory queue: ${queue} (RabbitMQ unavailable)`);
      logger.warn(`⚠️  Message queued in memory and will not be processed until worker is available`);
    }
  }

  public async close(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
      this.isEnabled = false;
      logger.info('✅ RabbitMQ connection closed');
    } catch (error) {
      logger.error('❌ Error closing RabbitMQ connection:', error);
    }
  }

  public getChannel(): amqplib.Channel | null {
    return this.channel;
  }

  public isAvailable(): boolean {
    return this.isEnabled;
  }

  // For debugging: get in-memory queue contents
  public getInMemoryQueue(queue: string): any[] {
    return this.inMemoryQueue.get(queue) || [];
  }

  // Optional: Clear in-memory queue
  public clearInMemoryQueue(queue: string): void {
    this.inMemoryQueue.delete(queue);
  }
}

export const queueService = QueueService.getInstance();

