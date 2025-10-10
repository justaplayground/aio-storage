import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { User } from "@aio-storage/database";
import { AuditLog } from "@aio-storage/database";
import { AppError, IUserResponse } from "@aio-storage/shared";
import { config } from "../config";
import { logger } from "../utils/logger";

export class AuthController {
  public async register(req: Request, res: Response): Promise<void> {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      throw new AppError(409, "User with this email or username already exists");
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

    // Log audit
    await AuditLog.create({
      userId: String(user._id),
      action: "register",
      resourceId: null,
      details: { email, username },
    });

    logger.info(`New user registered: ${email}`);

    // Generate JWT
    const token = jwt.sign({ userId: String(user._id) }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as SignOptions["expiresIn"],
    });

    const userResponse: IUserResponse = {
      id: String(user._id),
      username: user.username,
      email: user.email,
      storageUsed: user.storageUsed,
      storageQuota: user.storageQuota,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    res.status(201).json({
      status: "success",
      data: {
        user: userResponse,
        token,
      },
    });
  }

  public async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      throw new AppError(401, "Invalid email or password");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError(401, "Invalid email or password");
    }

    // Log audit
    await AuditLog.create({
      userId: String(user._id),
      action: "login",
      resourceId: null,
      details: { email },
    });

    logger.info(`User logged in: ${email}`);

    // Generate JWT
    const token = jwt.sign({ userId: String(user._id) }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as SignOptions["expiresIn"],
    });

    const userResponse: IUserResponse = {
      id: String(user._id),
      username: user.username,
      email: user.email,
      storageUsed: user.storageUsed,
      storageQuota: user.storageQuota,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    res.status(200).json({
      status: "success",
      data: {
        user: userResponse,
        token,
      },
    });
  }

  public async getMe(req: Request, res: Response): Promise<void> {
    const userId = (req as any).userId;

    const user = await User.findById(userId);

    if (!user) {
      throw new AppError(404, "User not found");
    }

    const userResponse: IUserResponse = {
      id: String(user._id),
      username: user.username,
      email: user.email,
      storageUsed: user.storageUsed,
      storageQuota: user.storageQuota,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    res.status(200).json({
      status: "success",
      data: {
        user: userResponse,
      },
    });
  }
}

export const authController = new AuthController();
