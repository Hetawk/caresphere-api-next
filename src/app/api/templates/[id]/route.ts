import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { ValidationError } from "@/lib/errors";
import { getRequestUser } from "@/lib/request";
import {
  getTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/services/template.service";
import { TemplateType } from "@prisma/client";

const updateSchema = z.object({
  name: z.string().optional(),
  subject: z.string().optional(),
  content: z.string().optional(),
  templateType: z.nativeEnum(TemplateType).optional(),
  variables: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export const GET = withErrorHandling(
  async (_req: NextRequest, ctx: RouteParams) => {
    const { id } = await ctx.params;
    const template = await getTemplate(id);
    return successResponse(template);
  },
);

export const PUT = withErrorHandling(
  async (req: NextRequest, ctx: RouteParams) => {
    const { id } = await ctx.params;
    await getRequestUser(req);
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) throw new ValidationError(parsed.error.message);

    const template = await updateTemplate(id, parsed.data);
    return successResponse(template);
  },
);

export const DELETE = withErrorHandling(
  async (req: NextRequest, ctx: RouteParams) => {
    const { id } = await ctx.params;
    await getRequestUser(req);
    await deleteTemplate(id);
    return successResponse({ message: "Template deleted" });
  },
);
