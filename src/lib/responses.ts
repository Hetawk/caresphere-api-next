/**
 * Standardized API response helpers.
 * Mirrors caresphere-api/app/utils/responses.py — every response has
 * a `success`, optional `data`, optional `error`, and optional `metadata` envelope.
 */

import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: Record<string, string>;
  };
  metadata?: Record<string, unknown>;
}

/** Return a 2xx success response. */
export function successResponse<T>(
  data: T,
  options?: { status?: number; metadata?: Record<string, unknown> },
): NextResponse<ApiResponse<T>> {
  const body: ApiResponse<T> = { success: true, data };
  if (options?.metadata) body.metadata = options.metadata;
  return NextResponse.json(body, { status: options?.status ?? 200 });
}

/** Return an error response derived from an AppError or a generic Error. */
export function errorResponse(err: unknown): NextResponse<ApiResponse<never>> {
  if (err instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: err.message,
          code: err.code,
          details: err.details,
        },
      },
      { status: err.statusCode },
    );
  }

  const message =
    err instanceof Error ? err.message : "An unexpected error occurred";

  return NextResponse.json(
    { success: false, error: { message, code: "INTERNAL_ERROR" } },
    { status: 500 },
  );
}
