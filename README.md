# AIO Storage - Cloud Storage Platform

A scalable, fault-tolerant cloud storage platform built with Next.js, Express.js, MongoDB, and Docker. Supports asynchronous file upload, download, and streaming operations.

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14 with Shadcn/UI and Tailwind CSS
- **Backend API**: Express.js with TypeScript
- **Database**: MongoDB (self-hosted in Docker)
- **Cache**: Redis
- **Message Queue**: RabbitMQ
- **Worker**: Background job processor
- **Orchestration**: Docker Compose with Turborepo monorepo

### Monorepo Structure
```
aio-storage/
├── apps/
│   ├── api/          # Express.js REST API
│   ├── web/          # Next.js frontend
│   └── worker/       # Background job processor
├── packages/
│   ├── shared/       # Shared types and utilities
│   └── database/     # MongoDB models and connection
├── docs/            # Documentation
├── docker-compose.yml
└── turbo.json
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- Docker and Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd aio-storage
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration (optional for development)
   ```

4. **Start with Docker Compose**
   ```bash
   npm run docker:build
   npm run docker:up
   ```

5. **Access the applications**
   - **Web Dashboard**: http://localhost:3000
   - **API Server**: http://localhost:4000
   - **RabbitMQ Management**: http://localhost:15672 (admin/password123)
   - **MongoDB**: localhost:27017

### Development (without Docker)

1. **Start MongoDB, Redis, and RabbitMQ**
   ```bash
   # Using Docker for infrastructure only
   docker-compose up -d mongodb redis rabbitmq
   ```

2. **Start development servers**
   ```bash
   npm run dev
   ```

   This will start:
   - API: http://localhost:4000
   - Web: http://localhost:3000
   - Worker: Background process

## 📋 Available Scripts

### Root Commands
```bash
npm run dev              # Start all apps in development mode
npm run build            # Build all apps
npm run lint             # Lint all apps
npm run clean            # Clean build artifacts

npm run docker:up        # Start Docker containers
npm run docker:down      # Stop Docker containers
npm run docker:build     # Build Docker images
npm run docker:logs      # View container logs
```

### Individual App Commands
```bash
# API
cd apps/api
npm run dev              # Development with hot reload
npm run build            # Build for production
npm run start            # Start production server

# Web
cd apps/web
npm run dev              # Development with hot reload
npm run build            # Build for production
npm run start            # Start production server

# Worker
cd apps/worker
npm run dev              # Development with hot reload
npm run build            # Build for production
npm run start            # Start production server
```

## 🔐 Authentication

The system uses JWT-based authentication:

1. **Register**: POST `/api/v1/auth/register`
   ```json
   {
     "username": "johndoe",
     "email": "john@example.com",
     "password": "securepassword"
   }
   ```

2. **Login**: POST `/api/v1/auth/login`
   ```json
   {
     "email": "john@example.com",
     "password": "securepassword"
   }
   ```

3. **Get Profile**: GET `/api/v1/auth/me`
   - Requires `Authorization: Bearer <token>` header

## 📊 Database Schema

### Users Collection
- `_id`: ObjectId
- `username`: String (unique)
- `email`: String (unique)
- `passwordHash`: String
- `storageUsed`: Number (bytes)
- `storageQuota`: Number (bytes, default 10GB)
- `createdAt`, `updatedAt`: Timestamps

### Files Collection
- `_id`: ObjectId
- `userId`: String (ref: Users)
- `folderId`: String (ref: Folders, nullable)
- `name`: String
- `size`: Number
- `mimeType`: String
- `storageKey`: String (unique)
- `version`: Number
- `deletedAt`: Date (soft delete)
- `createdAt`, `updatedAt`: Timestamps

### Folders Collection
- `_id`: ObjectId
- `userId`: String (ref: Users)
- `parentId`: String (ref: Folders, nullable)
- `name`: String
- `path`: String
- `deletedAt`: Date (soft delete)
- `createdAt`, `updatedAt`: Timestamps

