import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { prisma } from "@/lib/prisma";

export async function GET() {
  let dbStatus = "healthy";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "unreachable";
  }

  const status = dbStatus === "healthy" ? 200 : 503;

  return NextResponse.json(
    {
      success: dbStatus === "healthy",
      data: {
        status: dbStatus === "healthy" ? "healthy" : "degraded",
        app: config.APP_NAME,
        version: config.APP_VERSION,
        database: dbStatus,
        timestamp: new Date().toISOString(),
      },
    },
    { status },
  );
}
