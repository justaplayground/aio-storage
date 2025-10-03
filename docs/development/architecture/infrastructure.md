# Infrastructure Documentation

## Overview

AIO Storage uses a containerized microservices architecture orchestrated with Docker Compose. All services run in isolated containers with defined networking and volumes.

## Docker Compose Stack

### Services Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Network: aio-network              │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ MongoDB  │  │  Redis   │  │ RabbitMQ │  │   API    │   │
│  │  :27017  │  │  :6379   │  │  :5672   │  │  :4000   │   │
│  └──────────┘  └──────────┘  └──────────┘  └────┬─────┘   │
│                                                   │          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┘          │
│  │   Web    │  │  Worker  │  │                              │
│  │  :3000   │  │          │  │                              │
│  └──────────┘  └──────────┘  │                              │
│                                                               │
└───────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────┐
  │         Docker Volumes                │
  │  - mongodb_data                       │
  │  - redis_data                         │
  │  - rabbitmq_data                      │
  │  - file_storage                       │
  └───────────────────────────────────────┘
```

## Service Details

### 1. MongoDB
**Image**: `mongo:8.0`  
**Container**: `aio-storage-mongodb`  
**Port**: `27017`

**Purpose**: Primary database for application data

**Environment Variables**:
```env
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=password123
MONGO_INITDB_DATABASE=aio_storage
```

**Volumes**:
- `mongodb_data:/data/db` - Database files
- `mongodb_config:/data/configdb` - Configuration

**Health Check**:
```bash
echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
```

**Resource Limits** (Production):
```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 4G
    reservations:
      cpus: '1'
      memory: 2G
```

**Access**:
```bash
# From host
mongosh mongodb://admin:password123@localhost:27017/aio_storage

# From container
docker-compose exec mongodb mongosh
```

---

### 2. Redis
**Image**: `redis:7-alpine`  
**Container**: `aio-storage-redis`  
**Port**: `6379`

**Purpose**: Caching and session management

**Volume**:
- `redis_data:/data` - Persistence

**Health Check**:
```bash
redis-cli ping
```

**Configuration**:
- Default persistence: RDB + AOF
- Max memory policy: allkeys-lru (production)
- Eviction when memory limit reached

**Resource Limits** (Production):
```yaml
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

**Access**:
```bash
# From host
redis-cli

# From container
docker-compose exec redis redis-cli
```

**Common Commands**:
```bash
# View all keys
KEYS *

# Get value
GET key_name

# Monitor real-time
MONITOR

# Stats
INFO stats
```

---

### 3. RabbitMQ
**Image**: `rabbitmq:3-management-alpine`  
**Container**: `aio-storage-rabbitmq`  
**Ports**: 
- `5672` - AMQP protocol
- `15672` - Management UI

**Purpose**: Message queue for asynchronous operations

**Environment Variables**:
```env
RABBITMQ_DEFAULT_USER=admin
RABBITMQ_DEFAULT_PASS=password123
```

**Volume**:
- `rabbitmq_data:/var/lib/rabbitmq` - Messages and state

**Health Check**:
```bash
rabbitmq-diagnostics -q ping
```

**Queues**:
- `file.upload` - File upload processing
- `file.download` - Download preparation
- `video.transcode` - Video transcoding

**Management UI**:
- URL: http://localhost:15672
- Username: `admin`
- Password: `password123`

**Features**:
- Durable queues (survive restarts)
- Persistent messages
- Acknowledgments for reliability
- Dead letter exchange for failed messages

**Resource Limits** (Production):
```yaml
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

---

### 4. API Server
**Build**: Multi-stage Dockerfile  
**Container**: `aio-storage-api`  
**Port**: `4000`

**Purpose**: REST API backend

**Environment Variables**:
```env
NODE_ENV=development
MONGODB_URI=mongodb://admin:password123@mongodb:27017/aio_storage?authSource=admin
REDIS_URL=redis://redis:6379
RABBITMQ_URL=amqp://admin:password123@rabbitmq:5672
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
API_PORT=4000
STORAGE_PATH=/app/storage
MAX_FILE_SIZE=104857600
```

**Volumes**:
- `file_storage:/app/storage` - File storage
- `./apps/api:/app/apps/api` - Development hot-reload
- `./packages:/app/packages` - Shared packages

**Dependencies**:
```yaml
depends_on:
  mongodb:
    condition: service_healthy
  redis:
    condition: service_healthy
  rabbitmq:
    condition: service_healthy
