/**
 * Template service — org-scoped CRUD for message templates.
 *
 * System templates (organizationId = null, isSystemTemplate = true) are global
 * read-only defaults. When an org user edits one, we fork it into an org-owned
 * copy and leave the system original untouched.
 */

import { prisma } from "@/lib/prisma";
import { NotFoundError, AuthorizationError } from "@/lib/errors";
import { TemplateType, Prisma } from "@prisma/client";
import { toPrismaPage } from "@/lib/pagination";

export async function listTemplates(opts: {
  page: number;
  limit: number;
  organizationId?: string;
  templateType?: TemplateType;
  category?: string;
  search?: string;
}) {
  // Show org-owned templates + global system templates (orgId = null).
  const orgFilter: Prisma.TemplateWhereInput = opts.organizationId
    ? {
        OR: [
          { organizationId: opts.organizationId },
          { organizationId: null, isSystemTemplate: true },
        ],
      }
    : { organizationId: null, isSystemTemplate: true };

  let where: Prisma.TemplateWhereInput = { isActive: true, ...orgFilter };
  if (opts.templateType) where.templateType = opts.templateType;
  if (opts.category) where.category = opts.category;
  if (opts.search) {
    where = {
      ...where,
      AND: [
        {
          OR: [
            { name: { contains: opts.search, mode: "insensitive" } },
            { subject: { contains: opts.search, mode: "insensitive" } },
          ],
        },
      ],
    };
  }

  const [items, total] = await prisma.$transaction([
    prisma.template.findMany({
      where,
      // Org-owned first, then system defaults
      orderBy: [{ organizationId: "desc" }, { createdAt: "desc" }],
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
  organizationId?: string,
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
      organizationId: organizationId ?? null,
      isSystemTemplate: !organizationId,
    },
  });
}

// ── fork helper (internal) ────────────────────────────────────────────────────

type TemplateRow = NonNullable<
  Awaited<ReturnType<typeof prisma.template.findUnique>>
>;

async function forkForOrg(
  source: TemplateRow,
  updates: {
    name?: string;
    description?: string;
    category?: string;
    subject?: string;
    content?: string;
    variables?: string | string[];
    templateType?: TemplateType;
    isActive?: boolean;
  },
  userId: string,
  organizationId: string,
) {
  const variablesStr = updates.variables
    ? Array.isArray(updates.variables)
      ? JSON.stringify(updates.variables)
      : updates.variables
    : (source.variables ?? undefined);
  return prisma.template.create({
    data: {
      name: updates.name ?? source.name,
      description: updates.description ?? source.description ?? undefined,
      templateType: updates.templateType ?? source.templateType,
      category: updates.category ?? source.category ?? undefined,
      subject: updates.subject ?? source.subject ?? undefined,
      content: updates.content ?? source.content,
      variables: variablesStr,
      thumbnailUrl: source.thumbnailUrl ?? undefined,
      isActive: updates.isActive ?? true,
      isSystemTemplate: false,
      createdBy: userId,
      organizationId,
    },
  });
}

export type UpdateTemplateResult = {
  template: TemplateRow;
  forked: boolean;
};

export async function updateTemplate(
  id: string,
  data: {
    name?: string;
    description?: string;
    category?: string;
    subject?: string;
    content?: string;
    variables?: string | string[];
    templateType?: TemplateType;
    tags?: string[];
    isActive?: boolean;
  },
  actor: { userId: string; organizationId?: string } = { userId: "system" },
): Promise<UpdateTemplateResult> {
  const template = await getTemplate(id);
  const { tags: _tags, variables, ...rest } = data;
  const variablesStr = Array.isArray(variables)
    ? JSON.stringify(variables)
    : variables;

  // System template + org user --> fork a copy for this org only
  if (template.organizationId === null && template.isSystemTemplate) {
    if (!actor.organizationId) {
      // Super-admin editing a system template directly
      const updated = await prisma.template.update({
        where: { id },
        data: { ...rest, variables: variablesStr },
      });
      return { template: updated, forked: false };
    }
    const forked = await forkForOrg(
      template,
      data,
      actor.userId,
      actor.organizationId,
    );
    return { template: forked, forked: true };
  }

  // Org-owned template -- enforce org boundary
  if (template.organizationId !== null) {
    if (
      actor.organizationId &&
      template.organizationId !== actor.organizationId
    ) {
      throw new AuthorizationError(
        "You can only edit templates that belong to your organization.",
      );
    }
    const updated = await prisma.template.update({
      where: { id },
      data: { ...rest, variables: variablesStr },
    });
    return { template: updated, forked: false };
  }

  // Fallback
  const updated = await prisma.template.update({
    where: { id },
    data: { ...rest, variables: variablesStr },
  });
  return { template: updated, forked: false };
}

export async function deleteTemplate(
  id: string,
  actor?: { organizationId?: string },
) {
  const template = await getTemplate(id);

  if (actor?.organizationId) {
    if (template.organizationId === null) {
      throw new AuthorizationError(
        "System templates cannot be deleted — they belong to the entire platform.",
      );
    }
    if (template.organizationId !== actor.organizationId) {
      throw new AuthorizationError(
        "You can only delete templates that belong to your organization.",
      );
    }
  }

  return prisma.template.update({ where: { id }, data: { isActive: false } });
}
