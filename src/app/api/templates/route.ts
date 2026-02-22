import { NextRequest } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { ValidationError } from "@/lib/errors";
import { getRequestUser } from "@/lib/request";
import { parsePaginationParams, paginationMeta } from "@/lib/pagination";
import { listTemplates, createTemplate } from "@/services/template.service";
import { TemplateType } from "@prisma/client";

const createSchema = z.object({
  name: z.string().min(1),
  subject: z.string().optional(),
  content: z.string().min(1),
  templateType: z.nativeEnum(TemplateType).optional(),
  variables: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  await getRequestUser(req);
  const sp = req.nextUrl.searchParams;
  const { page, limit } = parsePaginationParams(sp);
  const type = sp.get("type") as TemplateType | null;
  const search = sp.get("search") ?? undefined;

  const { items, total } = await listTemplates({
    page,
    limit,
    templateType: type ?? undefined,
    search,
  });

  return successResponse(items, { metadata: paginationMeta(total, page, limit) });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError(parsed.error.message);

  const template = await createTemplate(parsed.data, currentUser.id);
  return successResponse(template, { status: 201 });
});