```

**Health Check**:
```bash
curl http://localhost:4000/api/v1/health
```

**Build Context**:
```dockerfile
# Development: Uses tsx watch for hot reload
# Production: Compiled TypeScript with optimizations
```

---

### 5. Web Application
**Build**: Next.js multi-stage Dockerfile  
**Container**: `aio-storage-web`  
**Port**: `3000`

**Purpose**: Frontend web application

**Environment Variables**:
```env
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:4000
```

**Volumes**:
- `./apps/web:/app/apps/web` - Development hot-reload
- `./packages:/app/packages` - Shared packages
- `/app/apps/web/.next` - Build artifacts

**Dependencies**:
```yaml
depends_on:
  - api
```

**Features**:
- Server-side rendering
- Automatic code splitting
- Hot module replacement (dev)
- Static asset optimization

---

### 6. Worker Service
**Build**: Multi-stage Dockerfile  
**Container**: `aio-storage-worker`  
**Port**: None (background service)

**Purpose**: Background job processing

**Environment Variables**:
```env
NODE_ENV=development
MONGODB_URI=mongodb://admin:password123@mongodb:27017/aio_storage?authSource=admin
REDIS_URL=redis://redis:6379
RABBITMQ_URL=amqp://admin:password123@rabbitmq:5672
STORAGE_PATH=/app/storage
```

**Volumes**:
- `file_storage:/app/storage` - File storage access
- `./apps/worker:/app/apps/worker` - Development hot-reload
- `./packages:/app/packages` - Shared packages

**Dependencies**:
```yaml
depends_on:
  mongodb:
    condition: service_healthy
  rabbitmq:
    condition: service_healthy
```

**Scaling**:
```bash
# Run multiple workers for high load
docker-compose up -d --scale worker=3
```

---

## Docker Volumes

### Persistent Volumes

#### mongodb_data
- **Purpose**: MongoDB database files
- **Size**: Grows with data (~100MB initial)
- **Backup**: Critical - backup regularly
- **Location**: Docker managed volume

#### mongodb_config
- **Purpose**: MongoDB configuration
- **Size**: Small (~1MB)
- **Backup**: Not critical
- **Location**: Docker managed volume

#### redis_data
- **Purpose**: Redis persistence (RDB/AOF)
- **Size**: Small (~10MB typical)
- **Backup**: Optional (cache data)
- **Location**: Docker managed volume

#### rabbitmq_data
- **Purpose**: RabbitMQ state and messages
- **Size**: Depends on queue depth
- **Backup**: Recommended for message persistence
- **Location**: Docker managed volume

#### file_storage
- **Purpose**: User uploaded files
- **Size**: Grows with uploads (largest volume)
- **Backup**: Critical - backup regularly
- **Location**: Docker managed volume

### Volume Management

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect aio-storage_file_storage

# Backup volume
docker run --rm -v aio-storage_file_storage:/data -v $(pwd):/backup \
  alpine tar czf /backup/files-backup.tar.gz /data

# Restore volume
docker run --rm -v aio-storage_file_storage:/data -v $(pwd):/backup \
  alpine tar xzf /backup/files-backup.tar.gz -C /

# Remove volume (WARNING: deletes data)
docker volume rm aio-storage_file_storage
```

## Networking

### Docker Network: aio-network
- **Type**: Bridge network
- **Driver**: bridge
- **Purpose**: Inter-container communication

**Network Features**:
- Service discovery by container name
- Isolated from host network
- DNS resolution between containers

**Communication Paths**:
```
web → api (HTTP)
api → mongodb (MongoDB protocol)
api → redis (Redis protocol)
api → rabbitmq (AMQP)
worker → mongodb (MongoDB protocol)
worker → rabbitmq (AMQP)
```

### Port Mapping

