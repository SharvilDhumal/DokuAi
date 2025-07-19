"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const adminController_1 = require("../controllers/adminController");
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_1.authenticateToken);
// GET /api/admin/stats - Dashboard stats
router.get("/stats", adminController_1.getAdminStats);
// GET /api/admin/logs - Conversion activity logs
router.get("/logs", adminController_1.getConversionLogs);
// GET /api/admin/active-users - List of active users
router.get("/active-users", adminController_1.getActiveUsers);
// GET /api/admin/monthly-site-views - Monthly site views for chart
router.get("/monthly-site-views", adminController_1.getMonthlySiteViews);
exports.default = router;
//# sourceMappingURL=admin.js.map