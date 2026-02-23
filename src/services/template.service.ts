/**
 * Template service — CRUD for message templates.
 * TypeScript port of caresphere-api/app/services/template_service.py
 */

import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import { TemplateType, Prisma } from "@prisma/client";
import { toPrismaPage } from "@/lib/pagination";

export async function listTemplates(opts: {
  page: number;
  limit: number;
  templateType?: TemplateType;
  category?: string;
  search?: string;
}) {
  const where: Prisma.TemplateWhereInput = { isActive: true };
  if (opts.templateType) where.templateType = opts.templateType;
  if (opts.category) where.category = opts.category;
  if (opts.search) {
    where.OR = [
      { name: { contains: opts.search, mode: "insensitive" } },
      { subject: { contains: opts.search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await prisma.$transaction([
    prisma.template.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...toPrismaPage(opts.page, opts.limit),
    }),
    prisma.template.count({ where }),
  ]);

  return { items, total };
}

export async function getTemplate(id: string) {
  const t = await prisma.template.findUnique({ where: { id } });
  if (!t) throw new NotFoundError("Template");
  return t;
}

export async function createTemplate(
  data: {
    name: string;
    description?: string;
    templateType?: TemplateType;
    category?: string;
    subject?: string;
    content: string;
    variables?: string | string[];
    tags?: string[];
    thumbnailUrl?: string;
  },
  createdBy: string,
) {
  const { variables, tags: _tags, ...rest } = data;
  const variablesStr = Array.isArray(variables)
    ? JSON.stringify(variables)
    : variables;
  return prisma.template.create({
    data: {
      ...rest,
      variables: variablesStr,
      templateType: data.templateType ?? TemplateType.EMAIL,
      createdBy,
    },
  });
}

export async function updateTemplate(
  id: string,
  data: {
    name?: string;
    description?: string;
    category?: string;
    subject?: string;
    content?: string;
    variables?: string | string[];
    tags?: string[];
    thumbnailUrl?: string;
    isActive?: boolean;
  },
) {
  await getTemplate(id);
  const { variables, tags: _tags, ...rest } = data;
  const variablesStr = Array.isArray(variables)
    ? JSON.stringify(variables)
    : variables;
  return prisma.template.update({
    where: { id },
    data: { ...rest, variables: variablesStr },
  });
}

export async function deleteTemplate(id: string) {
  await getTemplate(id);
  return prisma.template.update({ where: { id }, data: { isActive: false } });
}
