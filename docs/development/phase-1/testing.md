# Phase 1 Testing Guide

## Testing Overview

This guide covers manual testing procedures for Phase 1 features. Automated testing will be added in future phases.

## Prerequisites

### Environment Setup
```bash
# Start all services
./scripts/setup.sh

# Or for development
./scripts/dev-setup.sh
npm run dev
```

### Verify Services Running
```bash
# Check Docker containers
docker-compose ps

# All services should be "Up (healthy)"
```

## Test Suite

### 1. Infrastructure Tests

#### 1.1 MongoDB Connection
```bash
# Test MongoDB connection
docker-compose exec mongodb mongosh

# Should connect successfully
# Run: db.runCommand({ ping: 1 })
# Expected: { ok: 1 }
```

**Pass Criteria**:
- ✅ MongoDB responds to ping
- ✅ Database `aio_storage` exists
- ✅ Collections are created after first use

---

#### 1.2 Redis Connection
```bash
# Test Redis connection
docker-compose exec redis redis-cli ping

# Expected output: PONG
```

**Pass Criteria**:
- ✅ Redis responds with PONG
- ✅ Can set and get values

---

#### 1.3 RabbitMQ Connection
```bash
# Access RabbitMQ Management UI
open http://localhost:15672

# Login: admin / password123
```

**Pass Criteria**:
- ✅ Management UI accessible
- ✅ Can login with credentials
- ✅ Queues `file.upload`, `file.download`, `video.transcode` exist

---

#### 1.4 API Health Check
```bash
curl http://localhost:4000/api/v1/health
```

**Expected Response**:
```json
{
  "status": "success",
  "message": "API is running",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

**Pass Criteria**:
- ✅ Returns 200 status code
- ✅ JSON response with correct structure
- ✅ Timestamp is current

---

### 2. Authentication Tests

#### 2.1 User Registration - Valid Data

**Test Case**: Register a new user with valid credentials

**Steps**:
1. Open http://localhost:3000
2. Click "Sign up"
3. Fill in form:
   - Username: `testuser`
   - Email: `test@example.com`
   - Password: `testpassword123`
   - Confirm Password: `testpassword123`
4. Click "Create Account"

**Expected Results**:
- ✅ Redirected to dashboard at `/dashboard`
- ✅ Dashboard shows user information
- ✅ Storage quota displays "0 Bytes of 10 GB (0.0%)"
- ✅ Username displays correctly

**API Equivalent**:
```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

**Expected Response**:
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "...",
      "username": "testuser",
      "email": "test@example.com",
      "storageUsed": 0,
      "storageQuota": 10737418240,
      "createdAt": "...",
      "updatedAt": "..."
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

#### 2.2 User Registration - Duplicate Email

**Test Case**: Attempt to register with existing email

**Steps**:
1. Try to register again with same email
2. Use different username but same email

**Expected Results**:
- ✅ Shows error message: "User with this email or username already exists"
- ✅ Returns 409 status code (API)
- ✅ User remains on registration page

**API Test**:
```bash
# Should fail with 409
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "differentuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

---

#### 2.3 User Registration - Invalid Data

**Test Cases**:

| Field | Invalid Value | Expected Error |
|-------|--------------|----------------|
| Username | `ab` | Must be at least 3 characters |
| Username | `user@name` | Only alphanumeric and _- allowed |
| Email | `notanemail` | Invalid email format |
| Password | `short` | Must be at least 8 characters |
| Confirm | Different from password | Passwords do not match |

**Steps**: Test each validation rule individually

**Expected Results**:
- ✅ Error message displays for each invalid input
- ✅ Form does not submit
- ✅ Returns 400 status code (API)

---

#### 2.4 User Login - Valid Credentials

**Test Case**: Login with registered user

**Steps**:
1. Navigate to http://localhost:3000
2. Should auto-redirect to login page
3. Enter credentials:
   - Email: `test@example.com`
   - Password: `testpassword123`
4. Click "Sign In"

**Expected Results**:
- ✅ Redirected to dashboard
- ✅ User information displays
- ✅ JWT token stored in localStorage
- ✅ Can access protected routes

**API Test**:
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

**Save Token**:
```bash
export TOKEN="<token_from_response>"
```

---

#### 2.5 User Login - Invalid Credentials

**Test Cases**:

| Email | Password | Expected Result |
|-------|----------|-----------------|
| `test@example.com` | `wrongpassword` | Invalid email or password |
| `wrong@example.com` | `testpassword123` | Invalid email or password |
| `notanemail` | `testpassword123` | Validation error |

**Expected Results**:
- ✅ Error message displays
- ✅ User remains on login page
- ✅ Returns 401 or 400 status code

---

#### 2.6 Get Current User - Authenticated

**Test Case**: Retrieve current user profile

**API Test**:
```bash
curl -X GET http://localhost:4000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response**:
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "...",
      "username": "testuser",
      "email": "test@example.com",
      "storageUsed": 0,
      "storageQuota": 10737418240,
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

