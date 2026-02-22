/**
 * Field-configuration service — custom fields per entity type + values.
 * Mirrors caresphere-api/app/api/fields.py
 *
 * Schema field mapping:
 *   name   → fieldKey
 *   label  → fieldLabel
 *   order  → displayOrder
 * FieldValue uses fieldConfigurationId (not fieldId).
 */

import { prisma } from "@/lib/prisma";
import { EntityType, FieldType } from "@prisma/client";
import { NotFoundError, ConflictError } from "@/lib/errors";

// ---- Configurations -------------------------------------------------------

export async function listFieldConfigurations(entityType?: EntityType) {
  return prisma.fieldConfiguration.findMany({
    where: entityType ? { entityType } : {},
    orderBy: [{ entityType: "asc" }, { displayOrder: "asc" }],
  });
}

export async function getFieldConfiguration(id: string) {
  const cfg = await prisma.fieldConfiguration.findUnique({ where: { id } });
  if (!cfg) throw new NotFoundError("Field configuration");
  return cfg;
}

export async function createFieldConfiguration(data: {
  organizationId: string;
  fieldKey: string;
  fieldLabel: string;
  fieldType?: FieldType;
  entityType: EntityType;
  isRequired?: boolean;
  defaultValue?: string;
  options?: string[];
  displayOrder?: number;
  description?: string;
  placeholder?: string;
}) {
  const existing = await prisma.fieldConfiguration.findFirst({
    where: {
      fieldKey: data.fieldKey,
      entityType: data.entityType,
      organizationId: data.organizationId,
    },
  });
  if (existing) {
    throw new ConflictError(
      `Field "${data.fieldKey}" already exists for ${data.entityType}`,
    );
  }
  const { options, ...rest } = data;
  return prisma.fieldConfiguration.create({
    data: { ...rest, options: options ?? [] },
  });
}

export async function updateFieldConfiguration(
  id: string,
  data: {
    fieldLabel?: string;
    isRequired?: boolean;
    defaultValue?: string;
    options?: string[];
    displayOrder?: number;
    description?: string;
    placeholder?: string;
    isVisible?: boolean;
    isSearchable?: boolean;
  },
) {
  await getFieldConfiguration(id);
  const { options, ...rest } = data;
  return prisma.fieldConfiguration.update({
    where: { id },
    data: { ...rest, ...(options !== undefined ? { options } : {}) },
  });
}

export async function deleteFieldConfiguration(id: string) {
  await getFieldConfiguration(id);
  return prisma.fieldConfiguration.delete({ where: { id } });
}

// ---- Entity field values --------------------------------------------------

export async function getEntityFields(
  entityType: EntityType,
  entityId: string,
) {
  const configs = await prisma.fieldConfiguration.findMany({
    where: { entityType, isVisible: true },
    orderBy: { displayOrder: "asc" },
  });

  const values = await prisma.fieldValue.findMany({
    where: { entityType, entityId },
  });

  const valueMap = Object.fromEntries(
    values.map((v) => [v.fieldConfigurationId, v.value]),
  );

  return configs.map((cfg) => ({
    fieldId: cfg.id,
    fieldKey: cfg.fieldKey,
    fieldLabel: cfg.fieldLabel,
    fieldType: cfg.fieldType,
    isRequired: cfg.isRequired,
    options: cfg.options,
    value: valueMap[cfg.id] ?? cfg.defaultValue ?? null,
  }));
}

export async function updateEntityFieldValues(
  entityType: EntityType,
  entityId: string,
  fields: Record<string, string | null>,
) {
  const ops = Object.entries(fields).map(([fieldConfigurationId, value]) =>
    prisma.fieldValue.upsert({
      where: {
        uq_field_value_cfg_entity: {
          fieldConfigurationId,
          entityType,
          entityId,
        },
      },
      create: {
        fieldConfigurationId,
        entityType,
        entityId,
        value: value ?? "",
      },
      update: { value: value ?? "" },
    }),
  );

  return prisma.$transaction(ops);
}
