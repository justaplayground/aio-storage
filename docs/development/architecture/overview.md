# Architecture Overview

## System Architecture

AIO Storage is built as a modern, scalable cloud storage platform using a microservices architecture pattern with containerized deployment.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Next.js Web Application                  │   │
│  │  - React Components (Shadcn/UI)                      │   │
│  │  - State Management (Zustand)                        │   │
│  │  - API Client (Axios)                                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/REST API
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Express.js API Server                    │   │
│  │  - REST Endpoints                                     │   │
│  │  - JWT Authentication                                 │   │
│  │  - Request Validation (Zod)                          │   │
│  │  - Error Handling                                     │   │
│  │  - Rate Limiting                                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
          │                    │                    │
          │                    │                    │
          ▼                    ▼                    ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   Data Layer     │  │   Cache Layer    │  │   Queue Layer    │
│                  │  │                  │  │                  │
│   MongoDB        │  │   Redis          │  │   RabbitMQ       │
│   - Users        │  │   - Sessions     │  │   - Upload       │
│   - Files        │  │   - Progress     │  │   - Download     │
│   - Folders      │  │   - Cache        │  │   - Transcode    │
│   - Shares       │  │                  │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
                                                      │
                                                      │
                                                      ▼
                                           ┌──────────────────┐
                                           │  Worker Layer    │
                                           │                  │
                                           │  Background Jobs │
                                           │  - Processing    │
                                           │  - Validation    │
                                           │  - Notifications │
                                           └──────────────────┘
                                                      │
                                                      ▼
                                           ┌──────────────────┐
                                           │  Storage Layer   │
                                           │                  │
                                           │  Docker Volume   │
                                           │  - File Storage  │
                                           └──────────────────┘
```

## Component Architecture

### 1. Frontend (Web App)
**Technology**: Next.js 14 with App Router

**Responsibilities**:
- User interface rendering
- Client-side routing
- State management
- API communication
- Form validation
- File upload/download UI

**Key Features**:
- Server-side rendering for SEO
- Static generation where applicable
- Optimistic UI updates
- Progressive enhancement
- Responsive design

**Directory Structure**:
```
apps/web/src/
├── app/                 # Next.js app router
│   ├── auth/           # Authentication pages
│   ├── dashboard/      # Main dashboard
│   └── layout.tsx      # Root layout
├── components/         # React components
│   └── ui/             # Shadcn/UI components
├── lib/                # Utilities
│   ├── api.ts          # API client
│   └── utils.ts        # Helper functions
└── store/              # State management
    └── auth.ts         # Auth store
```

### 2. Backend API (Express.js)
**Technology**: Express.js with TypeScript

**Responsibilities**:
- HTTP request handling
- Authentication & authorization
- Business logic execution
- Data validation
- Error handling
- API response formatting
- Job queue management

**Key Features**:
- RESTful API design
- JWT-based authentication
- Middleware architecture
- Centralized error handling
- Request validation with Zod
- Structured logging

**Directory Structure**:
```
apps/api/src/
├── config/             # Configuration
├── controllers/        # Route handlers
├── middleware/         # Express middleware
├── routes/             # API routes
├── services/           # Business logic
│   ├── redis.ts       # Redis service
│   └── queue.ts       # RabbitMQ service
└── utils/              # Utilities
    └── logger.ts       # Logging
```

### 3. Worker Service
**Technology**: Node.js with TypeScript

**Responsibilities**:
- Background job processing
- Asynchronous operations
- File processing
- Notification sending
- Data transformation

**Key Features**:
- Queue-based job processing
- Retry logic with exponential backoff
- Graceful shutdown
- Error handling and logging
- Scalable design

**Directory Structure**:
```
apps/worker/src/
├── config/             # Configuration
├── processors/         # Job processors
│   ├── upload.processor.ts
│   ├── download.processor.ts
│   └── transcode.processor.ts
└── utils/              # Utilities
```

### 4. Database Layer (MongoDB)
**Technology**: MongoDB 7.0 with Mongoose

**Responsibilities**:
- Data persistence
- Data relationships
- Query optimization
- Data integrity

**Collections**:
- `users` - User accounts and settings
- `files` - File metadata
- `folders` - Folder structure
- `shares` - Sharing permissions
- `audit_logs` - Activity logging

**Key Features**:
- Document-based storage
- Flexible schema
- Indexing for performance
- Aggregation pipelines
- Transactions support

### 5. Cache Layer (Redis)
**Technology**: Redis 7

**Responsibilities**:
- Session management
- Temporary data storage
- Upload progress tracking
- Rate limiting
- Query result caching

**Use Cases**:
- JWT token blacklisting (future)
- Upload progress by file ID
- Download URL caching
- User session data
- Rate limit counters

### 6. Message Queue (RabbitMQ)
**Technology**: RabbitMQ 3

**Responsibilities**:
- Asynchronous job queuing
- Task distribution
- Message reliability
- Load balancing

**Queues**:
- `file.upload` - File upload processing
- `file.download` - Download preparation
- `video.transcode` - Video transcoding

**Features**:
- Durable queues
- Message persistence
- Dead letter queues
- Priority queuing

### 7. Storage Layer (Docker Volume)
**Technology**: Docker Volume

**Responsibilities**:
- Binary file storage
- File persistence
- Data backup

**Structure**:
```
/app/storage/
└── {userId}/
    └── {timestamp}_{filename}
