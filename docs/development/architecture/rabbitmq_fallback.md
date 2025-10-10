# RabbitMQ Fallback Configuration

## Overview

The AIO Storage system now supports graceful degradation when RabbitMQ is unavailable. This allows you to run the application in development or testing environments without RabbitMQ, with jobs queued in-memory instead.

## Configuration

### Environment Variable

Add this to your `.env` file or set it as an environment variable:

```bash
# Enable or disable RabbitMQ
ENABLE_RABBITMQ=true   # Default: enabled
ENABLE_RABBITMQ=false  # Disabled: uses in-memory fallback
```

### Default Behavior

- **If not set**: RabbitMQ is **enabled** by default
- **If set to `false`**: RabbitMQ is **disabled** and in-memory queue is used
- **If connection fails**: Automatically falls back to in-memory queue with warnings

## How It Works

### API Server

When RabbitMQ is disabled or unavailable:

1. ✅ **API starts normally** - No errors or crashes
2. ⚠️ **Jobs queued in memory** - Published jobs are stored in-memory
3. 📝 **Warning logs** - Clear indicators that RabbitMQ is unavailable
4. 🔍 **Health endpoint reflects status** - `/api/v1/health` shows RabbitMQ as "disabled"

### Worker Service

When RabbitMQ is disabled or unavailable:

1. ✅ **Worker starts in idle mode** - No errors or crashes
2. ⚠️ **No job processing** - Jobs are not consumed
3. 📝 **Helpful logs** - Instructions on how to enable RabbitMQ
4. 🔄 **Database connection maintained** - Still useful for manual operations

## Usage Examples

### Development Without RabbitMQ

```bash
# Set environment variable
export ENABLE_RABBITMQ=false

# Start services
pnpm dev
```

Or in your `.env` file:
```bash
ENABLE_RABBITMQ=false
```

### Docker Compose Without RabbitMQ

Create a `docker-compose.override.yml`:

```yaml
services:
  api:
    environment:
      - ENABLE_RABBITMQ=false
  
  worker:
    environment:
      - ENABLE_RABBITMQ=false
```

Then start only required services:
```bash
docker-compose up mongodb redis api web
# Note: worker and rabbitmq are not started
```

### Production With RabbitMQ

```bash
# Ensure RabbitMQ is enabled (default)
ENABLE_RABBITMQ=true

# Or simply don't set the variable (defaults to true)
```

## Health Check Endpoint

The `/api/v1/health` endpoint now shows the status of all services:

### With RabbitMQ Enabled

```json
{
  "status": "success",
  "message": "API is running",
  "timestamp": "2025-10-10T11:53:00.000Z",
  "services": {
    "api": "running",
    "mongodb": "connected",
    "redis": "connected",
    "rabbitmq": "connected"
  }
}
```

### With RabbitMQ Disabled

```json
{
  "status": "success",
  "message": "API is running",
  "timestamp": "2025-10-10T11:53:00.000Z",
  "services": {
    "api": "running",
    "mongodb": "connected",
    "redis": "connected",
    "rabbitmq": "disabled"
  }
}
```

### With MongoDB or Redis Down

```json
{
  "status": "degraded",
  "message": "API is running with degraded services",
  "timestamp": "2025-10-10T11:53:00.000Z",
  "services": {
    "api": "running",
    "mongodb": "disconnected",
    "redis": "connected",
    "rabbitmq": "disabled"
  }
}
```

**Status Code**: 200 for healthy, 503 for degraded

## Logging

### API Server Logs

With RabbitMQ enabled:
```
✅ MongoDB connected successfully
✅ Redis connected
✅ RabbitMQ connected
🚀 API server running on port 4000
📝 Environment: development
🐰 RabbitMQ: enabled
```

With RabbitMQ disabled:
```
✅ MongoDB connected successfully
✅ Redis connected
⚠️  RabbitMQ is disabled. Using in-memory queue fallback.
⚠️  Server starting without RabbitMQ - background jobs will be queued in memory
🚀 API server running on port 4000
📝 Environment: development
🐰 RabbitMQ: disabled (fallback mode)
```

With RabbitMQ connection failure:
```
✅ MongoDB connected successfully
✅ Redis connected
⚠️  Failed to connect to RabbitMQ, using fallback mode: Error: connect ECONNREFUSED
⚠️  Server starting without RabbitMQ - background jobs will be queued in memory
🚀 API server running on port 4000
📝 Environment: development
🐰 RabbitMQ: disabled (fallback mode)
```

