import express from "express";
import { authenticateToken } from "../middleware/auth";
import {
  getAdminStats,
  getConversionLogs,
  getActiveUsers,
  getMonthlySiteViews,
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

// GET /api/admin/monthly-site-views - Monthly site views for chart
router.get("/monthly-site-views", getMonthlySiteViews);

export default router;
