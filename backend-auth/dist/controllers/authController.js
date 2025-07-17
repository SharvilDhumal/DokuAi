"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.verifyEmail = exports.verifyResetToken = exports.resetPassword = exports.forgotPassword = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const db_1 = __importDefault(require("../utils/db"));
const userModel = __importStar(require("../models/userModel"));
const emailService_1 = require("../utils/emailService");
const JWT_SECRET = process.env.JWT_SECRET;
const register = async (req, res) => {
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
        const existingUser = await db_1.default.query(userModel.getUserByEmail, [
            email.toLowerCase().trim(),
        ]);
        if (existingUser.rowCount && existingUser.rowCount > 0) {
            return res.status(400).json({
                success: false,
                message: "User with this email already exists",
            });
        }
        // Hash password
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        // Generate verification token
        const verificationToken = crypto_1.default.randomBytes(32).toString("hex");
        const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        // Create user
        const result = await db_1.default.query(userModel.createUserWithVerification, [
            name.trim(),
            email.toLowerCase().trim(),
            hashedPassword,
            verificationToken,
            verificationTokenExpires,
        ]);
        const user = result.rows[0];
        // Send verification email
        await (0, emailService_1.sendVerificationEmail)(email, verificationToken);
        res.status(201).json({
            success: true,
            message: "Registration successful. Please check your email to verify your account.",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                is_verified: false,
            },
        });
    }
    catch (error) {
        console.error("❌ Registration error:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};
exports.register = register;
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and password are required",
        });
    }
    try {
        const result = await db_1.default.query(userModel.getUserByEmail, [
            email.toLowerCase().trim(),
        ]);
        if (result.rowCount === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password",
            });
        }
        const user = result.rows[0];
        const match = await bcrypt_1.default.compare(password, user.password);
        if (!match) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password",
            });
        }
        if (!user.is_verified) {
            // Resend verification email
            const verificationToken = crypto_1.default.randomBytes(32).toString("hex");
            const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
            await db_1.default.query(userModel.updateVerificationToken, [
                verificationToken,
                verificationTokenExpires,
                email.toLowerCase().trim(),
            ]);
            await (0, emailService_1.sendVerificationEmail)(email, verificationToken);
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
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            role: user.role,
            is_verified: user.is_verified,
        }, JWT_SECRET, { expiresIn: "1d" });
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
    }
    catch (error) {
        console.error(`❌ Login error for ${email}:`, error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};
exports.login = login;
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({
            success: false,
            message: "Email is required",
        });
    }
    try {
        const result = await db_1.default.query(userModel.getUserByEmail, [
            email.toLowerCase().trim(),
        ]);
        const user = result.rows[0];
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "If this email exists in our system, you'll receive a reset link",
            });
        }
        const token = crypto_1.default.randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 3600000); // 1 hour
        await db_1.default.query(userModel.setResetTokenByEmail, [token, expires, email]);
        const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const resetLink = `${baseUrl}/reset-password?token=${token}&isPopup=true`;
        await (0, emailService_1.sendResetEmail)(email, resetLink);
        res.json({
            success: true,
            message: "If this email exists in our system, you'll receive a reset link",
        });
    }
    catch (error) {
        console.error(`❌ Forgot password error for ${email}:`, error);
        res.status(500).json({
            success: false,
            message: "Failed to send reset email. Please try again later.",
        });
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res) => {
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
        const result = await db_1.default.query(userModel.getUserByResetToken, [token]);
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
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        const client = await db_1.default.connect();
        try {
            await client.query("BEGIN");
            await client.query(userModel.resetUserPassword, [
                hashedPassword,
                user.id,
            ]);
            await client.query(userModel.clearResetToken, [user.id]);
            await client.query("COMMIT");
        }
        catch (err) {
            await client.query("ROLLBACK");
            throw err;
        }
        finally {
            client.release();
        }
        // Send password changed notification
        await (0, emailService_1.sendPasswordChangedEmail)(user.email);
        res.json({
            success: true,
            message: "Password reset successful",
            shouldClose: true,
        });
    }
    catch (error) {
        console.error("❌ Password reset error:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};
exports.resetPassword = resetPassword;
const verifyResetToken = async (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.status(400).json({
            success: false,
            message: "Token is required",
        });
    }
    try {
        const result = await db_1.default.query(userModel.getUserByResetToken, [token]);
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
    }
    catch (error) {
        console.error("❌ Token verification error:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};
exports.verifyResetToken = verifyResetToken;
const verifyEmail = async (req, res) => {
    // Support both GET (query) and POST (body)
    const token = req.method === "POST" ? req.body.token : req.query.token;
    if (!token) {
        return res.status(400).json({
            success: false,
            message: "Token is required",
        });
    }
    try {
        const result = await db_1.default.query(userModel.verifyUserEmail, [token]);
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
    }
    catch (error) {
        console.error("❌ Email verification error:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};
exports.verifyEmail = verifyEmail;
const verifyToken = async (req, res) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Token is required",
        });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Get the latest user data from the database
        const userResult = await db_1.default.query("SELECT id, email, role, is_verified FROM user1 WHERE id = $1", [decoded.userId]);
        if (userResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        const user = userResult.rows[0];
        res.json({
            success: true,
            message: "Token is valid",
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                is_verified: user.is_verified
            },
            role: user.role // Include role at the root level for easier access
        });
    }
    catch (error) {
        console.error("Token verification error:", error);
        res.status(403).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
};
exports.verifyToken = verifyToken;
//# sourceMappingURL=authController.js.map