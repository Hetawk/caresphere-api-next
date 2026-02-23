import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { requireRoles } from "@/lib/request";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

/** GET /api/admin/permissions — list all available permissions, grouped by category */
export const GET = withErrorHandling(async (req: NextRequest) => {
  await requireRoles(req, UserRole.SUPER_ADMIN, UserRole.ADMIN);

  const permissions = await prisma.permission.findMany({
    orderBy: [{ category: "asc" }, { displayName: "asc" }],
  });

  // Group by category for easier rendering in the UI
  const grouped = permissions.reduce<Record<string, typeof permissions>>(
    (acc, p) => {
      if (!acc[p.category]) acc[p.category] = [];
      acc[p.category].push(p);
      return acc;
    },
    {},
  );

  return successResponse({ permissions, grouped });
});
