"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const router = express_1.default.Router();
// Public routes
router.post("/register", authController_1.register);
router.post("/login", authController_1.login);
router.post("/forgot-password", authController_1.forgotPassword);
router.post("/reset-password", authController_1.resetPassword);
router.get("/verify-reset-token", authController_1.verifyResetToken);
router.post("/verify-email", authController_1.verifyEmail);
router.get("/verify-token", authController_1.verifyToken);
router.post("/ping", authController_1.ping);
// NOTE: Admin routes are defined in a separate file: admin.ts
exports.default = router;
//# sourceMappingURL=auth.js.map