**Pass Criteria**:
- ✅ Returns 200 status code
- ✅ User data matches registered user
- ✅ Storage values are correct

---

#### 2.7 Get Current User - Unauthenticated

**Test Case**: Access protected endpoint without token

**API Test**:
```bash
curl -X GET http://localhost:4000/api/v1/auth/me
```

**Expected Response**:
```json
{
  "status": "error",
  "message": "No token provided"
}
```

**Pass Criteria**:
- ✅ Returns 401 status code
- ✅ Error message indicates missing token

---

#### 2.8 Get Current User - Invalid Token

**Test Case**: Access with invalid/expired token

**API Test**:
```bash
curl -X GET http://localhost:4000/api/v1/auth/me \
  -H "Authorization: Bearer invalid_token"
```

**Expected Response**:
```json
{
  "status": "error",
  "message": "Invalid or expired token"
}
```

**Pass Criteria**:
- ✅ Returns 401 status code
- ✅ Error message indicates invalid token

---

### 3. Dashboard Tests

#### 3.1 Dashboard Access - Authenticated

**Test Case**: Access dashboard when logged in

**Steps**:
1. Login successfully
2. Should auto-redirect to `/dashboard`
3. Or manually navigate to http://localhost:3000/dashboard

**Expected Results**:
- ✅ Dashboard displays user information
- ✅ Shows storage statistics card
- ✅ Shows total files card (0 files)
- ✅ Shows total folders card (0 folders)
- ✅ Shows quick actions section
- ✅ Shows recent files section (empty)
- ✅ Logout button visible in header

**Visual Checks**:
- ✅ UI is responsive
- ✅ Cards display correctly
- ✅ Progress bar for storage visible
- ✅ Icons render properly

---

#### 3.2 Dashboard Access - Unauthenticated

**Test Case**: Attempt to access dashboard without login

**Steps**:
1. Clear localStorage
2. Navigate to http://localhost:3000/dashboard

**Expected Results**:
- ✅ Redirected to login page
- ✅ Cannot access dashboard

---

#### 3.3 Logout Functionality

**Test Case**: Logout from dashboard

**Steps**:
1. Login and access dashboard
2. Click "Logout" button

**Expected Results**:
- ✅ Redirected to login page
- ✅ Token removed from localStorage
- ✅ Cannot access dashboard without re-login
- ✅ API requests fail with 401

---

### 4. Database Tests

#### 4.1 Verify User Creation

**Test Case**: Check user exists in database

**Steps**:
```bash
docker-compose exec mongodb mongosh

use aio_storage

db.users.findOne({ email: "test@example.com" })
```

**Expected Results**:
- ✅ User document exists
- ✅ Password is hashed (not plain text)
- ✅ `storageUsed` is 0
- ✅ `storageQuota` is 10737418240 (10 GB)
- ✅ `createdAt` and `updatedAt` timestamps present

---

#### 4.2 Verify Audit Log

**Test Case**: Check registration is logged

**Steps**:
```bash
use aio_storage

db.audit_logs.find({ action: "register" }).sort({ timestamp: -1 }).limit(1)
```

**Expected Results**:
- ✅ Audit log entry exists
- ✅ Contains user ID
- ✅ Action is "register"
- ✅ Details include email and username
- ✅ Timestamp is correct

---

#### 4.3 Verify Login Audit

**Test Case**: Check login is logged

**Steps**:
```bash
db.audit_logs.find({ action: "login" }).sort({ timestamp: -1 }).limit(1)
```

**Expected Results**:
- ✅ Login event logged
- ✅ Contains correct user ID
- ✅ Timestamp is recent

---

### 5. Security Tests

#### 5.1 Password Hashing

**Test Case**: Verify password is properly hashed

**Steps**:
```bash
# Check database
docker-compose exec mongodb mongosh
use aio_storage
db.users.findOne({ email: "test@example.com" }, { passwordHash: 1 })
```

