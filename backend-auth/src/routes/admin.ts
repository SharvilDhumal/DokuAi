import express from "express";
import { authenticateToken } from "../middleware/auth";
import {
  getAdminStats,
  getConversionLogs,
  getActiveUsers,
} from "../controllers/adminController";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/admin/stats - Dashboard stats
router.get("/stats", getAdminStats);

// GET /api/admin/logs - Conversion activity logs
router.get("/logs", getConversionLogs);

// GET /api/admin/active-users - List of active users
router.get("/active-users", getActiveUsers);

export default router;
