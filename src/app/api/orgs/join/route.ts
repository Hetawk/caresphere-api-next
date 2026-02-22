import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { validate, orgCodeSchema } from "@/lib/validate";
import { getRequestUser } from "@/lib/request";
import { joinOrganization } from "@/services/organization.service";

const schema = z.object({ code: orgCodeSchema });

/** POST /api/orgs/join — Join an organisation with a 7-digit code */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const { code } = validate(schema, await req.json());
  const org = await joinOrganization(code, currentUser.id);
  return successResponse(org);
});
