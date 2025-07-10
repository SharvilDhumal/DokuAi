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
router.get("/verify-email", verifyEmail);
router.get("/verify-token", verifyToken);

export default router;
