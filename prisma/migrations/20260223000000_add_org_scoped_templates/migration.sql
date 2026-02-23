-- AddColumn: organization_id and is_system_template to templates table
-- Templates now support org-level copies.
-- NULL organization_id = global system/platform template (read-only for orgs).
-- Non-NULL organization_id = org-owned copy that only that org can edit/delete.

ALTER TABLE "templates"
  ADD COLUMN IF NOT EXISTS "organization_id" TEXT,
  ADD COLUMN IF NOT EXISTS "is_system_template" BOOLEAN NOT NULL DEFAULT false;

-- Back-reference index for fast lookups per org
CREATE INDEX IF NOT EXISTS "templates_organization_id_idx"
  ON "templates"("organization_id");

-- Foreign key: org templates reference their owning organization
ALTER TABLE "templates"
  ADD CONSTRAINT "templates_organization_id_fkey"
  FOREIGN KEY ("organization_id")
  REFERENCES "organizations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Mark all pre-existing templates as system templates (they have no org scope)
UPDATE "templates" SET "is_system_template" = true WHERE "organization_id" IS NULL;
