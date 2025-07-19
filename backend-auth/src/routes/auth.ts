import express from "express";
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  verifyEmail,
  verifyToken,
  ping,
} from "../controllers/authController";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/verify-reset-token", verifyResetToken);
router.post("/verify-email", verifyEmail);
router.get("/verify-token", verifyToken);
router.post("/ping", ping);

// NOTE: Admin routes are defined in a separate file: admin.ts

export default router;
