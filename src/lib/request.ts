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

/** Require at least one of the given roles. */
export async function requireRoles(req: NextRequest, ...roles: UserRole[]) {
  const user = await getRequestUser(req);
  if (!roles.includes(user.role)) {
    throw new AuthorizationError(
      `Role '${user.role}' is not permitted. Required: ${roles.join(", ")}`,
    );
  }
  return user;
}

export const MANAGER_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.MINISTRY_LEADER,
  UserRole.VOLUNTEER,
];

export const ADMIN_ROLES: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];
