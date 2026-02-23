/**
 * Request helpers — extract JWT from Authorization header and return the decoded payload.
 * Mirrors caresphere-api/app/api/deps.py
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, JwtPayload } from "@/lib/auth";
import { AuthenticationError, AuthorizationError } from "@/lib/errors";
import { UserRole } from "@prisma/client";

export async function getRequestUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthenticationError("Missing or invalid Authorization header");
  }
  const token = authHeader.slice(7);

  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new AuthenticationError("Invalid or expired token");
  }

  if (payload.type !== "access") {
    throw new AuthenticationError("Refresh token cannot be used for requests");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw new AuthenticationError("User account not found");
  if (user.status !== "ACTIVE") {
    throw new AuthenticationError("User account is not active");
  }

  return user;
}

/**
 * Require at least one of the given roles.
 * KINGDOM_SUPER_ADMIN always passes — they are the platform owner and have
 * unrestricted access across all organisations and all routes.
 */
export async function requireRoles(req: NextRequest, ...roles: UserRole[]) {
  const user = await getRequestUser(req);
  // Platform owner bypasses all role gates
  if (user.role === UserRole.KINGDOM_SUPER_ADMIN) return user;
  if (!roles.includes(user.role)) {
    throw new AuthorizationError(
      `Role '${user.role}' is not permitted. Required: ${roles.join(", ")}`,
    );
  }
  return user;
}

/**
 * Require the caller to be the KINGDOM_SUPER_ADMIN.
 * Use this for platform-level routes that should never be accessible to
 * regular org admins.
 */
export async function requireKingdomAdmin(req: NextRequest) {
  const user = await getRequestUser(req);
  if (user.role !== UserRole.KINGDOM_SUPER_ADMIN) {
    throw new AuthorizationError("Platform-level access required");
  }
  return user;
}

export const MANAGER_ROLES: UserRole[] = [
  UserRole.KINGDOM_SUPER_ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MINISTRY_LEADER,
  UserRole.VOLUNTEER,
];

export const ADMIN_ROLES: UserRole[] = [
  UserRole.KINGDOM_SUPER_ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
];
