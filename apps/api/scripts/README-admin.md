# Admin Creation Script

This script creates the first administrator user for the AIO Storage system. Only this admin will be able to create new users in the system.

## Features

- ✅ **Security**: Strong password validation with complexity requirements
- ✅ **Validation**: Email format validation and username length checks
- ✅ **Duplicate Prevention**: Prevents creating multiple admins or users with existing credentials
- ✅ **Audit Logging**: All admin creation activities are logged
- ✅ **Interactive Mode**: User-friendly prompts for credential input
- ✅ **Command Line Mode**: Supports non-interactive execution
- ✅ **Error Handling**: Comprehensive error handling and validation

## Usage

### Interactive Mode (Recommended)

```bash
# From the project root directory
./scripts/create-admin.sh
```

This will prompt you for:
- Username (3-50 characters)
- Email address
- Password (must include uppercase, lowercase, number, and special character)
- Password confirmation

### Command Line Mode

```bash
# From the project root directory
./scripts/create-admin.sh <username> <email> <password> <confirm_password>
```

Example:
```bash
./scripts/create-admin.sh admin admin@example.com MySecurePass123! MySecurePass123!
```

### Direct TypeScript Execution

```bash
# From the project root directory
npx ts-node scripts/create-admin.ts
```

## Password Requirements

The admin password must meet the following criteria:
- Minimum 8 characters long
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (!@#$%^&*(),.?":{}|<>)

## Admin Privileges

The created admin user will have:
- **Super Admin Status**: `isSuperAdmin: true`
- **Active Status**: `isActive: true`
- **Large Storage Quota**: 1TB (1,073,741,824,000 bytes)
- **User Creation Rights**: Only this admin can create new users

## Security Notes

⚠️ **Important Security Considerations:**

1. **Single Admin**: Only one admin can exist in the system at a time
2. **Secure Storage**: Save admin credentials securely - they cannot be recovered
3. **Database Access**: Ensure MongoDB is running and accessible
4. **Environment**: Run this script in a secure environment
5. **Audit Trail**: All admin creation activities are logged in the audit system

## Prerequisites

- Node.js installed
- MongoDB running and accessible
- Project dependencies installed (`npm install`)
- ts-node available (will be installed automatically if missing)

## Environment Variables

The script uses the following environment variables (from `.env` file):
- `MONGODB_URI`: MongoDB connection string
- `MONGODB_DB_NAME`: Database name

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   ```
   Error: Failed to connect to MongoDB
   ```
   - Ensure MongoDB is running
   - Check MongoDB connection string in environment variables

2. **Admin Already Exists**
   ```
   Error: An admin already exists with email: admin@example.com
   ```
   - Only one admin is allowed in the system
   - Use existing admin credentials or reset the database

3. **Password Validation Error**
   ```
   Error: Password must contain at least one uppercase letter...
   ```
   - Ensure password meets all complexity requirements
   - Use a password manager to generate secure passwords

4. **User Already Exists**
   ```
   Error: User already exists with email: user@example.com
   ```
   - Choose a different email or username
   - Check existing users in the database

### Database Reset (Development Only)

If you need to reset the admin user (development only):

```bash
# Connect to MongoDB
mongo

# Switch to your database
use aio_storage

# Remove existing admin
db.users.deleteOne({ isSuperAdmin: true })

# Exit MongoDB
exit
```

## Example Output

```
🔐 Admin User Creation Script
============================

This script will create the first admin user for the system.
Only this admin will be able to create new users.

Enter username (3-50 characters): admin
Enter email address: admin@example.com
Enter password (min 8 chars, must include uppercase, lowercase, number, special char): 
Confirm password: 

🔐 Creating admin user...

🔒 Hashing password...
👤 Creating admin user...

✅ Admin user created successfully!
📧 Email: admin@example.com
👤 Username: admin
🆔 User ID: 507f1f77bcf86cd799439011
💾 Storage Quota: 1TB
🔑 Super Admin: Yes

⚠️  Important: Please save these credentials securely!
   Only this admin can create new users in the system.
```
