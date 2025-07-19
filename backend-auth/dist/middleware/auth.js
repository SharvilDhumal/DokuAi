"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.requireVerified = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../utils/db"));
const authenticateToken = async (req, res, next) => {
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
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Get the latest user data from the database
        const userResult = await db_1.default.query("SELECT id, email, role, is_verified FROM user1 WHERE id = $1", [decoded.userId]);
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
        await db_1.default.query("UPDATE user1 SET last_active = NOW() WHERE id = $1", [
            user.id,
        ]);
        next();
    }
    catch (error) {
        console.error("Authentication error:", error);
        return res.status(403).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
};
exports.authenticateToken = authenticateToken;
const requireVerified = (req, res, next) => {
    if (!req.user?.is_verified) {
        return res.status(403).json({
            success: false,
            message: "Email verification required",
        });
    }
    next();
};
exports.requireVerified = requireVerified;
const requireRole = (roles) => {
    return (req, res, next) => {
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
exports.requireRole = requireRole;
//# sourceMappingURL=auth.js.map