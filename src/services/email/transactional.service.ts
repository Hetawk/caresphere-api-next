/**
 * Transactional email service — welcome, verification, password reset, notifications.
 * TypeScript port of caresphere-api/app/services/transactional_email_service.py
 * Uses the same HTML templates and EKDSend API.
 */

import { config } from "@/lib/config";
import { ekdSend } from "./email.service";

// ─── Email Template Helpers ──────────────────────────────────────────────────

function emailHeader(): string {
  const logoUrl = `${config.API_BASE_URL}/static/images/logo.png`;
  return `
  <div style="text-align:center;padding:20px 0;border-bottom:1px solid #eee;margin-bottom:20px;">
    <img src="${logoUrl}" alt="${config.APP_NAME}" style="max-width:150px;height:auto;" />
  </div>`;
}

function emailFooter(): string {
  return `
  <div style="margin-top:40px;padding-top:20px;border-top:1px solid #eee;text-align:center;color:#666;font-size:12px;">
    <p>&copy; ${new Date().getFullYear()} ${config.APP_NAME}. All rights reserved.</p>
    <p>This email was sent by ${config.APP_NAME}. If you have questions, please contact us.</p>
  </div>`;
}

function wrapEmailBody(content: string): string {
  return `
  <html>
  <body style="font-family:'Segoe UI',Arial,sans-serif;line-height:1.6;color:#333;background-color:#f9fafb;margin:0;padding:0;">
    <div style="max-width:600px;margin:0 auto;padding:20px;background-color:#ffffff;">
      ${emailHeader()}
      ${content}
      ${emailFooter()}
    </div>
  </body>
  </html>`;
}

// ─── Transactional Service ────────────────────────────────────────────────────

class TransactionalEmailService {
  private readonly fromEmail = config.MSG_SENDER_EMAIL;

  /** Welcome email sent after successful registration. */
  async sendWelcomeEmail(
    to: string,
    userName: string,
    loginUrl?: string,
  ): Promise<void> {
    const subject = `Welcome to ${config.APP_NAME}!`;
    const actionButton = loginUrl
      ? `<p style="text-align:center;"><a href="${loginUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">Get Started</a></p>`
      : "";

    const content = `
      <h1 style="color:#2563eb;margin-bottom:20px;">Welcome to ${config.APP_NAME}!</h1>
      <p>Hi ${userName},</p>
      <p>Thank you for joining ${config.APP_NAME}! We're excited to have you as part of our community.</p>
      <ul>
        <li>Stay connected with your community</li>
        <li>Receive important updates and announcements</li>
        <li>Access resources and information</li>
      </ul>
      ${actionButton}
      <p>If you have any questions, feel free to reach out to us.</p>
      <p>Best regards,<br>The ${config.APP_NAME} Team</p>`;

    await ekdSend.sendEmail(to, subject, wrapEmailBody(content), {
      from: this.fromEmail,
    });
  }

  /** Password reset email with 6-digit token. */
  async sendPasswordResetEmail(
    to: string,
    userName: string,
    resetToken: string,
    expiresInHours = 1,
  ): Promise<void> {
    const subject = `Reset Your ${config.APP_NAME} Password`;
    const content = `
      <h1 style="color:#2563eb;margin-bottom:20px;">Password Reset Request</h1>
      <p>Hi ${userName},</p>
      <p>We received a request to reset your ${config.APP_NAME} password. Your reset code is:</p>
      <div style="text-align:center;margin:30px 0;">
        <div style="display:inline-block;background:#f3f4f6;padding:20px 40px;border-radius:8px;font-size:32px;font-weight:bold;letter-spacing:8px;color:#2563eb;">
          ${resetToken}
        </div>
      </div>
      <p style="color:#666;font-size:14px;">This code will expire in ${expiresInHours} hour(s).</p>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
      <p>Best regards,<br>The ${config.APP_NAME} Team</p>`;

    await ekdSend.sendEmail(to, subject, wrapEmailBody(content), {
      from: this.fromEmail,
    });
  }

  /** Verification code email for registration. */
  async sendVerificationCodeEmail(
    to: string,
    userName: string,
    verificationCode: string,
    expiresInMinutes = 15,
  ): Promise<void> {
    const subject = `Your ${config.APP_NAME} Verification Code`;
    const content = `
      <h1 style="color:#2563eb;margin-bottom:20px;">Verification Code</h1>
      <p>Hi ${userName},</p>
      <p>Your verification code is:</p>
      <div style="text-align:center;margin:30px 0;">
        <div style="display:inline-block;background:#f3f4f6;padding:20px 40px;border-radius:8px;font-size:32px;font-weight:bold;letter-spacing:8px;color:#2563eb;">
          ${verificationCode}
        </div>
      </div>
      <p style="color:#666;font-size:14px;">This code will expire in ${expiresInMinutes} minutes.</p>
      <p>If you didn't request this code, please ignore this email.</p>
      <p>Best regards,<br>The ${config.APP_NAME} Team</p>`;

    await ekdSend.sendEmail(to, subject, wrapEmailBody(content), {
      from: this.fromEmail,
    });
  }

  /** General notification email with optional CTA button. */
  async sendNotificationEmail(
    to: string,
    userName: string,
    title: string,
    message: string,
    actionUrl?: string,
    actionText?: string,
  ): Promise<void> {
    const subject = `${title} — ${config.APP_NAME}`;
    const cta =
      actionUrl && actionText
        ? `<p style="text-align:center;margin:30px 0;"><a href="${actionUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;">${actionText}</a></p>`
        : "";

    const content = `
      <h1 style="color:#2563eb;margin-bottom:20px;">${title}</h1>
      <p>Hi ${userName},</p>
      <div style="margin:20px 0;">${message}</div>
      ${cta}
      <p>Best regards,<br>The ${config.APP_NAME} Team</p>`;

    await ekdSend.sendEmail(to, subject, wrapEmailBody(content), {
      from: this.fromEmail,
    });
  }
}

/** Singleton — import this and call methods directly. */
export const transactionalEmail = new TransactionalEmailService();
