# API Design & Architecture

## API Design Principles

### RESTful Design
The AIO Storage API follows REST (Representational State Transfer) principles:
- Resource-based URLs
- HTTP methods for CRUD operations
- Stateless communication
- Standard HTTP status codes
- JSON request/response format

### API Versioning
- URL versioning: `/api/v1/...`
- Allows multiple versions to coexist
- Clients specify version in URL
- Backward compatibility maintained

### Response Format
All API responses follow a consistent structure:

**Success Response**:
```json
{
  "status": "success",
  "data": {
    // Response data
  }
}
```

**Error Response**:
```json
{
  "status": "error",
  "message": "Human-readable error message"
}
```

## API Structure

### Base URL
- Development: `http://localhost:4000/api/v1`
- Production: `https://api.aio-storage.com/api/v1`

### Authentication
All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Implemented Endpoints (Phase 1)

### Health Check
```http
GET /api/v1/health
```

**Description**: Check API health status

**Response**:
```json
{
  "status": "success",
  "message": "API is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### Register User
```http
POST /api/v1/auth/register
```

**Description**: Create a new user account

**Request Body**:
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Validation Rules**:
- `username`: 3-50 characters, alphanumeric with underscore/hyphen
- `email`: Valid email format
- `password`: Minimum 8 characters

**Success Response** (201):
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "email": "john@example.com",
      "storageUsed": 0,
      "storageQuota": 10737418240,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Error Responses**:
- `400`: Validation error
- `409`: User already exists

---

### Login User
```http
POST /api/v1/auth/login
```

**Description**: Authenticate user and get JWT token

**Request Body**:
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Success Response** (200):
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "email": "john@example.com",
      "storageUsed": 0,
      "storageQuota": 10737418240,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Error Responses**:
- `400`: Validation error
- `401`: Invalid credentials

---

### Get Current User
```http
GET /api/v1/auth/me
```

**Description**: Get current authenticated user's profile

**Headers**: Requires Authorization

**Success Response** (200):
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "email": "john@example.com",
      "storageUsed": 1048576,
      "storageQuota": 10737418240,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Error Responses**:
- `401`: Unauthorized (no token or invalid token)
- `404`: User not found

## Planned Endpoints (Phase 2)

### File Management

#### Upload File
```http
POST /api/v1/files/upload
Content-Type: multipart/form-data
```

**Request Body**:
- `file`: File binary
- `folderId`: (optional) Parent folder ID
- `name`: File name

**Response**: Upload job details and progress tracking ID

---

#### Get File Details
```http
GET /api/v1/files/:fileId
```

**Response**: File metadata

---

#### Download File
```http
GET /api/v1/files/:fileId/download
```

**Response**: Signed URL for download

---

#### List Files
```http
GET /api/v1/files?folderId=:folderId&page=1&limit=50
```

**Response**: Paginated list of files

---

#### Delete File
```http
DELETE /api/v1/files/:fileId
```

**Response**: Soft delete confirmation

---

### Folder Management

#### Create Folder
```http
POST /api/v1/folders
```

**Request Body**:
```json
{
  "name": "My Folder",
  "parentId": "optional-parent-id"
}
```

---

#### Get Folder Contents
```http
GET /api/v1/folders/:folderId
```

**Response**: Folder details with files and subfolders

---

#### Delete Folder
```http
DELETE /api/v1/folders/:folderId
```

---

### Sharing

#### Create Share
```http
POST /api/v1/shares
```

**Request Body**:
```json
{
  "resourceId": "file-or-folder-id",
  "resourceType": "file",
  "sharedWithId": "user-id",
  "permission": "read",
  "expiresAt": "2024-12-31T23:59:59.000Z"
}
```

---

#### List Shares
```http
GET /api/v1/shares/received
GET /api/v1/shares/sent
```

---

### Search

#### Search Files/Folders
```http
GET /api/v1/search?q=query&type=file,folder
```

## Middleware Stack

### Request Flow
```
Client Request
    ↓
CORS Middleware
    ↓
Helmet (Security Headers)
    ↓
Body Parser
    ↓
Morgan (Logging)
    ↓
Rate Limiting
    ↓
Authentication (if required)
    ↓
Validation (if applicable)
    ↓
Route Handler / Controller
    ↓
Error Handler
    ↓
Response
```

### Middleware Details

#### 1. CORS
```typescript
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

#### 2. Helmet
```typescript
app.use(helmet()); // Security headers
```

#### 3. Body Parser
```typescript
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
```

#### 4. Authentication
```typescript
export const authenticate = async (req, res, next) => {
  // Extract token from Authorization header
  // Verify JWT token
  // Attach userId to request
  // Call next() or throw error
};
```

#### 5. Validation
```typescript
export const validate = (schema) => async (req, res, next) => {
  // Validate request body against Zod schema
  // Call next() if valid
  // Throw AppError if invalid
};
```

