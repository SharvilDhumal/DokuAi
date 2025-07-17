import express from "express";
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  verifyEmail,
  verifyToken,
} from "../controllers/authController";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/verify-reset-token", verifyResetToken);
router.post("/verify-email", verifyEmail);
router.get("/verify-token", verifyToken);

// NOTE: Admin routes are defined in a separate file: admin.ts

export default router;
