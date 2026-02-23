import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { validate } from "@/lib/validate";
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
    const currentUser = await getRequestUser(req);
    const body = validate(updateSchema, await req.json());
    const { template, forked } = await updateTemplate(id, body, {
      userId: currentUser.id,
      organizationId: currentUser.organizationId ?? undefined,
    });
    // If the system template was forked, return 201 with the new org-copy
    return successResponse(
      { ...template, _forked: forked },
      { status: forked ? 201 : 200 },
    );
  },
);

export const PATCH = withErrorHandling(
  async (req: NextRequest, ctx: RouteParams) => {
    const { id } = await ctx.params;
    const currentUser = await getRequestUser(req);
    const body = validate(updateSchema, await req.json());
    const { template, forked } = await updateTemplate(id, body, {
      userId: currentUser.id,
      organizationId: currentUser.organizationId ?? undefined,
    });
    // If forked: 201 with new ID so the client can update its local state
    return successResponse(
      { ...template, _forked: forked },
      { status: forked ? 201 : 200 },
    );
  },
);

export const DELETE = withErrorHandling(
  async (req: NextRequest, ctx: RouteParams) => {
    const { id } = await ctx.params;
    const currentUser = await getRequestUser(req);
    await deleteTemplate(id, {
      organizationId: currentUser.organizationId ?? undefined,
    });
    return successResponse({ message: "Template deleted" });
  },
);
