# Deployment Guide

This guide covers deploying AIO Storage in various environments.

## Table of Contents
- [Quick Start with Docker](#quick-start-with-docker)
- [Development Setup](#development-setup)
- [Production Deployment](#production-deployment)
- [Environment Configuration](#environment-configuration)
- [Troubleshooting](#troubleshooting)

## Quick Start with Docker

The easiest way to get started is using the provided setup script:

```bash
# Make scripts executable (if not already)
chmod +x scripts/*.sh

# Run setup script
./scripts/setup.sh
```

This will:
1. Install all npm dependencies
2. Create `.env` file from `.env.example`
3. Build Docker images
4. Start all services
5. Display access URLs

### Manual Docker Setup

If you prefer manual setup:

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Build and start containers
npm run docker:build
npm run docker:up

# Check logs
npm run docker:logs
```

## Development Setup

For local development with hot-reload:

### Option 1: Automated Setup

```bash
./scripts/dev-setup.sh
```

This starts only infrastructure services (MongoDB, Redis, RabbitMQ) in Docker, allowing you to run apps locally.

### Option 2: Manual Development Setup

```bash
# Install dependencies
npm install

# Start infrastructure services only
docker-compose up -d mongodb redis rabbitmq

# Update .env for local development
# Change connection strings to use localhost instead of service names

# Start all apps in development mode
npm run dev
```

This will start:
- API Server on port 4000
- Web App on port 3000
- Worker process in background

## Production Deployment

### Prerequisites
- Docker and Docker Compose installed
- Domain name (optional, but recommended)
- SSL certificate (for HTTPS)
- Adequate server resources (2GB RAM minimum, 4GB recommended)

### Deployment Steps

1. **Clone repository on server**
   ```bash
   git clone <repository-url>
   cd aio-storage
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   nano .env  # Edit with production values
   ```

   **Important production changes:**
   - Change `JWT_SECRET` to a strong random string
   - Set `NODE_ENV=production`
   - Update MongoDB password
   - Update RabbitMQ credentials
   - Set appropriate storage quotas
   - Configure CORS origins

3. **Build production images**
   ```bash
   docker-compose build
   ```

4. **Start services**
   ```bash
   docker-compose up -d
   ```

5. **Verify deployment**
   ```bash
   # Check all services are running
   docker-compose ps

   # Check logs
   docker-compose logs -f

   # Test API health
   curl http://localhost:4000/api/v1/health
   ```

### Setting Up Reverse Proxy (Nginx)

For production, use Nginx as a reverse proxy:

```nginx
# /etc/nginx/sites-available/aio-storage

server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Web App
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeout for file uploads
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }

    # File upload size limit
    client_max_body_size 100M;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/aio-storage /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Environment Configuration

### Required Environment Variables

#### Database
```env
MONGODB_URI=mongodb://admin:PASSWORD@mongodb:27017/aio_storage?authSource=admin
MONGODB_DB_NAME=aio_storage
```

#### Cache & Queue
```env
REDIS_URL=redis://redis:6379
RABBITMQ_URL=amqp://admin:PASSWORD@rabbitmq:5672
```

#### Security
```env
JWT_SECRET=<generate-strong-random-string>
JWT_EXPIRES_IN=7d
```

#### Services
```env
API_PORT=4000
WEB_PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:4000
```

#### Storage
```env
STORAGE_PATH=/app/storage
MAX_FILE_SIZE=104857600  # 100MB in bytes
```

### Generating Secure JWT Secret

```bash
# Linux/Mac
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Docker Compose Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# View logs
docker-compose logs -f [service-name]

# Scale services
docker-compose up -d --scale worker=3

# Remove volumes (WARNING: deletes data)
docker-compose down -v
```

## Backup and Restore

### Backup MongoDB

```bash
# Create backup
docker-compose exec mongodb mongodump \
  --uri="mongodb://admin:password123@localhost:27017/aio_storage?authSource=admin" \
  --out=/backup

# Copy backup from container
docker cp aio-storage-mongodb:/backup ./mongodb-backup-$(date +%Y%m%d)
```

### Restore MongoDB

```bash
# Copy backup to container
docker cp ./mongodb-backup mongodb:/backup

# Restore
docker-compose exec mongodb mongorestore \
  --uri="mongodb://admin:password123@localhost:27017" \
  /backup
```

### Backup Files

```bash
# Backup uploaded files
docker run --rm \
  -v aio-storage_file_storage:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/files-backup-$(date +%Y%m%d).tar.gz /data
```

## Monitoring

### View Container Stats

```bash
docker stats
```

### Check Service Health

```bash
# API
curl http://localhost:4000/api/v1/health

# RabbitMQ Management UI
# http://localhost:15672

# Container logs
docker-compose logs --tail=100 -f [api|web|worker]
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs [service-name]

# Check if port is in use
sudo lsof -i :3000  # or 4000, etc.

# Remove and rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### MongoDB Connection Issues

```bash
# Enter MongoDB container
docker-compose exec mongodb mongosh

# Check connection from API container
docker-compose exec api ping mongodb
```

### File Permission Issues

```bash
# Fix storage directory permissions
docker-compose exec api chown -R node:node /app/storage
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean Docker system
docker system prune -a --volumes

# Remove old images
docker image prune -a
```

## Performance Tuning

### MongoDB
- Enable indexes (already configured in models)
- Adjust connection pool size in `packages/database/src/connection.ts`
- Monitor query performance

### Redis
- Adjust TTL values based on usage patterns
- Monitor memory usage
- Configure eviction policies

### Worker
- Scale worker instances for heavy workloads:
  ```bash
  docker-compose up -d --scale worker=3
  ```

### File Storage
- Use SSD for storage volume
- Implement CDN for file delivery (future enhancement)
- Consider object storage like S3 for production

## Security Checklist

- [ ] Change default passwords in .env
- [ ] Generate strong JWT secret
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure firewall rules
- [ ] Set up regular backups
- [ ] Monitor logs for suspicious activity
- [ ] Keep Docker images updated
- [ ] Restrict database access
- [ ] Enable rate limiting (already implemented in API)
- [ ] Regular security audits

## Scaling

### Horizontal Scaling

```bash
# Scale worker instances
docker-compose up -d --scale worker=5

# Use load balancer for multiple API instances
docker-compose up -d --scale api=3
```

### Vertical Scaling

Adjust resource limits in `docker-compose.yml`:

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## Updates and Maintenance

### Updating Application

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose build
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Database Migrations

Currently, MongoDB handles schema changes automatically. For major schema changes:

1. Backup database first
2. Update models in `packages/database/`
3. Rebuild and restart services
4. Verify data integrity

## Support

For issues or questions:
- Check [README.md](README.md) for general information
- Review [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines
- Open an issue on GitHub

---

**Deployed with 🚀**

