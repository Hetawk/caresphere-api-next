import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { ValidationError } from "@/lib/errors";
import { getRequestUser } from "@/lib/request";
import {
  getMember,
  updateMember,
  deleteMember,
} from "@/services/member.service";
import { MemberStatus } from "@prisma/client";

const updateSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "ORGANIZATION"]).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  memberStatus: z.nativeEnum(MemberStatus).optional(),
  membershipType: z.string().optional(),
  joinDate: z.string().optional(),
  photoUrl: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export const GET = withErrorHandling(
  async (_req: NextRequest, ctx: RouteParams) => {
    const { id } = await ctx.params;
    const member = await getMember(id);
    return successResponse(member);
  },
);

export const PUT = withErrorHandling(
  async (req: NextRequest, ctx: RouteParams) => {
    const { id } = await ctx.params;
    await getRequestUser(req);
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const member = await updateMember(id, parsed.data);
    return successResponse(member);
  },
);

export const DELETE = withErrorHandling(
  async (req: NextRequest, ctx: RouteParams) => {
    const { id } = await ctx.params;
    await getRequestUser(req);
    await deleteMember(id);
    return successResponse({ message: "Member deleted" });
  },
);
