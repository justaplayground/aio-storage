# Phase 1 Implementation Details

## Overview

Phase 1 establishes the foundational infrastructure and authentication system for the AIO Storage platform. This document details the implementation approach, technical decisions, and code organization.

## Implementation Timeline

### Week 1: Project Setup
- ✅ Turborepo monorepo initialization
- ✅ Package structure definition
- ✅ Docker Compose configuration
- ✅ Base package.json files

### Week 2: Database & Shared Packages
- ✅ MongoDB model definitions
- ✅ TypeScript type definitions
- ✅ Zod validation schemas
- ✅ Utility functions

### Week 3: API Development
- ✅ Express.js server setup
- ✅ Authentication endpoints
- ✅ Middleware implementation
- ✅ Service integrations (Redis, RabbitMQ)

### Week 4: Frontend & Worker
- ✅ Next.js application setup
- ✅ UI components (Shadcn/UI)
- ✅ Authentication pages
- ✅ Worker service implementation

## Technical Implementation

### 1. Monorepo Structure

#### Turborepo Configuration
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**Benefits**:
- Parallel builds across packages
- Intelligent caching
- Dependency management
- Consistent tooling

#### Workspace Configuration
```json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

**Structure**:
```
apps/
  api/        - Express.js API
  web/        - Next.js frontend
  worker/     - Background jobs
packages/
  shared/     - Types, validations, utils
  database/   - MongoDB models
```

---

### 2. Shared Packages Implementation

#### @aio-storage/shared

**Purpose**: Shared types, validations, and utilities

**Key Files**:
```typescript
// src/types/index.ts
export interface IUser {
  _id: string;
  username: string;
  email: string;
  passwordHash: string;
  storageUsed: number;
  storageQuota: number;
  createdAt: Date;
  updatedAt: Date;
}
```

```typescript
// src/validations/index.ts
import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});
```

```typescript
// src/utils/index.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
  }
}
```

**Build Process**:
```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  }
}
```

---

#### @aio-storage/database

**Purpose**: MongoDB models and database connection

**Connection Management**:
```typescript
export class Database {
  private static instance: Database;
  private isConnected: boolean = false;

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(uri: string): Promise<void> {
    if (this.isConnected) return;
    
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
    });
    
    this.isConnected = true;
  }
}
```

**Model Example**:
```typescript
const UserSchema = new Schema<IUserDocument>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  // ... other fields
}, {
  timestamps: true,
  collection: 'users',
});

// Indexes for performance
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
```

---

### 3. API Implementation

#### Express.js Server Setup

**Application Structure**:
```typescript
// src/app.ts
export const createApp = (): Express => {
  const app = express();

  // Security
  app.use(helmet());
  app.use(cors(config.cors));

  // Parsing
  app.use(express.json({ limit: '10mb' }));

  // Logging
  app.use(morgan('dev'));

  // Routes
  app.use('/api/v1', routes);

  // Error handling
  app.use(errorHandler);

  return app;
};
```

**Server Initialization**:
```typescript
// src/index.ts
const startServer = async (): Promise<void> => {
  // Connect databases
  await database.connect(config.mongodb.uri);
  redisService.getClient();
  await queueService.connect();

  // Start server
  const app = createApp();
  app.listen(config.port);

  // Graceful shutdown
  process.on('SIGTERM', shutdown);
};
```

#### Authentication Implementation

**Registration Controller**:
```typescript
public async register(req: Request, res: Response): Promise<void> {
  const { username, email, password } = req.body;

  // Check existing user
  const existingUser = await User.findOne({
    $or: [{ email }, { username }]
  });
  
  if (existingUser) {
    throw new AppError(409, 'User already exists');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user
  const user = await User.create({
    username,
    email,
    passwordHash,
    storageUsed: 0,
    storageQuota: 10737418240, // 10 GB
  });

  // Generate JWT
  const token = jwt.sign(
    { userId: user._id.toString() },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  // Audit log
  await AuditLog.create({
    userId: user._id.toString(),
    action: 'register',
    resourceId: null,
    details: { email, username },
  });

  res.status(201).json({
    status: 'success',
    data: { user: formatUser(user), token }
  });
}
```

**Login Controller**:
```typescript
public async login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError(401, 'Invalid credentials');
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new AppError(401, 'Invalid credentials');
  }

  // Generate token
  const token = jwt.sign(
    { userId: user._id.toString() },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  // Audit log
  await AuditLog.create({
    userId: user._id.toString(),
    action: 'login',
    resourceId: null,
    details: { email },
  });

  res.status(200).json({
    status: 'success',
    data: { user: formatUser(user), token }
  });
}
```

#### Middleware Implementation

**Authentication Middleware**:
```typescript
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'No token provided');
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };
    
    req.userId = decoded.userId;
    next();
  } catch (error) {
    next(error);
  }
};
```

**Validation Middleware**:
```typescript
export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error: any) {
      const errorMessage = error.errors
        ?.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      
      next(new AppError(400, errorMessage));
    }
  };
};
```

**Error Handler**:
```typescript
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
  });

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  // Default error
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
};
```

#### Service Integration

**Redis Service**:
```typescript
class RedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
  }

  public async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }
}
```

**RabbitMQ Service**:
```typescript
class QueueService {
  private connection: Connection | null = null;
  private channel: Channel | null = null;