### Shares Collection
- `_id`: ObjectId
- `resourceId`: String
- `resourceType`: Enum ('file', 'folder')
- `ownerId`: String (ref: Users)
- `sharedWithId`: String (ref: Users)
- `permission`: Enum ('read', 'write', 'owner')
- `expiresAt`: Date (nullable)
- `createdAt`: Timestamp

### Audit Logs Collection
- `_id`: ObjectId
- `userId`: String (ref: Users)
- `action`: Enum ('upload', 'download', 'delete', 'share', 'login', 'register', 'update')
- `resourceId`: String (nullable)
- `details`: Object
- `timestamp`: Date

## 🔧 Configuration

### Environment Variables

All environment variables are defined in `.env.example`. Key configurations:

#### Database
- `MONGODB_URI`: MongoDB connection string
- `MONGODB_DB_NAME`: Database name

#### Services
- `REDIS_URL`: Redis connection string
- `RABBITMQ_URL`: RabbitMQ connection string

#### Security
- `JWT_SECRET`: Secret key for JWT signing (change in production!)
- `JWT_EXPIRES_IN`: Token expiration time (default: 7d)

#### API
- `API_PORT`: API server port (default: 4000)
- `NEXT_PUBLIC_API_URL`: API URL for frontend

#### Storage
- `STORAGE_PATH`: Path for file storage
- `MAX_FILE_SIZE`: Maximum file size in bytes

## 🐳 Docker Deployment

### Production Deployment

1. **Update environment variables** in `.env` for production

2. **Build and start containers**
   ```bash
   docker-compose build
   docker-compose up -d
   ```

3. **Check container status**
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

4. **Stop containers**
   ```bash
   docker-compose down
   ```

### Docker Volumes

The following volumes are created:
- `mongodb_data`: MongoDB data persistence
- `redis_data`: Redis data persistence
- `rabbitmq_data`: RabbitMQ data persistence
- `file_storage`: User uploaded files

## 🧪 Testing

API health check:
```bash
curl http://localhost:4000/api/v1/health
```

Expected response:
```json
{
  "status": "success",
  "message": "API is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🛣️ Roadmap

### Phase 1 (MVP - Current) ✅
- [x] User authentication (register/login)
- [x] Basic infrastructure setup
- [x] Docker containerization
- [x] Database models and connections
- [x] Background worker setup

### Phase 2 (Core Features)
- [ ] File upload with progress tracking
- [ ] File download with resumable support
- [ ] Folder creation and navigation
- [ ] File/folder sharing with permissions
- [ ] Search functionality
- [ ] User profile management

### Phase 3 (Advanced Features)
- [ ] Video streaming with HLS/DASH
- [ ] File versioning
- [ ] Collaborative editing
- [ ] Advanced audit logging
- [ ] Storage quota management
- [ ] Thumbnail generation

## 🐛 Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
docker-compose ps mongodb

# View MongoDB logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb
```

### RabbitMQ Connection Issues
```bash
# Access RabbitMQ management UI
# http://localhost:15672 (admin/password123)

# Check worker logs
docker-compose logs worker
```

### Port Already in Use
```bash
# Find process using port 3000, 4000, etc.
lsof -i :3000

# Kill the process
kill -9 <PID>
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user (authenticated)

### File Endpoints (Coming Soon)
- `POST /api/v1/files/upload` - Upload file
- `GET /api/v1/files/:id` - Get file details
- `GET /api/v1/files/:id/download` - Download file
- `DELETE /api/v1/files/:id` - Delete file

### Folder Endpoints (Coming Soon)
- `POST /api/v1/folders` - Create folder
- `GET /api/v1/folders/:id` - Get folder contents
- `DELETE /api/v1/folders/:id` - Delete folder

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Next.js for the frontend framework
- Express.js for the API framework
- MongoDB for the database
- RabbitMQ for message queueing
- Docker for containerization
- Shadcn/UI for beautiful UI components

---

**Built with ❤️ for secure and scalable cloud storage**

