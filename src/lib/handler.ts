/**
 * Route handler wrapper that catches AppError and returns formatted responses.
 * Keeps route files thin and DRY.
 */

import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/responses";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (req: NextRequest, ctx?: any) => Promise<NextResponse>;

export function withErrorHandling(handler: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}
