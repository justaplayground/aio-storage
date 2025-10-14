#!/usr/bin/env ts-node

import bcrypt from "bcryptjs";
import { config } from "../src/config";
import { database } from "../../../packages/database/src/connection";
import { User } from "../../../packages/database/src/models/User";
import { AuditLog } from "../../../packages/database/src/models/AuditLog";

interface AdminCreationOptions {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

class AdminCreator {
  private async validateInput(options: AdminCreationOptions): Promise<void> {
    const { username, email, password, confirmPassword } = options;

    // Validate username
    if (!username || username.length < 3 || username.length > 50) {
      throw new Error("Username must be between 3 and 50 characters");
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new Error("Please provide a valid email address");
    }

    // Validate password
    if (!password || password.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }

    // Check password strength
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      throw new Error(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      );
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      throw new Error("Passwords do not match");
    }
  }

  private async checkExistingAdmin(): Promise<void> {
    const existingAdmin = await User.findOne({ isSuperAdmin: true });
    if (existingAdmin) {
      throw new Error(
        `An admin already exists with email: ${existingAdmin.email}. Only one admin is allowed in the system.`
      );
    }
  }

  private async checkExistingUser(email: string, username: string): Promise<void> {
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      throw new Error(
        `User already exists with ${existingUser.email === email ? "email" : "username"}: ${
          existingUser.email === email ? email : username
        }`
      );
    }
  }

  public async createAdmin(options: AdminCreationOptions): Promise<void> {
    try {
      console.log("🔐 Creating admin user...\n");

      // Validate input
      await this.validateInput(options);

      // Check if admin already exists
      await this.checkExistingAdmin();

      // Check if user with same email/username exists
      await this.checkExistingUser(options.email, options.username);

      // Connect to database
      const mongoUri = `${config.mongodb.uri}/${config.mongodb.dbName}`;
      await database.connect(mongoUri);

      // Hash password
      console.log("🔒 Hashing password...");
      const passwordHash = await bcrypt.hash(options.password, 12);

      // Create admin user
      console.log("👤 Creating admin user...");
      const adminUser = await User.create({
        username: options.username,
        email: options.email.toLowerCase(),
        passwordHash,
        storageUsed: 0,
        storageQuota: 1073741824000, // 1TB for admin
        isActive: true,
        isSuperAdmin: true,
      });

      // Log audit
      await AuditLog.create({
        userId: String(adminUser._id),
        action: "register",
        resourceId: null,
        details: {
          email: options.email,
          username: options.username,
          isSuperAdmin: true,
          createdBy: "system",
        },
      });

      console.log("\n✅ Admin user created successfully!");
      console.log(`📧 Email: ${options.email}`);
      console.log(`👤 Username: ${options.username}`);
      console.log(`🆔 User ID: ${adminUser._id}`);
      console.log(`💾 Storage Quota: 1TB`);
      console.log(`🔑 Super Admin: Yes`);
      console.log(`\n⚠️  Important: Please save these credentials securely!`);
      console.log(`   Only this admin can create new users in the system.`);
    } catch (error) {
      console.error("\n❌ Error creating admin:", error.message);
      process.exit(1);
    } finally {
      // Disconnect from database
      await database.disconnect();
    }
  }
}

// Interactive prompt function
async function promptForInput(): Promise<AdminCreationOptions> {
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(query, resolve);
    });
  };

  try {
    console.log("🔐 Admin User Creation Script");
    console.log("============================\n");
    console.log("This script will create the first admin user for the system.");
    console.log("Only this admin will be able to create new users.\n");

    const username = await question("Enter username (3-50 characters): ");
    const email = await question("Enter email address: ");

    // Hide password input
    const password = await question(
      "Enter password (min 8 chars, must include uppercase, lowercase, number, special char): "
    );
    const confirmPassword = await question("Confirm password: ");

    rl.close();

    return { username, email, password, confirmPassword };
  } catch (error) {
    rl.close();
    throw error;
  }
}

// Main execution
async function main() {
  try {
    const adminCreator = new AdminCreator();

    // Check if running in interactive mode or with command line arguments
    if (process.argv.length >= 6) {
      // Command line mode
      const [, , username, email, password, confirmPassword] = process.argv;
      await adminCreator.createAdmin({ username, email, password, confirmPassword });
    } else {
      // Interactive mode
      const options = await promptForInput();
      await adminCreator.createAdmin(options);
    }
  } catch (error) {
    console.error("❌ Script failed:", error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { AdminCreator };
