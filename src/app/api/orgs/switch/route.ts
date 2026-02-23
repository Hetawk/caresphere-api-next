import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { validate } from "@/lib/validate";
import { getRequestUser } from "@/lib/request";
import { switchActiveOrganization } from "@/services/organization.service";

const schema = z.object({ organizationId: z.string().min(1) });

/** POST /api/orgs/switch — Switch the user's active organisation */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const { organizationId } = validate(schema, await req.json());
  const org = await switchActiveOrganization(currentUser.id, organizationId);
  return successResponse(org);
});
