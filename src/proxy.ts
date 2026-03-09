/**
 * Next.js Proxy (replaces middleware in Next.js 16) — CORS + API auth gating.
 *
 * Protected routes require a valid Bearer JWT in the Authorization header.
 * Public routes (auth + health + explicit test endpoints) are exempted.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { config as appConfig } from "@/lib/config";

const PUBLIC_PREFIXES = [
  "/api/auth/send-verification-code",
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/health",
  "/api/bible/test",
  "/api",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = appConfig.allowedOrigins;
  const allowedOrigin =
    origin && allowed.includes(origin) ? origin : (allowed[0] ?? "*");

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: cors });
  }

  const response = NextResponse.next();
  Object.entries(cors).forEach(([key, value]) =>
    response.headers.set(key, value),
  );

  if (isPublic(pathname)) return response;

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { success: false, error: "Authorization header required" },
      { status: 401, headers: cors },
    );
  }

  try {
    verifyToken(authHeader.slice(7));
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid or expired token" },
      { status: 401, headers: cors },
    );
  }

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
