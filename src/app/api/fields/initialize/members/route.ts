/**
 * POST /api/fields/initialize/members
 * Seeds default field configurations for the MEMBER entity type in the
 * current user's organization.  Safe to call multiple times — skips
 * fields that already exist (idempotent).
 */
import { NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { getRequestUser } from "@/lib/request";
import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import { EntityType, FieldType } from "@prisma/client";

const DEFAULT_MEMBER_FIELDS: Array<{
  fieldKey: string;
  fieldLabel: string;
  fieldType: FieldType;
  isRequired: boolean;
  displayOrder: number;
  description?: string;
  placeholder?: string;
  options?: string[];
}> = [
  {
    fieldKey: "date_of_birth",
    fieldLabel: "Date of Birth",
    fieldType: FieldType.DATE,
    isRequired: false,
    displayOrder: 1,
  },
  {
    fieldKey: "address_line1",
    fieldLabel: "Address Line 1",
    fieldType: FieldType.TEXT,
    isRequired: false,
    displayOrder: 2,
    placeholder: "Street address",
  },
  {
    fieldKey: "address_line2",
    fieldLabel: "Address Line 2",
    fieldType: FieldType.TEXT,
    isRequired: false,
    displayOrder: 3,
    placeholder: "Apt, suite, etc.",
  },
  {
    fieldKey: "city",
    fieldLabel: "City",
    fieldType: FieldType.TEXT,
    isRequired: false,
    displayOrder: 4,
  },
  {
    fieldKey: "state",
    fieldLabel: "State / Province",
    fieldType: FieldType.TEXT,
    isRequired: false,
    displayOrder: 5,
  },
  {
    fieldKey: "postal_code",
    fieldLabel: "Postal Code",
    fieldType: FieldType.TEXT,
    isRequired: false,
    displayOrder: 6,
  },
  {
    fieldKey: "country",
    fieldLabel: "Country",
    fieldType: FieldType.TEXT,
    isRequired: false,
    displayOrder: 7,
    placeholder: "United States",
  },
  {
    fieldKey: "occupation",
    fieldLabel: "Occupation",
    fieldType: FieldType.TEXT,
    isRequired: false,
    displayOrder: 8,
  },
  {
    fieldKey: "emergency_contact_name",
    fieldLabel: "Emergency Contact Name",
    fieldType: FieldType.TEXT,
    isRequired: false,
    displayOrder: 9,
  },
  {
    fieldKey: "emergency_contact_phone",
    fieldLabel: "Emergency Contact Phone",
    fieldType: FieldType.TEXT,
    isRequired: false,
    displayOrder: 10,
  },
  {
    fieldKey: "notes",
    fieldLabel: "Notes",
    fieldType: FieldType.TEXTAREA,
    isRequired: false,
    displayOrder: 11,
  },
];

export const POST = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await getRequestUser(req);

  // Resolve the org for this user
  const membership = await prisma.organizationUser.findFirst({
    where: { userId: currentUser.id },
    select: { organizationId: true },
  });

  const organizationId = membership?.organizationId;
  if (!organizationId) throw new NotFoundError("Organization");

  let created = 0;
  let skipped = 0;

  for (const field of DEFAULT_MEMBER_FIELDS) {
    const exists = await prisma.fieldConfiguration.findFirst({
      where: {
        fieldKey: field.fieldKey,
        entityType: EntityType.MEMBER,
        organizationId,
      },
    });

    if (exists) {
      skipped++;
      continue;
    }

    const { options, ...rest } = field;
    await prisma.fieldConfiguration.create({
      data: {
        ...rest,
        entityType: EntityType.MEMBER,
        organizationId,
        options: options ?? [],
      },
    });
    created++;
  }

  return successResponse({
    message: `Member field initialization complete`,
    created,
    skipped,
    total: DEFAULT_MEMBER_FIELDS.length,
  });
});