  public async connect(): Promise<void> {
    this.connection = await amqp.connect(config.rabbitmq.url);
    this.channel = await this.connection.createChannel();

    // Assert queues
    await this.channel.assertQueue('file.upload', { durable: true });
    await this.channel.assertQueue('file.download', { durable: true });
  }

  public async publishToQueue(queue: string, data: any): Promise<void> {
    const message = JSON.stringify(data);
    this.channel!.sendToQueue(queue, Buffer.from(message), {
      persistent: true,
    });
  }
}
```

---

### 4. Frontend Implementation

#### Next.js Setup

**App Router Structure**:
```
src/app/
├── layout.tsx          # Root layout
├── page.tsx            # Landing page
├── auth/
│   ├── login/
│   │   └── page.tsx   # Login page
│   └── register/
│       └── page.tsx   # Register page
└── dashboard/
    └── page.tsx        # Dashboard
```

**API Client**:
```typescript
class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api/v1`,
    });

    // Add auth token
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/auth/login';
        }
        return Promise.reject(error);
      }
    );
  }
}
```

**State Management**:
```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem('token', token);
        set({ user, token });
      },
      clearAuth: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
      },
    }),
    { name: 'auth-storage' }
  )
);
```

**Login Page Implementation**:
```typescript
export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await apiClient.login({ email, password });
      setAuth(response.data.user, response.data.token);
      router.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        {/* Form fields */}
      </form>
    </Card>
  );
}
```

---

### 5. Worker Implementation

**Job Consumer Setup**:
```typescript
const setupQueues = async (): Promise<void> => {
  connection = await amqp.connect(config.rabbitmq.url);
  channel = await connection.createChannel();

  // Prefetch one message at a time
  channel.prefetch(1);

  // Consume upload queue
  channel.consume(
    'file.upload',
    async (msg) => {
      if (msg) {
        try {
          const job = JSON.parse(msg.content.toString());
          await uploadProcessor.process(job);
          channel.ack(msg);
        } catch (error) {
          logger.error('Error processing job:', error);
          channel.nack(msg, false, false);
        }
      }
    },
    { noAck: false }
  );
};
```

**Upload Processor**:
```typescript
export class UploadProcessor {
  public async process(job: IUploadJob): Promise<void> {
    logger.info(`Processing upload: ${job.fileName}`);

    // Verify file
    const file = await File.findById(job.fileId);
    if (!file) throw new Error('File not found');

    // Update user storage
    await User.findByIdAndUpdate(job.userId, {
      $inc: { storageUsed: job.size },
    });

    // Log activity
    await AuditLog.create({
      userId: job.userId,
      action: 'upload',
      resourceId: job.fileId,
      details: {
        fileName: job.fileName,
        size: job.size,
      },
    });

    logger.info(`Upload completed: ${job.fileName}`);
  }
}
```

---

## Key Technical Decisions

### 1. TypeScript
**Reason**: Type safety, better IDE support, reduced runtime errors

### 2. Bcrypt (12 rounds)
**Reason**: Industry standard, adjustable complexity, proven security

### 3. JWT Authentication
**Reason**: Stateless, scalable, widely supported

### 4. Zod Validation
**Reason**: Runtime type checking, TypeScript integration, composable

### 5. MongoDB
**Reason**: Flexible schema, good for hierarchical data, easy scaling

### 6. RabbitMQ
**Reason**: Reliable messaging, multiple patterns, management UI

### 7. Redis
**Reason**: Fast caching, rich data structures, pub/sub support

### 8. Docker Compose
**Reason**: Easy local development, reproducible environments

### 9. Turborepo
**Reason**: Efficient monorepo management, intelligent caching

### 10. Shadcn/UI
**Reason**: Beautiful components, full customization, accessibility

## Testing Approach

### Manual Testing Checklist
- ✅ User can register
- ✅ User can login
- ✅ Invalid credentials rejected
- ✅ Duplicate email/username prevented
- ✅ Protected routes require token
- ✅ Dashboard displays user data
- ✅ Logout clears token
- ✅ Services communicate properly

### Future Testing
- Unit tests with Jest
- Integration tests with Supertest
- E2E tests with Playwright
- Load testing with k6

## Deployment Considerations

### Development
- Docker Compose for all services
- Hot reload for fast iteration
- Shared volumes for code

### Production (Future)
- Kubernetes for orchestration
- Separate database servers
- Load balancer for API
- CDN for static assets
- Environment-based configuration

---

**Related Documentation**:
- [Phase 1 Summary](./SUMMARY.md)
- [Testing Guide](./testing.md)
- [API Design](../architecture/api-design.md)