```

## Data Flow

### 1. User Registration Flow
```
User → Web → API → Validate → Hash Password → MongoDB → Response
                              ↓
                         Audit Log
```

### 2. User Login Flow
```
User → Web → API → Validate → Verify Password → Generate JWT → Redis → Response
                              ↓
                         Audit Log
```

### 3. File Upload Flow (Future)
```
User → Web → API → Validate → Generate Upload URL → Response
                              ↓
                         RabbitMQ Queue
                              ↓
                         Worker → Process → Storage Volume
                              ↓
                         Update MongoDB
                              ↓
                         Update User Storage
                              ↓
                         Audit Log
```

### 4. File Download Flow (Future)
```
User → Web → API → Check Permission → Generate Signed URL → Redis Cache
                              ↓                                    ↓
                         Audit Log                             Response
                                                                  ↓
                                                            User Downloads
```

## Communication Patterns

### Synchronous Communication
- **Web ↔ API**: REST API with JSON
- **API ↔ MongoDB**: Mongoose ORM
- **API ↔ Redis**: Redis client

### Asynchronous Communication
- **API → RabbitMQ**: Job publishing
- **RabbitMQ → Worker**: Job consumption
- **Worker → MongoDB**: Data updates

## Security Architecture

### Authentication Flow
1. User submits credentials
2. API validates credentials
3. Password verified with bcrypt
4. JWT token generated with payload
5. Token signed with secret key
6. Token sent to client
7. Client stores token
8. Token sent in Authorization header
9. API validates token on each request

### Authorization Flow
1. Extract user ID from JWT
2. Load user from database
3. Check resource ownership
4. Verify permissions
5. Allow or deny access

### Data Security
- **At Rest**: MongoDB encryption (optional)
- **In Transit**: HTTPS/TLS
- **Passwords**: Bcrypt with 12 rounds
- **Tokens**: JWT with expiration
- **Input**: Validation with Zod
- **Output**: Sanitization

## Scalability Considerations

### Horizontal Scaling
- **API**: Multiple instances behind load balancer
- **Worker**: Multiple worker instances
- **MongoDB**: Replica sets
- **Redis**: Redis cluster
- **RabbitMQ**: Cluster configuration

### Vertical Scaling
- Increase container resources
- Optimize database queries
- Add database indexes
- Implement caching strategies

### Future Enhancements
- CDN integration for file delivery
- Object storage (S3) instead of volumes
- Database sharding
- Read replicas for MongoDB
- API rate limiting per user
- WebSocket for real-time updates

## Monitoring & Observability

### Logging
- **Winston**: Structured JSON logs
- **Log Levels**: debug, info, warn, error
- **Log Aggregation**: Centralized logging (future)

### Metrics (Future)
- API response times
- Request rates
- Error rates
- Queue depth
- Worker processing time
- Database query performance

### Health Checks
- API: `/api/v1/health`
- Database: Connection status
- Redis: Ping command
- RabbitMQ: Management API

## Deployment Architecture

### Development
- Docker Compose on localhost
- Hot reload for all services
- Shared network between containers
- Volume mounts for code

### Production (Planned)
- Container orchestration (Kubernetes/Docker Swarm)
- Load balancer (Nginx/HAProxy)
- Database replica sets
- Redis cluster
- Automated backups
- SSL/TLS certificates
- Environment-based configuration

## Technology Decisions

### Why Next.js?
- Server-side rendering for better SEO
- Built-in routing
- Optimized bundle sizes
- Great developer experience
- Large ecosystem

### Why Express.js?
- Mature and stable
- Extensive middleware ecosystem
- Flexible and unopinionated
- Good performance
- TypeScript support

### Why MongoDB?
- Flexible schema for evolving requirements
- Good performance for document storage
- Easy to scale horizontally
- Native JSON support
- Strong community

### Why RabbitMQ?
- Reliable message delivery
- Multiple messaging patterns
- Good performance
- Management UI
- Battle-tested in production

### Why Redis?
- In-memory performance
- Rich data structures
- Pub/sub support
- Simple to use
- Excellent for caching

## Design Principles

1. **Separation of Concerns**: Each component has a single responsibility
2. **Loose Coupling**: Components communicate through well-defined interfaces
3. **High Cohesion**: Related functionality grouped together
4. **DRY**: Shared code in packages
5. **SOLID**: Object-oriented design principles
6. **Fail Fast**: Early validation and error detection
7. **Graceful Degradation**: System continues with reduced functionality
8. **Progressive Enhancement**: Core features work everywhere

## Future Architecture Enhancements

1. **Microservices**: Split API into smaller services
2. **Event-Driven**: Event bus for service communication
3. **GraphQL**: Alternative to REST API
4. **WebSockets**: Real-time updates
5. **Service Mesh**: Advanced service-to-service communication
6. **API Gateway**: Centralized API management
7. **Object Storage**: S3-compatible storage
8. **CDN**: Content delivery network integration

---

**See Also**:
- [API Design](./api-design.md)
- [Database Schema](./database.md)
- [Infrastructure](./infrastructure.md)

