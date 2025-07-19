import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import pool from "../utils/db";
import * as userModel from "../models/userModel";
import {
  sendVerificationEmail,
  sendResetEmail,
  sendPasswordChangedEmail,
} from "../utils/emailService";
import { AuthRequest } from "../middleware/auth";

const JWT_SECRET = process.env.JWT_SECRET!;

export const register = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Name, email, and password are required",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters long",
    });
  }

  try {
    // Check if user already exists
    const existingUser = await pool.query(userModel.getUserByEmail, [
      email.toLowerCase().trim(),
    ]);

    if (existingUser.rowCount && existingUser.rowCount > 0) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const result = await pool.query(userModel.createUserWithVerification, [
      name.trim(),
      email.toLowerCase().trim(),
      hashedPassword,
      verificationToken,
      verificationTokenExpires,
    ]);

    const user = result.rows[0];

    // Send verification email
    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({
      success: true,
      message:
        "Registration successful. Please check your email to verify your account.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        is_verified: false,
      },
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  try {
    const result = await pool.query(userModel.getUserByEmail, [
      email.toLowerCase().trim(),
    ]);

    if (result.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.is_verified) {
      // Resend verification email
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationTokenExpires = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      );

      await pool.query(userModel.updateVerificationToken, [
        verificationToken,
        verificationTokenExpires,
        email.toLowerCase().trim(),
      ]);

      await sendVerificationEmail(email, verificationToken);

      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          is_verified: false,
        },
      });
    }

    // --- NEW: Update last_active on login ---
    await pool.query("UPDATE user1 SET last_active = NOW() WHERE id = $1", [
      user.id,
    ]);

    // --- NEW: Insert a site visit on login ---
    await pool.query("INSERT INTO site_visits (visited_at) VALUES (NOW())");

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified,
      },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        is_verified: user.is_verified,
      },
    });
  } catch (error) {
    console.error(`❌ Login error for ${email}:`, error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }

  try {
    const result = await pool.query(userModel.getUserByEmail, [
      email.toLowerCase().trim(),
    ]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "If this email exists in our system, you'll receive a reset link",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await pool.query(userModel.setResetTokenByEmail, [token, expires, email]);

    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password?token=${token}&isPopup=true`;

    await sendResetEmail(email, resetLink);

    res.json({
      success: true,
      message:
        "If this email exists in our system, you'll receive a reset link",
    });
  } catch (error) {
    console.error(`❌ Forgot password error for ${email}:`, error);
    res.status(500).json({
      success: false,
      message: "Failed to send reset email. Please try again later.",
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Token and new password are required",
    });
  }

  try {
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    const result = await pool.query(userModel.getUserByResetToken, [token]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    if (new Date(user.reset_token_expires) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Token has expired",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(userModel.resetUserPassword, [
        hashedPassword,
        user.id,
      ]);
      await client.query(userModel.clearResetToken, [user.id]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    // Send password changed notification
    await sendPasswordChangedEmail(user.email);

    res.json({
      success: true,
      message: "Password reset successful",
      shouldClose: true,
    });
  } catch (error) {
    console.error("❌ Password reset error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const verifyResetToken = async (req: Request, res: Response) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: "Token is required",
    });
  }

  try {
    const result = await pool.query(userModel.getUserByResetToken, [token]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    if (new Date(user.reset_token_expires) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Token has expired",
      });
    }

    res.json({
      success: true,
      message: "Token is valid",
    });
  } catch (error) {
    console.error("❌ Token verification error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  // Support both GET (query) and POST (body)
  const token = req.method === "POST" ? req.body.token : req.query.token;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: "Token is required",
    });
  }

  try {
    const result = await pool.query(userModel.verifyUserEmail, [token]);

    if (result.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
      });
    }

    res.json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("❌ Email verification error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const verifyToken = async (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Token is required",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

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

    // Update last_active timestamp
    await pool.query("UPDATE user1 SET last_active = NOW() WHERE id = $1", [
      decoded.userId,
    ]);

    const user = userResult.rows[0];

    res.json({
      success: true,
      message: "Token is valid",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified,
      },
      role: user.role, // Include role at the root level for easier access
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(403).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

// Add a ping endpoint to update last_active timestamp
export const ping = async (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Token is required",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Update last_active timestamp
    await pool.query("UPDATE user1 SET last_active = NOW() WHERE id = $1", [
      decoded.userId,
    ]);

    res.json({
      success: true,
      message: "Activity updated",
    });
  } catch (error) {
    console.error("Ping error:", error);
    res.status(403).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};
