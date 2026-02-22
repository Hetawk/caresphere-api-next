import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { NotFoundError } from "@/lib/errors";
import { getRequestUser } from "@/lib/request";
import { getUserOrganization } from "@/services/organization.service";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const org = await getUserOrganization(currentUser.id);
  if (!org) throw new NotFoundError("Organization");
  return successResponse(org);
});
