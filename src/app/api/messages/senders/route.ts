import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { validate } from "@/lib/validate";
import { getRequestUser } from "@/lib/request";
import {
  listSenderProfiles,
  createSenderProfile,
} from "@/services/message.service";
import { getUserOrganization } from "@/services/organization.service";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const org = await getUserOrganization(currentUser.id);
  const profiles = await listSenderProfiles(org?.id);
  return successResponse(profiles);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const org = await getUserOrganization(currentUser.id);
  const profile = await createSenderProfile(
    validate(createSchema, await req.json()),
    currentUser.id,
    org?.id,
  );
  return successResponse(profile, { status: 201 });
});
