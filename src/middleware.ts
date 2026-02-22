/**
 * Next.js Middleware — CORS + public/protected route gating.
 *
 * Protected routes require a valid Bearer JWT in the Authorization header.
 * Public routes (auth + health) are exempted.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { config as appConfig } from "@/lib/config";

// Routes that do NOT require authentication
const PUBLIC_PREFIXES = [
  "/api/auth/send-verification-code",
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/health",
  "/api", // root health check (exact)
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
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

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: cors });
  }

  // Inject CORS headers into all responses
  const response = NextResponse.next();
  Object.entries(cors).forEach(([k, v]) => response.headers.set(k, v));

  // Skip auth check for public routes
  if (isPublic(pathname)) return response;

  // Validate JWT for protected routes
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