### Worker Logs

With RabbitMQ enabled:
```
✅ MongoDB connected successfully
✅ Worker queues initialized
🎯 Worker is listening for jobs...
```

With RabbitMQ disabled:
```
✅ MongoDB connected successfully
⚠️  RabbitMQ is disabled. Worker will not process jobs.
⚠️  Worker started in idle mode - no job processing available
💡 To enable job processing, set ENABLE_RABBITMQ=true and ensure RabbitMQ is running
```

## Trade-offs

### ✅ Benefits

1. **Development Flexibility** - Work without RabbitMQ for quick testing
2. **Simplified Setup** - One less service to run locally
3. **Graceful Degradation** - System continues to work with reduced functionality
4. **Clear Feedback** - Logs and health checks show exactly what's happening

### ⚠️ Limitations

1. **In-Memory Queue is Volatile** - Jobs are lost if API restarts
2. **No Job Processing** - Worker won't process jobs without RabbitMQ
3. **Not for Production** - Should only be used for development/testing
4. **Limited Debugging** - Can't inspect queues like with RabbitMQ management UI

## When to Use

### ✅ Good Use Cases

- **Local Development** - Quick iteration without full infrastructure
- **Unit Testing** - Test API endpoints without background processing
- **CI/CD Pipelines** - Simplified test environments
- **Demo/Prototype** - Show features without complex setup

### ❌ Not Recommended

- **Production** - Always use RabbitMQ in production
- **Integration Testing** - Should test with actual message queue
- **Load Testing** - Need real queue behavior
- **Multi-Worker Setup** - Requires actual message distribution

## Migration Guide

### From Full RabbitMQ to Fallback Mode

1. Set `ENABLE_RABBITMQ=false`
2. Restart API and Worker services
3. Verify logs show fallback mode
4. Check health endpoint confirms status

### From Fallback Mode to Full RabbitMQ

1. Ensure RabbitMQ is running
2. Set `ENABLE_RABBITMQ=true` (or remove the variable)
3. Restart API and Worker services
4. Verify logs show RabbitMQ connected
5. Check health endpoint confirms connection

## Troubleshooting

### API Won't Start

- **Check MongoDB and Redis** - These are required even without RabbitMQ
- **Check logs** - Look for connection errors
- **Verify configuration** - Ensure `.env` is properly loaded

### Jobs Not Processing

- **Check Worker Logs** - Verify RabbitMQ status
- **Check ENABLE_RABBITMQ** - Ensure it's set to `true`
- **Check RabbitMQ** - Verify service is running and accessible
- **Check Health Endpoint** - Verify RabbitMQ shows "connected"

### In-Memory Queue Full

The in-memory queue has no limits. If concerned about memory:

1. Enable RabbitMQ for proper job processing
2. Implement queue size limits (requires code changes)
3. Clear queue manually via API (if needed)

```typescript
// Example: Clear upload queue
queueService.clearInMemoryQueue('file.upload');
```

## API for In-Memory Queue

### Check Queue Contents

```typescript
import { queueService } from './services/queue';

// Get all jobs in upload queue
const jobs = queueService.getInMemoryQueue('file.upload');
console.log(`${jobs.length} jobs queued`);
```

### Clear Queue

```typescript
import { queueService } from './services/queue';

// Clear upload queue
queueService.clearInMemoryQueue('file.upload');
```

### Check Availability

```typescript
import { queueService } from './services/queue';

// Check if RabbitMQ is available
if (queueService.isAvailable()) {
  console.log('Using RabbitMQ');
} else {
  console.log('Using in-memory fallback');
}
```

## Future Enhancements

Potential improvements to the fallback system:

1. **Redis-Based Queue** - Use Redis instead of in-memory for persistence
2. **Queue Size Limits** - Prevent memory overflow
3. **Automatic Drain** - Process in-memory jobs when RabbitMQ reconnects
4. **Queue Metrics** - Track queue sizes and job counts
5. **Dead Letter Handling** - Manage failed jobs in fallback mode

---

**Last Updated**: October 10, 2025  
**Version**: 1.0.0  
**Status**: ✅ Implemented

