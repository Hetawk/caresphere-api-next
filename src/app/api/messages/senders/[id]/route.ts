import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { ValidationError } from "@/lib/errors";
import { getRequestUser } from "@/lib/request";
import {
  updateSenderProfile,
  deleteSenderProfile,
} from "@/services/message.service";

const updateSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  isDefault: z.boolean().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export const PUT = withErrorHandling(
  async (req: NextRequest, ctx: RouteParams) => {
    const { id } = await ctx.params;
    await getRequestUser(req);
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const profile = await updateSenderProfile(id, parsed.data);
    return successResponse(profile);
  },
);

export const DELETE = withErrorHandling(
  async (req: NextRequest, ctx: RouteParams) => {
    const { id } = await ctx.params;
    await getRequestUser(req);
    await deleteSenderProfile(id);
    return successResponse({ message: "Sender profile deleted" });
  },
);
