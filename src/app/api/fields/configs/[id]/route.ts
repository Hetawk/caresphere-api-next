import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { ValidationError } from "@/lib/errors";
import { requireRoles } from "@/lib/request";
import {
  getFieldConfiguration,
  updateFieldConfiguration,
  deleteFieldConfiguration,
} from "@/services/field-config.service";
import { UserRole } from "@prisma/client";

const updateSchema = z.object({
  fieldLabel: z.string().optional(),
  isRequired: z.boolean().optional(),
  defaultValue: z.string().optional(),
  options: z.array(z.string()).optional(),
  displayOrder: z.number().int().optional(),
  description: z.string().optional(),
  placeholder: z.string().optional(),
  isVisible: z.boolean().optional(),
  isSearchable: z.boolean().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export const GET = withErrorHandling(
  async (req: NextRequest, ctx: RouteParams) => {
    const { id } = await ctx.params;
    await requireRoles(req, UserRole.SUPER_ADMIN, UserRole.ADMIN);
    const cfg = await getFieldConfiguration(id);
    return successResponse(cfg);
  },
);

export const PUT = withErrorHandling(
  async (req: NextRequest, ctx: RouteParams) => {
    const { id } = await ctx.params;
    await requireRoles(req, UserRole.SUPER_ADMIN, UserRole.ADMIN);
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const cfg = await updateFieldConfiguration(id, parsed.data);
    return successResponse(cfg);
  },
);

export const DELETE = withErrorHandling(
  async (req: NextRequest, ctx: RouteParams) => {
    const { id } = await ctx.params;
    await requireRoles(req, UserRole.SUPER_ADMIN, UserRole.ADMIN);
    await deleteFieldConfiguration(id);
    return successResponse({ message: "Field configuration deleted" });
  },
);