#### 6. Error Handler
```typescript
export const errorHandler = (err, req, res, next) => {
  // Log error
  // Determine error type
  // Format error response
  // Send appropriate status code
};
```

## Error Handling

### Error Types

#### AppError (Operational Errors)
```typescript
class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
  }
}
```

**Usage**:
```typescript
throw new AppError(404, 'File not found');
throw new AppError(403, 'Access denied');
throw new AppError(400, 'Invalid file format');
```

#### Validation Errors
Caught by validation middleware, formatted as:
```json
{
  "status": "error",
  "message": "email: Invalid email format, password: Must be at least 8 characters"
}
```

#### Unexpected Errors
Caught by global error handler, logged, and returned as:
```json
{
  "status": "error",
  "message": "Internal server error"
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Authentication required or invalid token |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Semantic error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | Temporary unavailability |

## Request Validation

### Validation with Zod

**Schema Definition** (in `packages/shared/src/validations/`):
```typescript
import { z } from 'zod';

export const uploadFileSchema = z.object({
  name: z.string().min(1).max(255),
  folderId: z.string().optional(),
  size: z.number().positive(),
  mimeType: z.string(),
});
```

**Usage in Route**:
```typescript
router.post('/upload',
  authenticate,
  validate(uploadFileSchema),
  fileController.upload
);
```

### Benefits
- Type safety at runtime
- Automatic error messages
- Composable schemas
- TypeScript integration

## Rate Limiting

### Configuration
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

### Per-Route Limits
```typescript
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
});

router.post('/upload', uploadLimiter, fileController.upload);
```

## API Security

### Authentication Flow
1. User logs in with credentials
2. Server validates credentials
3. Server generates JWT with payload: `{ userId, email }`
4. JWT signed with secret key
5. Token returned to client
6. Client stores token (localStorage/cookie)
7. Client sends token in Authorization header
8. Server verifies token on each request

### JWT Payload
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "iat": 1640000000,
  "exp": 1640604800
}
```

### Security Best Practices
- ✅ JWT secret stored in environment variable
- ✅ Passwords hashed with bcrypt (12 rounds)
- ✅ Input validation on all endpoints
- ✅ Rate limiting to prevent abuse
- ✅ CORS configured properly
- ✅ Security headers with Helmet
- ✅ SQL injection prevention (Mongoose)
- ✅ XSS prevention (input sanitization)
- 🔜 HTTPS in production
- 🔜 Token refresh mechanism
- 🔜 Token blacklist for logout

## Logging

### Log Levels
- **debug**: Detailed information for debugging
- **info**: General informational messages
- **warn**: Warning messages for potential issues
- **error**: Error messages for failures

### Log Format
```json
{
  "level": "info",
  "message": "User logged in: john@example.com",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "aio-storage-api"
}
```

### What to Log
- API requests (method, path, status)
- Authentication attempts
- Authorization failures
- Errors and exceptions
- Job queue activities
- Database operations (in debug mode)

### What NOT to Log
- Passwords (even hashed)
- JWT tokens
- Sensitive user data
- Credit card information
- API keys or secrets

## Performance Considerations

### Response Time Targets
- Simple queries: <100ms
- Authentication: <300ms (bcrypt overhead)
- File metadata: <100ms
- Signed URL generation: <100ms

### Optimization Strategies
1. **Database Indexing**: Proper indexes on frequently queried fields
2. **Redis Caching**: Cache frequently accessed data
3. **Connection Pooling**: Reuse database connections
4. **Async Operations**: Use queues for heavy operations
5. **Pagination**: Limit result set sizes
6. **Response Compression**: Gzip compression
7. **CDN**: Serve static files from CDN (future)

## Testing Strategy

### Unit Tests
Test individual functions:
```typescript
describe('AuthController', () => {
  it('should register a new user', async () => {
    // Test implementation
  });
});
```

### Integration Tests
Test API endpoints:
```typescript
describe('POST /api/v1/auth/register', () => {
  it('should create a new user', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ username, email, password });
    
    expect(response.status).toBe(201);
    expect(response.body.data.user).toBeDefined();
  });
});
```

### E2E Tests
Test complete user flows:
```typescript
it('should allow user to register, login, and access dashboard', async () => {
  // Register
  // Login
  // Access protected route
});
```

## API Documentation (Future)

### OpenAPI/Swagger
Generate interactive API documentation:
- Automatic from code annotations
- Interactive API explorer
- Request/response examples
- Authentication testing

### Example Documentation
```yaml
paths:
  /auth/register:
    post:
      summary: Register a new user
      tags: [Authentication]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RegisterInput'
      responses:
        '201':
          description: User created successfully
```

---

**Related Documentation**:
- [Architecture Overview](./overview.md)
- [Database Schema](./database.md)
- [Phase 2 Planning](../phase-2/planning.md)

