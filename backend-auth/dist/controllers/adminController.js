"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMonthlySiteViews = exports.getActiveUsers = exports.getConversionLogs = exports.getAdminStats = void 0;
const db_1 = __importDefault(require("../utils/db"));
const getAdminStats = async (req, res) => {
    console.log("getAdminStats called with user:", JSON.stringify(req.user, null, 2));
    if (!req.user || req.user.role !== "admin") {
        console.warn("Unauthorized access attempt:", {
            user: req.user,
            requiredRole: "admin",
        });
        return res.status(403).json({
            success: false,
            message: "Unauthorized: Admin access required",
        });
    }
    try {
        console.log("Fetching user count...");
        const userCount = await db_1.default.query("SELECT COUNT(*) AS count FROM user1");
        console.log("User count result:", userCount.rows);
        console.log("Fetching conversion count...");
        const conversionCount = await db_1.default.query("SELECT COUNT(*) AS count FROM conversion_logs");
        console.log("Conversion count result:", conversionCount.rows);
        console.log("Fetching site visits...");
        const siteVisits = await db_1.default.query("SELECT COUNT(*) AS count FROM site_visits");
        console.log("Site visits result:", siteVisits.rows);
        console.log("Fetching active users...");
        const activeUsers = await db_1.default.query("SELECT COUNT(*) AS count FROM user1 WHERE last_active > NOW() - INTERVAL '10 minutes' AND role != 'admin'");
        console.log("Active users result:", activeUsers.rows);
        // Verify we got valid results
        if (!userCount.rows || !conversionCount.rows) {
            throw new Error("Database query returned no results");
        }
        const stats = {
            success: true,
            data: {
                users: parseInt(userCount.rows[0]?.count || "0", 10),
                conversions: parseInt(conversionCount.rows[0]?.count || "0", 10),
                visits: parseInt(siteVisits.rows[0]?.count || "0", 10),
                activeUsers: parseInt(activeUsers.rows[0]?.count || "0", 10),
            },
        };
        console.log("Sending stats response:", stats);
        return res.json(stats);
    }
    catch (error) {
        console.error("Error in getAdminStats:", {
            error: error,
            message: error.message,
            stack: error.stack,
        });
        return res.status(500).json({
            success: false,
            message: "Failed to fetch statistics",
            error: process.env.NODE_ENV === "development" ? error.message : undefined,
        });
    }
};
exports.getAdminStats = getAdminStats;
const getConversionLogs = async (req, res) => {
    console.log("getConversionLogs called with user:", JSON.stringify(req.user, null, 2));
    if (!req.user || req.user.role !== "admin") {
        console.warn("Unauthorized logs access attempt:", {
            user: req.user,
            receivedEmail: req.user?.email,
            receivedRole: req.user?.role,
        });
        return res.status(403).json({
            success: false,
            message: "Unauthorized: Admin access required",
        });
    }
    try {
        console.log("Fetching conversion logs...");
        const result = await db_1.default.query(`SELECT 
        cl.id,
        cl.user_id,
        u.email as user_email,
        cl.original_file_name,
        cl.converted_file_name,
        cl.conversion_type,
        cl.status,
        TO_CHAR(cl.created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
        TO_CHAR(cl.updated_at, 'YYYY-MM-DD HH24:MI:SS') as updated_at
       FROM conversion_logs cl
       LEFT JOIN user1 u ON cl.user_id = u.id
       ORDER BY cl.created_at DESC 
       LIMIT 100`);
        console.log(`Found ${result.rows.length} log entries`);
        res.json({
            success: true,
            logs: result.rows,
            count: result.rows.length,
        });
    }
    catch (error) {
        const err = error;
        console.error("Error in getConversionLogs:", {
            error: err,
            message: err.message,
            stack: err.stack,
        });
        res.status(500).json({
            success: false,
            message: "Failed to fetch conversion logs",
            error: process.env.NODE_ENV === "development" ? err.message : undefined,
        });
    }
};
exports.getConversionLogs = getConversionLogs;
const getActiveUsers = async (req, res) => {
    if (!req.user || req.user.role !== "admin") {
        return res
            .status(403)
            .json({ success: false, message: "Unauthorized: Admin access required" });
    }
    try {
        const result = await db_1.default.query("SELECT id, name, email, last_active FROM user1 WHERE last_active > NOW() - INTERVAL '10 minutes' AND role != 'admin' ORDER BY last_active DESC");
        res.json({ success: true, users: result.rows });
    }
    catch (error) {
        res
            .status(500)
            .json({ success: false, message: "Failed to fetch active users" });
    }
};
exports.getActiveUsers = getActiveUsers;
const getMonthlySiteViews = async (req, res) => {
    if (!req.user || req.user.role !== "admin") {
        return res
            .status(403)
            .json({ success: false, message: "Unauthorized: Admin access required" });
    }
    try {
        const result = await db_1.default.query(`SELECT TO_CHAR(visited_at, 'YYYY-MM') as month, COUNT(*) as views
       FROM site_visits
       WHERE visited_at >= NOW() - INTERVAL '12 months'
       GROUP BY month
       ORDER BY month ASC`);
        res.json({ success: true, data: result.rows });
    }
    catch (error) {
        res
            .status(500)
            .json({ success: false, message: "Failed to fetch monthly site views" });
    }
};
exports.getMonthlySiteViews = getMonthlySiteViews;
//# sourceMappingURL=adminController.js.map