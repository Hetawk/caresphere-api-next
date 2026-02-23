/**
 * Seed: KINGDOM_SUPER_ADMIN
 * ─────────────────────────────────────────────────────────────────────────────
 * Ensures ekd@ekddigital.com exists in the database with the KINGDOM_SUPER_ADMIN
 * platform role. This is the EKD Digital developer / platform God-mode account.
 *
 * Safe to run multiple times — it upserts, never duplicates.
 *
 * Usage:
 *   npx tsx scripts/seed_kingdom_admin.ts
 *   -- or --
 *   ts-node -r tsconfig-paths/register scripts/seed_kingdom_admin.ts
 */

import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const KINGDOM_EMAIL = "ekd@ekddigital.com";
const KINGDOM_FIRST = "EKD";
const KINGDOM_LAST = "Digital";

async function main() {
  const DEFAULT_PASSWORD = process.env.KINGDOM_ADMIN_PASSWORD;
  if (!DEFAULT_PASSWORD) {
    console.error(
      "❌  KINGDOM_ADMIN_PASSWORD is not set in .env — refusing to seed without it.",
    );
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  const existing = await prisma.user.findUnique({
    where: { email: KINGDOM_EMAIL },
  });

  if (existing) {
    // Already exists — just make sure the role is correct
    if (existing.role !== UserRole.KINGDOM_SUPER_ADMIN) {
      await prisma.user.update({
        where: { email: KINGDOM_EMAIL },
        data: {
          role: UserRole.KINGDOM_SUPER_ADMIN,
          status: "ACTIVE",
          emailVerified: true,
        },
      });
      console.log(`✅  Updated ${KINGDOM_EMAIL} → KINGDOM_SUPER_ADMIN`);
    } else {
      console.log(`✓  ${KINGDOM_EMAIL} already has KINGDOM_SUPER_ADMIN role.`);
    }
    return;
  }

  // Create the platform admin account
  const user = await prisma.user.create({
    data: {
      email: KINGDOM_EMAIL,
      firstName: KINGDOM_FIRST,
      lastName: KINGDOM_LAST,
      passwordHash,
      role: UserRole.KINGDOM_SUPER_ADMIN,
      status: "ACTIVE",
      emailVerified: true,
    },
  });

  console.log(
    `✅  Created KINGDOM_SUPER_ADMIN: ${user.email} (id: ${user.id})`,
  );
  console.log(`⚠️   Update the password in Settings → My Profile after first login.`);
}

main()
  .catch((e) => {
    console.error("❌  Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
