import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { NotFoundError } from "@/lib/errors";
import { getRequestUser, requireRoles } from "@/lib/request";
import { getUserOrganization, regenerateCode } from "@/services/organization.service";
import { UserRole } from "@prisma/client";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await requireRoles(req, UserRole.SUPER_ADMIN, UserRole.ADMIN);
  const org = await getUserOrganization(currentUser.id);
  if (!org) throw new NotFoundError("Organization");

  const newCode = await regenerateCode(org.id);
  return successResponse({ joinCode: newCode });
});