| Service | Internal Port | External Port | Protocol |
|---------|--------------|---------------|----------|
| MongoDB | 27017 | 27017 | TCP |
| Redis | 6379 | 6379 | TCP |
| RabbitMQ | 5672 | 5672 | AMQP |
| RabbitMQ Management | 15672 | 15672 | HTTP |
| API | 4000 | 4000 | HTTP |
| Web | 3000 | 3000 | HTTP |

## Build Strategy

### Multi-Stage Docker Builds

#### Stage 1: Dependencies
```dockerfile
FROM node:18-alpine AS deps
# Install dependencies only
```

#### Stage 2: Builder
```dockerfile
FROM base AS builder
# Build TypeScript, compile Next.js
```

#### Stage 3: Runner
```dockerfile
FROM base AS runner
# Run with minimal footprint
```

**Benefits**:
- Smaller image sizes
- Faster builds (layer caching)
- Security (no build tools in production)
- Reproducible builds

### Build Commands

```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build api

# Build with no cache
docker-compose build --no-cache

# Pull latest base images
docker-compose build --pull
```

## Development vs Production

### Development Configuration
```yaml
volumes:
  - ./apps/api:/app/apps/api  # Code mounting
command: npm run dev           # Hot reload
environment:
  - NODE_ENV=development
```

### Production Configuration
```yaml
# No volume mounts
command: npm start              # Production server
environment:
  - NODE_ENV=production
deploy:
  resources:
    limits: ...                 # Resource limits
```

## Monitoring & Logs

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api

# Last 100 lines
docker-compose logs --tail=100 api

# Since timestamp
docker-compose logs --since="2024-01-15T10:00:00"
```

### Container Stats
```bash
# Real-time stats
docker stats

# Specific container
docker stats aio-storage-api
```

### Health Checks
```bash
# Check all services
docker-compose ps

# Service health
docker inspect --format='{{.State.Health.Status}}' aio-storage-mongodb
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env
```

#### 2. Container Won't Start
```bash
# Check logs
docker-compose logs <service>

# Remove and recreate
docker-compose rm <service>
docker-compose up -d <service>
```

#### 3. Database Connection Failed
```bash
# Check MongoDB is running
docker-compose ps mongodb

# Check network connectivity
docker-compose exec api ping mongodb

# Verify credentials in .env
```

#### 4. Out of Disk Space
```bash
# Check Docker disk usage
docker system df

# Clean up
docker system prune -a

# Remove volumes (WARNING)
docker volume prune
```

#### 5. Permission Issues
```bash
# Fix file permissions
docker-compose exec api chown -R node:node /app/storage
```

## Security Considerations

### Production Hardening
1. **Change Default Passwords**: Update all credentials
2. **Use Secrets Management**: Docker secrets or external vault
3. **Network Isolation**: Limit exposed ports
4. **Resource Limits**: Prevent resource exhaustion
5. **Read-only Filesystems**: Where possible
6. **Run as Non-root**: All containers use non-root users
7. **Regular Updates**: Keep images updated
8. **Scan Images**: Use security scanners

### Environment Variables Security
```bash
# Use .env file (never commit)
# Use Docker secrets in production
# Rotate credentials regularly
# Use strong passwords
```

## Performance Tuning

### MongoDB
```yaml
command: mongod --wiredTigerCacheSizeGB 2
```

### Redis
```yaml
command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
```

### Application
```yaml
environment:
  - NODE_ENV=production
  - NODE_OPTIONS=--max-old-space-size=2048
```

## Backup Strategy

### Automated Backup Script
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)

# Backup MongoDB
docker-compose exec -T mongodb mongodump \
  --uri="mongodb://admin:password123@localhost:27017/aio_storage?authSource=admin" \
  --archive > backup/mongodb_${DATE}.archive

# Backup files
docker run --rm -v aio-storage_file_storage:/data -v $(pwd)/backup:/backup \
  alpine tar czf /backup/files_${DATE}.tar.gz /data

echo "Backup completed: ${DATE}"
```

---

**Related Documentation**:
- [Architecture Overview](./overview.md)
- [Deployment Guide](../../../DEPLOYMENT.md)
- [Phase 1 Summary](../phase-1/SUMMARY.md)

