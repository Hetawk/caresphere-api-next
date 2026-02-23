/**
 * Auth service — user registration, login, token management, password reset.
 * TypeScript port of caresphere-api/app/services/auth_service.py
 */

import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  verifyPassword,
  createAccessToken,
  createRefreshToken,
  generateSixDigitCode,
} from "@/lib/auth";
import {
  AuthenticationError,
  ConflictError,
  ValidationError,
} from "@/lib/errors";
import { UserRole, UserStatus } from "@prisma/client";
import { config } from "@/lib/config";
import { transactionalEmail } from "@/services/email/transactional.service";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ─── Registration ─────────────────────────────────────────────────────────────

/**
 * Step 1: Generate and store a 6-digit verification code for an email.
 * Mirrors generate_registration_verification_code().
 */
export async function generateRegistrationCode(email: string): Promise<string> {
  const normalizedEmail = email.toLowerCase();

  // Check if real user already exists
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing && existing.passwordHash !== "UNVERIFIED") {
    if (existing.status === "ACTIVE") {
      // Allow re-registration for users stuck in partial state (no org assigned yet).
      // This happens when completeRegistration succeeded but org creation/join failed.
      if (existing.organizationId) {
        throw new ConflictError(
          "This email is already registered. Please login instead.",
        );
      }
      // else: partial registration — fall through and regenerate the OTP
    } else {
      throw new ConflictError(
        "This email is already registered but not active. Please contact support.",
      );
    }
  }

  const code = generateSixDigitCode();
  const codeHash = await hashPassword(code);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  // Upsert EmailVerification record
  await prisma.emailVerification.deleteMany({
    where: { email: normalizedEmail },
  });
  await prisma.emailVerification.create({
    data: { email: normalizedEmail, codeHash, expiresAt, verified: false },
  });

  return code;
}

/** Verify a registration OTP code. */
export async function verifyRegistrationCode(
  email: string,
  code: string,
): Promise<void> {
  const normalizedEmail = email.toLowerCase();
  const record = await prisma.emailVerification.findFirst({
    where: { email: normalizedEmail, verified: false },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw new ValidationError({
      code: "No verification code found. Please request a new code.",
    });
  }
  if (record.expiresAt < new Date()) {
    throw new ValidationError({
      code: "Verification code has expired. Please request a new code.",
    });
  }
  const valid = await verifyPassword(code, record.codeHash);
  if (!valid) {
    throw new ValidationError({ code: "Invalid verification code." });
  }

  await prisma.emailVerification.update({
    where: { id: record.id },
    data: { verified: true },
  });
}

/**
 * Step 2: Complete registration after verification — creates the real user.
 * Mirrors complete_registration_with_verification().
 */
export async function completeRegistration(payload: {
  email: string;
  code: string;
  firstName: string;
  lastName?: string;
  password: string;
  phone?: string;
  displayName?: string;
}) {
  await verifyRegistrationCode(payload.email, payload.code);

  const normalizedEmail = payload.email.toLowerCase();
  const passwordHash = await hashPassword(payload.password);

  // Upsert — replace any temp "UNVERIFIED" row or create fresh
  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    create: {
      email: normalizedEmail,
      passwordHash,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone,
      displayName: payload.displayName,
      emailVerified: true,
      status: UserStatus.ACTIVE,
      role: UserRole.ADMIN,
    },
    update: {
      passwordHash,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone,
      displayName: payload.displayName,
      emailVerified: true,
      status: UserStatus.ACTIVE,
      role: UserRole.ADMIN,
    },
  });

  // Clean up verification record
  await prisma.emailVerification.deleteMany({
    where: { email: normalizedEmail },
  });

  return user;
}

/** Simple register (no verification code required — for admin-created accounts). */
export async function createUser(payload: {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  displayName?: string;
  role?: UserRole;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: payload.email.toLowerCase() },
  });
  if (existing) throw new ConflictError("User with this email already exists");

  return prisma.user.create({
    data: {
      email: payload.email.toLowerCase(),
      passwordHash: await hashPassword(payload.password),
      firstName: payload.firstName,
      lastName: payload.lastName,
      displayName: payload.displayName,
      role: payload.role ?? UserRole.ADMIN,
      emailVerified: false,
    },
  });
}

// ─── Authentication ───────────────────────────────────────────────────────────

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new AuthenticationError("Incorrect email or password");
  }
  if (user.status !== UserStatus.ACTIVE) {
    throw new AuthenticationError("Account is not active");
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return user;
}

export function issueTokens(user: {
  id: string;
  email: string;
  role: UserRole;
}): TokenSet {
  return {
    accessToken: createAccessToken(user.id, user.email, user.role),
    refreshToken: createRefreshToken(user.id),
    expiresIn: config.JWT_EXPIRES_IN,
  };
}

// ─── Password Reset ───────────────────────────────────────────────────────────

export async function initiatePasswordReset(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user) {
    throw new ValidationError({
      email: "No user found with this email address",
    });
  }

  const token = generateSixDigitCode();
  const tokenHash = await hashPassword(token);
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetTokenHash: tokenHash, resetTokenExpires: expires },
  });

  return { user, token };
}

export async function resetPasswordWithToken(
  email: string,
  token: string,
  newPassword: string,
) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user) throw new ValidationError({ email: "Invalid email or token" });

  if (!user.resetTokenHash || !user.resetTokenExpires) {
    throw new ValidationError({
      token: "No password reset requested for this account",
    });
  }
  if (user.resetTokenExpires < new Date()) {
    throw new ValidationError({ token: "Password reset token has expired" });
  }
  if (!(await verifyPassword(token, user.resetTokenHash))) {
    throw new ValidationError({ token: "Invalid or expired token" });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      resetTokenHash: null,
      resetTokenExpires: null,
    },
  });

  // Fire-and-forget security notice — don't block response if email fails
  transactionalEmail
    .sendPasswordChangedEmail(updated.email, updated.firstName, "reset")
    .catch(() => {});

  return updated;
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AuthenticationError("User not found");
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new AuthenticationError("Current password is incorrect");
  }
  if (currentPassword === newPassword) {
    throw new ValidationError({
      newPassword: "New password must be different from current",
    });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  // Fire-and-forget security notice
  transactionalEmail
    .sendPasswordChangedEmail(updated.email, updated.firstName, "change")
    .catch(() => {});

  return updated;
}
