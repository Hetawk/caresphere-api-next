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

type LegacyTemplateRow = {
  id: string;
  name: string;
  description: string | null;
  templateType: TemplateType;
  category: string | null;
  subject: string | null;
  content: string;
  variables: string | null;
  thumbnailUrl: string | null;
  isActive: boolean;
  usageCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

type TemplateSchemaSupport = {
  hasOrganizationId: boolean;
  hasSystemTemplate: boolean;
};

let templateSchemaSupportCache: TemplateSchemaSupport | undefined;

async function getTemplateSchemaSupport(): Promise<TemplateSchemaSupport> {
  if (templateSchemaSupportCache !== undefined) {
    return templateSchemaSupportCache;
  }

  const rows = await prisma.$queryRaw<
    Array<{ column_name: string }>
  >`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'templates' AND column_name IN ('organization_id', 'is_system_template')`;

  const names = new Set(rows.map((r) => r.column_name));
  templateSchemaSupportCache = {
    hasOrganizationId: names.has("organization_id"),
    hasSystemTemplate: names.has("is_system_template"),
  };

  return templateSchemaSupportCache;
}

function mapLegacyTemplate(row: LegacyTemplateRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    templateType: row.templateType,
    category: row.category,
    subject: row.subject,
    content: row.content,
    variables: row.variables,
    thumbnailUrl: row.thumbnailUrl,
    isActive: row.isActive,
    usageCount: row.usageCount,
    createdBy: row.createdBy,
    organizationId: null,
    isSystemTemplate: true,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listTemplates(opts: {
  page: number;
  limit: number;
  organizationId?: string;
  templateType?: TemplateType;
  category?: string;
  search?: string;
}) {
  const support = await getTemplateSchemaSupport();

  if (!support.hasOrganizationId || !support.hasSystemTemplate) {
    const clauses: Prisma.Sql[] = [Prisma.sql`"is_active" = true`];
    if (opts.templateType) {
      clauses.push(Prisma.sql`"template_type" = ${opts.templateType}`);
    }
    if (opts.category) {
      clauses.push(Prisma.sql`"category" = ${opts.category}`);
    }
    if (opts.search?.trim()) {
      const q = `%${opts.search.trim()}%`;
      clauses.push(
        Prisma.sql`("name" ILIKE ${q} OR COALESCE("subject", '') ILIKE ${q})`,
      );
    }

    const whereSql =
      clauses.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(clauses, " AND ")}`
        : Prisma.sql``;

    const page = toPrismaPage(opts.page, opts.limit);
    const skip = page.skip ?? 0;
    const take = page.take ?? opts.limit;

    const items = await prisma.$queryRaw<LegacyTemplateRow[]>`
      SELECT
        "id",
        "name",
        "description",
        "template_type" AS "templateType",
        "category",
        "subject",
        "content",
        "variables",
        "thumbnail_url" AS "thumbnailUrl",
        "is_active" AS "isActive",
        "usage_count" AS "usageCount",
        "created_by" AS "createdBy",
        "created_at" AS "createdAt",
        "updated_at" AS "updatedAt"
      FROM "templates"
      ${whereSql}
      ORDER BY "created_at" DESC
      OFFSET ${skip}
      LIMIT ${take}
    `;

    const totalRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "templates"
      ${whereSql}
    `;

    return {
      items: items.map(mapLegacyTemplate),
      total: Number(totalRows[0]?.count ?? 0),
    };
  }

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
  const support = await getTemplateSchemaSupport();
  if (!support.hasOrganizationId || !support.hasSystemTemplate) {
    const rows = await prisma.$queryRaw<LegacyTemplateRow[]>`
      SELECT
        "id",
        "name",
        "description",
        "template_type" AS "templateType",
        "category",
        "subject",
        "content",
        "variables",
        "thumbnail_url" AS "thumbnailUrl",
        "is_active" AS "isActive",
        "usage_count" AS "usageCount",
        "created_by" AS "createdBy",
        "created_at" AS "createdAt",
        "updated_at" AS "updatedAt"
      FROM "templates"
      WHERE "id" = ${id}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) throw new NotFoundError("Template");
    return mapLegacyTemplate(row);
  }

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
  const support = await getTemplateSchemaSupport();
  const { variables, tags: _tags, ...rest } = data;
  const variablesStr = Array.isArray(variables)
    ? JSON.stringify(variables)
    : variables;

  if (!support.hasOrganizationId || !support.hasSystemTemplate) {
    const rows = await prisma.$queryRaw<LegacyTemplateRow[]>`
      INSERT INTO "templates" (
        "name",
        "description",
        "template_type",
        "category",
        "subject",
        "content",
        "variables",
        "thumbnail_url",
        "is_active",
        "usage_count",
        "created_by"
      ) VALUES (
        ${rest.name},
        ${rest.description ?? null},
        ${data.templateType ?? TemplateType.EMAIL},
        ${rest.category ?? null},
        ${rest.subject ?? null},
        ${rest.content},
        ${variablesStr ?? null},
        ${rest.thumbnailUrl ?? null},
        true,
        0,
        ${createdBy}
      )
      RETURNING
        "id",
        "name",
        "description",
        "template_type" AS "templateType",
        "category",
        "subject",
        "content",
        "variables",
        "thumbnail_url" AS "thumbnailUrl",
        "is_active" AS "isActive",
        "usage_count" AS "usageCount",
        "created_by" AS "createdBy",
        "created_at" AS "createdAt",
        "updated_at" AS "updatedAt"
    `;
    return mapLegacyTemplate(rows[0]!);
  }

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
  const support = await getTemplateSchemaSupport();

  if (!support.hasOrganizationId || !support.hasSystemTemplate) {
    const template = await getTemplate(id);
    const { tags: _legacyTags, variables, ...rest } = data;
    const variablesStr = Array.isArray(variables)
      ? JSON.stringify(variables)
      : variables;

    const merged = {
      name: rest.name ?? template.name,
      description: rest.description ?? template.description ?? null,
      templateType: rest.templateType ?? template.templateType,
      category: rest.category ?? template.category ?? null,
      subject: rest.subject ?? template.subject ?? null,
      content: rest.content ?? template.content,
      variables: variablesStr ?? template.variables ?? null,
      isActive: rest.isActive ?? template.isActive,
    };

    const rows = await prisma.$queryRaw<LegacyTemplateRow[]>`
      UPDATE "templates"
      SET
        "name" = ${merged.name},
        "description" = ${merged.description},
        "template_type" = ${merged.templateType},
        "category" = ${merged.category},
        "subject" = ${merged.subject},
        "content" = ${merged.content},
        "variables" = ${merged.variables},
        "is_active" = ${merged.isActive},
        "updated_at" = NOW()
      WHERE "id" = ${id}
      RETURNING
        "id",
        "name",
        "description",
        "template_type" AS "templateType",
        "category",
        "subject",
        "content",
        "variables",
        "thumbnail_url" AS "thumbnailUrl",
        "is_active" AS "isActive",
        "usage_count" AS "usageCount",
        "created_by" AS "createdBy",
        "created_at" AS "createdAt",
        "updated_at" AS "updatedAt"
    `;

    return {
      template: mapLegacyTemplate(rows[0]!) as TemplateRow,
      forked: false,
    };
  }

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
  const support = await getTemplateSchemaSupport();

  if (!support.hasOrganizationId || !support.hasSystemTemplate) {
    await prisma.$executeRaw`
      UPDATE "templates"
      SET "is_active" = false, "updated_at" = NOW()
      WHERE "id" = ${id}
    `;
    return { id, isActive: false };
  }

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
