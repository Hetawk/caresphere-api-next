import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { ValidationError } from "@/lib/errors";
import { getRequestUser } from "@/lib/request";
import { createOrganization } from "@/services/organization.service";

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  website: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.message);

  const org = await createOrganization(parsed.data, currentUser.id);
  return successResponse(org, { status: 201 });
});
