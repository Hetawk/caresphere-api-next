import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/handler";
import { successResponse } from "@/lib/responses";
import { ValidationError } from "@/lib/errors";
import { requireRoles } from "@/lib/request";
import { createMember } from "@/services/member.service";
import { getUserOrganization } from "@/services/organization.service";
import { UserRole, MemberStatus } from "@prisma/client";

interface ImportRow {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  whatsAppNumber?: string;
  weChatID?: string;
  country?: string;
  school?: string;
  gender?: string;
  tags?: string;
  notes?: string;
}

function parseCSV(text: string): ImportRow[] {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const values = line.split(",");
      return Object.fromEntries(
        headers.map((h, i) => [h, (values[i] ?? "").trim()])
      ) as ImportRow;
    });
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  const currentUser = await requireRoles(req, UserRole.SUPER_ADMIN, UserRole.ADMIN);
  const org = await getUserOrganization(currentUser.id);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) throw new ValidationError({ file: "No file provided" });
  if (!file.name.endsWith(".csv"))
    throw new ValidationError({ file: "Only CSV files are supported" });

  const text = await file.text();
  const rows = parseCSV(text);

  const imported: { id: string; name: string; email: string | null }[] = [];
  const errorDetails: { row: number; error: string }[] = [];
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    if (!row.firstName?.trim()) {
      skipped++;
      continue;
    }

    try {
      const tags = row.tags
        ? row.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      const gender =
        row.gender === "Male"
          ? "MALE"
          : row.gender === "Female"
          ? "FEMALE"
          : undefined;

      const member = await createMember(
        {
          firstName: row.firstName.trim(),
          lastName: row.lastName?.trim() || undefined,
          email: row.email?.trim() || undefined,
          phone: row.phoneNumber?.trim() || undefined,
          whatsappNumber: row.whatsAppNumber?.trim() || undefined,
          wechatId: row.weChatID?.trim() || undefined,
          gender: gender as "MALE" | "FEMALE" | undefined,
          country: row.country?.trim() || undefined,
          workSchool: row.school?.trim() || undefined,
          notes: row.notes?.trim() || undefined,
          tags,
          memberStatus: MemberStatus.ACTIVE,
        },
        org?.id
      );

      imported.push({
        id: member.id,
        name: [member.firstName, member.lastName].filter(Boolean).join(" "),
        email: member.email,
      });
    } catch (err) {
      errorDetails.push({
        row: rowNum,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return successResponse(
    {
      imported: imported.length,
      errors: errorDetails.length,
      skipped,
      members: imported,
      errorDetails,
    },
    { status: 201 }
  );
});
