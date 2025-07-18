import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: string;
    is_verified: boolean;
  };
}

export type { AuthRequest };

import pool from "../utils/db";

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token required",
    });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Get the latest user data from the database
    const userResult = await pool.query(
      "SELECT id, email, role, is_verified FROM user1 WHERE id = $1",
      [decoded.userId]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = userResult.rows[0];

    // Set the user in the request object
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      is_verified: user.is_verified,
    };

    // Update last_active timestamp for this user
    await pool.query("UPDATE user1 SET last_active = NOW() WHERE id = $1", [
      user.id,
    ]);

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(403).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export const requireVerified = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.is_verified) {
    return res.status(403).json({
      success: false,
      message: "Email verification required",
    });
  }
  next();
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    next();
  };
};
