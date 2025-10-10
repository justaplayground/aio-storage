import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.API_PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  // Feature flags
  features: {
    enableRabbitMQ: process.env.ENABLE_RABBITMQ !== "false", // defaults to true
  },

  mongodb: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017",
    dbName: process.env.MONGODB_DB_NAME || "aio_storage",
    user: process.env.MONGODB_USER || "admin",
    password: process.env.MONGODB_PASSWORD || "password123",
  },

  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL || "amqp://localhost:5672",
    user: process.env.RABBITMQ_USER || "admin",
    password: process.env.RABBITMQ_PASSWORD || "password123",
  },

  jwt: {
    secret: process.env.JWT_SECRET || "your-super-secret-jwt-key",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  storage: {
    path: process.env.STORAGE_PATH || "./storage",
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "104857600", 10), // 100MB default
  },

  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  },
};
