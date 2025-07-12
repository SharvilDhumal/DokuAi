"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordChangedEmail = exports.sendResetEmail = exports.sendVerificationEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
const sendVerificationEmail = async (email, token) => {
    const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const verificationLink = `${baseUrl}/verify-email?token=${token}`;
    const mailOptions = {
        from: `"DokuAI" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Verify your DokuAI account",
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to DokuAI!</h2>
        <p>Thank you for registering with DokuAI. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationLink}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account with DokuAI, you can safely ignore this email.</p>
      </div>
    `,
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Verification email sent to ${email}`);
    }
    catch (error) {
        console.error(`❌ Failed to send verification email to ${email}:`, error);
        throw error;
    }
};
exports.sendVerificationEmail = sendVerificationEmail;
const sendResetEmail = async (email, resetLink) => {
    const mailOptions = {
        from: `"DokuAI" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Reset your DokuAI password",
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You requested a password reset for your DokuAI account. Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetLink}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    `,
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Reset email sent to ${email}`);
    }
    catch (error) {
        console.error(`❌ Failed to send reset email to ${email}:`, error);
        throw error;
    }
};
exports.sendResetEmail = sendResetEmail;
const sendPasswordChangedEmail = async (email) => {
    const mailOptions = {
        from: `"DokuAI" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Your DokuAI password has been changed",
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Changed Successfully</h2>
        <p>Your DokuAI account password has been successfully changed.</p>
        <p>If you didn't make this change, please contact our support team immediately.</p>
        <p>Thank you for using DokuAI!</p>
      </div>
    `,
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Password change notification sent to ${email}`);
    }
    catch (error) {
        console.error(`❌ Failed to send password change notification to ${email}:`, error);
        throw error;
    }
};
exports.sendPasswordChangedEmail = sendPasswordChangedEmail;
//# sourceMappingURL=emailService.js.map