import { NextResponse } from "next/server";
import { config } from "@/lib/config";

export function GET() {
  return NextResponse.json({
    success: true,
    data: {
      status: "healthy",
      app: config.APP_NAME,
      version: config.APP_VERSION,
      timestamp: new Date().toISOString(),
    },
  });
}