**Expected Results**:
- ✅ Password is not stored in plain text
- ✅ Hash starts with `$2a$12$` (bcrypt)
- ✅ Hash is 60 characters long

---

#### 5.2 JWT Token Validation

**Test Case**: Verify JWT structure

**Steps**:
1. Copy token from login response
2. Decode at https://jwt.io

**Expected Results**:
- ✅ Header contains algorithm: HS256
- ✅ Payload contains `userId`
- ✅ Payload contains `iat` (issued at)
- ✅ Payload contains `exp` (expiration)
- ✅ Expiration is 7 days from issued time

---

#### 5.3 CORS Configuration

**Test Case**: Verify CORS is properly configured

**API Test**:
```bash
curl -X OPTIONS http://localhost:4000/api/v1/health \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

**Expected Results**:
- ✅ Contains `Access-Control-Allow-Origin` header
- ✅ Origin is allowed
- ✅ Credentials are allowed

---

### 6. Error Handling Tests

#### 6.1 Invalid Route

**Test Case**: Access non-existent endpoint

**API Test**:
```bash
curl http://localhost:4000/api/v1/nonexistent
```

**Expected Response**:
```json
{
  "status": "error",
  "message": "Route not found"
}
```

**Pass Criteria**:
- ✅ Returns 404 status code
- ✅ Error message is clear

---

#### 6.2 Malformed JSON

**Test Case**: Send invalid JSON

**API Test**:
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{ invalid json }'
```

**Expected Results**:
- ✅ Returns 400 status code
- ✅ Error message indicates JSON parse error

---

### 7. Worker Tests

#### 7.1 Worker Running

**Test Case**: Verify worker is running

**Steps**:
```bash
docker-compose logs worker

# Should see:
# ✅ MongoDB connected
# ✅ Worker queues initialized
# ✅ Worker is listening for jobs
```

---

#### 7.2 Queue Creation

**Test Case**: Verify queues exist

**Steps**:
1. Open http://localhost:15672
2. Login with admin/password123
3. Go to "Queues" tab

**Expected Results**:
- ✅ Queue `file.upload` exists
- ✅ Queue `file.download` exists
- ✅ Queue `video.transcode` exists
- ✅ All queues are durable

---

## Test Results Template

### Test Execution Record

| Test ID | Test Case | Status | Notes |
|---------|-----------|--------|-------|
| 1.1 | MongoDB Connection | ⬜ PASS / ⬜ FAIL | |
| 1.2 | Redis Connection | ⬜ PASS / ⬜ FAIL | |
| 1.3 | RabbitMQ Connection | ⬜ PASS / ⬜ FAIL | |
| 1.4 | API Health Check | ⬜ PASS / ⬜ FAIL | |
| 2.1 | Register Valid | ⬜ PASS / ⬜ FAIL | |
| 2.2 | Register Duplicate | ⬜ PASS / ⬜ FAIL | |
| 2.3 | Register Invalid | ⬜ PASS / ⬜ FAIL | |
| 2.4 | Login Valid | ⬜ PASS / ⬜ FAIL | |
| 2.5 | Login Invalid | ⬜ PASS / ⬜ FAIL | |
| 2.6 | Get User Auth | ⬜ PASS / ⬜ FAIL | |
| 2.7 | Get User Unauth | ⬜ PASS / ⬜ FAIL | |
| 2.8 | Get User Invalid Token | ⬜ PASS / ⬜ FAIL | |
| 3.1 | Dashboard Auth | ⬜ PASS / ⬜ FAIL | |
| 3.2 | Dashboard Unauth | ⬜ PASS / ⬜ FAIL | |
| 3.3 | Logout | ⬜ PASS / ⬜ FAIL | |

## Troubleshooting

### Common Issues

#### Services Not Starting
```bash
# Check logs
docker-compose logs

# Restart specific service
docker-compose restart <service>

# Rebuild if needed
docker-compose build --no-cache <service>
```

#### Port Conflicts
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

#### Database Connection Issues
```bash
# Check MongoDB is healthy
docker-compose ps mongodb

# Restart MongoDB
docker-compose restart mongodb
```

## Next Steps

After all tests pass:
1. ✅ Phase 1 is complete
2. ✅ Ready for Phase 2 development
3. ✅ Begin implementing file operations

---

**Related Documentation**:
- [Phase 1 Summary](./SUMMARY.md)
- [Implementation Details](./implementation.md)
- [Phase 2 Planning](../phase-2/planning.md)

