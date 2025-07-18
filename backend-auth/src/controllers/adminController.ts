import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import pool from "../utils/db";

export const getAdminStats = async (req: AuthRequest, res: Response) => {
  console.log(
    "getAdminStats called with user:",
    JSON.stringify(req.user, null, 2)
  );

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
    const userCount = await pool.query("SELECT COUNT(*) AS count FROM user1");
    console.log("User count result:", userCount.rows);

    console.log("Fetching conversion count...");
    const conversionCount = await pool.query(
      "SELECT COUNT(*) AS count FROM conversion_logs"
    );
    console.log("Conversion count result:", conversionCount.rows);

    console.log("Fetching site visits...");
    const siteVisits = await pool.query(
      "SELECT COUNT(*) AS count FROM site_visits"
    );
    console.log("Site visits result:", siteVisits.rows);

    console.log("Fetching active users...");
    const activeUsers = await pool.query(
      "SELECT COUNT(*) AS count FROM user1 WHERE last_active > NOW() - INTERVAL '10 minutes'"
    );
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
  } catch (error: any) {
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

export const getConversionLogs = async (req: AuthRequest, res: Response) => {
  console.log(
    "getConversionLogs called with user:",
    JSON.stringify(req.user, null, 2)
  );

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
    const result = await pool.query(
      `SELECT 
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
       LIMIT 100`
    );

    console.log(`Found ${result.rows.length} log entries`);
    res.json({
      success: true,
      logs: result.rows,
      count: result.rows.length,
    });
  } catch (error: unknown) {
    const err = error as Error;
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

export const getActiveUsers = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    return res
      .status(403)
      .json({ success: false, message: "Unauthorized: Admin access required" });
  }
  try {
    const result = await pool.query(
      "SELECT id, name, email, last_active FROM user1 WHERE last_active > NOW() - INTERVAL '10 minutes' ORDER BY last_active DESC"
    );
    res.json({ success: true, users: result.rows });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch active users" });
  }
};
