import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/** Add a logo image URL (hosted or static) */
const LOGO_URL =
  "https://raw.githubusercontent.com/facebook/docusaurus/main/website/static/img/docusaurus.png"; // Replace with your logo

export const sendVerificationEmail = async (email: string, token: string) => {
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const verificationLink = `${baseUrl}/verify-email?token=${token}`;

  const mailOptions = {
    from: `"DokuAI" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Verify your DokuAI account",
    html: `
      <div style="background:#f6f8fa;padding:32px 0;min-height:100vh;font-family:'Poppins',Arial,sans-serif;">
        <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:18px;box-shadow:0 4px 24px rgba(20,30,60,0.10);padding:32px 24px 24px 24px;">
          <div style="text-align:center;margin-bottom:24px;">
            <img src="${LOGO_URL}" alt="DokuAI Logo" style="width:56px;height:56px;border-radius:12px;box-shadow:0 2px 8px rgba(59,130,246,0.10);margin-bottom:8px;"/>
            <h2 style="color:#2e8555;margin:0;font-size:2rem;font-weight:700;">Welcome to DokuAI!</h2>
          </div>
          <p style="color:#232946;font-size:1.1rem;">Thank you for registering with DokuAI. Please verify your email address by clicking the button below:</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${verificationLink}" style="background:linear-gradient(90deg,#2e8555 0%,#25c2a0 100%);color:#fff;padding:14px 36px;text-decoration:none;border-radius:10px;font-size:1.1rem;font-weight:600;box-shadow:0 4px 16px rgba(46,133,85,0.10);display:inline-block;">Verify Email</a>
          </div>
          <p style="color:#232946;font-size:1rem;">If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break:break-all;color:#888;font-size:0.98rem;background:#f6f8fa;padding:8px 12px;border-radius:8px;">${verificationLink}</p>
          <p style="color:#888;font-size:0.98rem;">This link will expire in 24 hours.</p>
          <p style="color:#888;font-size:0.98rem;">If you didn't create an account with DokuAI, you can safely ignore this email.</p>
        </div>
        <div style="text-align:center;margin-top:32px;color:#b3b3b3;font-size:0.95rem;">
          &copy; ${new Date().getFullYear()} DokuAI. All rights reserved.
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send verification email to ${email}:`, error);
    throw error;
  }
};

export const sendResetEmail = async (email: string, resetLink: string) => {
  const mailOptions = {
    from: `"DokuAI" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Reset your DokuAI password",
    html: `
      <div style="background:#f6f8fa;padding:32px 0;min-height:100vh;font-family:'Poppins',Arial,sans-serif;">
        <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:18px;box-shadow:0 4px 24px rgba(20,30,60,0.10);padding:32px 24px 24px 24px;">
          <div style="text-align:center;margin-bottom:24px;">
            <img src="${LOGO_URL}" alt="DokuAI Logo" style="width:56px;height:56px;border-radius:12px;box-shadow:0 2px 8px rgba(220,53,69,0.10);margin-bottom:8px;"/>
            <h2 style="color:#dc3545;margin:0;font-size:2rem;font-weight:700;">Password Reset Request</h2>
          </div>
          <p style="color:#232946;font-size:1.1rem;">You requested a password reset for your DokuAI account. Click the button below to reset your password:</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${resetLink}" style="background:linear-gradient(90deg,#dc3545 0%,#ff6f61 100%);color:#fff;padding:14px 36px;text-decoration:none;border-radius:10px;font-size:1.1rem;font-weight:600;box-shadow:0 4px 16px rgba(220,53,69,0.10);display:inline-block;">Reset Password</a>
          </div>
          <p style="color:#232946;font-size:1rem;">If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break:break-all;color:#888;font-size:0.98rem;background:#f6f8fa;padding:8px 12px;border-radius:8px;">${resetLink}</p>
          <p style="color:#888;font-size:0.98rem;">This link will expire in 1 hour.</p>
          <p style="color:#888;font-size:0.98rem;">If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
        <div style="text-align:center;margin-top:32px;color:#b3b3b3;font-size:0.95rem;">
          &copy; ${new Date().getFullYear()} DokuAI. All rights reserved.
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Reset email sent to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send reset email to ${email}:`, error);
    throw error;
  }
};

export const sendPasswordChangedEmail = async (email: string) => {
  const mailOptions = {
    from: `"DokuAI" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Your DokuAI password has been changed",
    html: `
      <div style="background:#f6f8fa;padding:32px 0;min-height:100vh;font-family:'Poppins',Arial,sans-serif;">
        <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:18px;box-shadow:0 4px 24px rgba(20,30,60,0.10);padding:32px 24px 24px 24px;">
          <div style="text-align:center;margin-bottom:24px;">
            <img src="${LOGO_URL}" alt="DokuAI Logo" style="width:56px;height:56px;border-radius:12px;box-shadow:0 2px 8px rgba(46,133,85,0.10);margin-bottom:8px;"/>
            <h2 style="color:#2e8555;margin:0;font-size:2rem;font-weight:700;">Password Changed Successfully</h2>
          </div>
          <p style="color:#232946;font-size:1.1rem;">Your DokuAI account password has been successfully changed.</p>
          <p style="color:#232946;font-size:1rem;">If you didn't make this change, please contact our support team immediately.</p>
          <p style="color:#232946;font-size:1rem;">Thank you for using DokuAI!</p>
        </div>
        <div style="text-align:center;margin-top:32px;color:#b3b3b3;font-size:0.95rem;">
          &copy; ${new Date().getFullYear()} DokuAI. All rights reserved.
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Password change notification sent to ${email}`);
  } catch (error) {
    console.error(
      `❌ Failed to send password change notification to ${email}:`,
      error
    );
    throw error;
  }
};
