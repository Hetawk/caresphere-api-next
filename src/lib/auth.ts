/**
 * Authentication utilities — JWT creation/verification, password hashing.
 * Mirrors caresphere-api/app/utils/security.py
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "@/lib/config";

// ─── Password ────────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, config.BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string; // user ID
  email: string;
  role: string;
  type: "access" | "refresh";
  iat?: number;
  exp?: number;
}

export function createAccessToken(
  userId: string,
  email: string,
  role: string,
): string {
  const payload: Omit<JwtPayload, "iat" | "exp"> = {
    sub: userId,
    email,
    role,
    type: "access",
  };
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
}

export function createRefreshToken(userId: string): string {
  const payload = { sub: userId, type: "refresh" };
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN,
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.JWT_SECRET) as JwtPayload;
}

// ─── OTP / Codes ─────────────────────────────────────────────────────────────

/** Generate a 6-digit numeric code (for email verification / password reset). */
export function generateSixDigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** Generate a 7-character alphanumeric organization code. */
export function generateOrgCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 7 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length)),
  ).join("");
}
