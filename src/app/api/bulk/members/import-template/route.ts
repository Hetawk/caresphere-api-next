import { NextResponse } from "next/server";

const CSV_TEMPLATE =
  "firstName,lastName,email,phoneNumber,whatsAppNumber,weChatID,country,school,gender,tags,notes\n" +
  "John,Doe,john@example.com,+1234567890,+1234567890,,USA,MIT,Male,choir music,New member\n";

export function GET() {
  return new NextResponse(CSV_TEMPLATE, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition":
        'attachment; filename="members_import_template.csv"',
    },
  });
}
