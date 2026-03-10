/**
 * Prisma client singleton — using @prisma/adapter-pg for Prisma 7 client engine.
 * Prevents multiple instances during hot-reloading in development.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "@/lib/config";

function createPrismaClient() {
  const adapter = new PrismaPg(
    {
      connectionString: config.DATABASE_URL,
      max: config.DATABASE_POOL_MAX,
      idleTimeoutMillis: config.DATABASE_POOL_IDLE_MS,
      connectionTimeoutMillis: config.DATABASE_POOL_CONN_TIMEOUT_MS,
      // CRITICAL for serverless: release connections as soon as the worker goes
      // idle between requests.  Without this, every warm Vercel worker holds a
      // connection open permanently, quickly exhausting Postgres max_connections.
      allowExitOnIdle: true,
    },
    {
      onPoolError: (err) => {
        console.error("Prisma PG pool error", err);
      },
      onConnectionError: (err) => {
        console.error("Prisma PG connection error", err);
      },
    },
  );
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
