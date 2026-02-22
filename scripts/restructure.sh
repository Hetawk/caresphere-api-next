#!/usr/bin/env bash
set -e
API="src/app/api"

# ── orgs (was organizations/*) ──────────────────────────────────────────────
mkdir -p "$API/orgs/join" "$API/orgs/me" "$API/orgs/code"
cp "$API/organizations/join/route.ts"             "$API/orgs/join/route.ts"
cp "$API/organizations/my-organization/route.ts"  "$API/orgs/me/route.ts"
cp "$API/organizations/regenerate-code/route.ts"  "$API/orgs/code/route.ts"
# orgs/route.ts created separately (POST create + future GET list)

# ── auth/password group ─────────────────────────────────────────────────────
mkdir -p "$API/auth/password/forgot" "$API/auth/password/reset"
cp "$API/auth/forgot-password/route.ts"   "$API/auth/password/forgot/route.ts"
cp "$API/auth/reset-password/route.ts"    "$API/auth/password/reset/route.ts"
# auth/password/route.ts created separately (PATCH change-password)

# ── auth short names ────────────────────────────────────────────────────────
mkdir -p "$API/auth/verify" "$API/auth/register-org"
cp "$API/auth/send-verification-code/route.ts"     "$API/auth/verify/route.ts"
cp "$API/auth/register-with-organization/route.ts" "$API/auth/register-org/route.ts"

# ── analytics flatten (remove /dashboard sub-path) ─────────────────────────
cp "$API/analytics/dashboard/route.ts" "$API/analytics/route.ts"

# ── members/import (was bulk/) ──────────────────────────────────────────────
mkdir -p "$API/members/import/template"
cp "$API/bulk/members/import/route.ts"          "$API/members/import/route.ts"
cp "$API/bulk/members/import-template/route.ts" "$API/members/import/template/route.ts"

# ── bible/vod (was verse-of-day) ────────────────────────────────────────────
mkdir -p "$API/bible/vod"
cp "$API/bible/verse-of-day/route.ts" "$API/bible/vod/route.ts"

# ── bible param renames ─────────────────────────────────────────────────────
mkdir -p "$API/bible/chapters/[id]" "$API/bible/passages/[id]" "$API/bible/verses/[ref]"
cp "$API/bible/chapters/[chapterId]/route.ts" "$API/bible/chapters/[id]/route.ts"
cp "$API/bible/passages/[passageId]/route.ts" "$API/bible/passages/[id]/route.ts"
cp "$API/bible/verses/[reference]/route.ts"   "$API/bible/verses/[ref]/route.ts"

# ── fields param renames ────────────────────────────────────────────────────
mkdir -p "$API/fields/entities/[type]/[id]"
cp "$API/fields/entities/[entityType]/[entityId]/route.ts" "$API/fields/entities/[type]/[id]/route.ts"

# ── Remove old paths ─────────────────────────────────────────────────────────
rm -rf "$API/organizations"
rm -rf "$API/bulk"
rm -rf "$API/members/search"
rm -rf "$API/analytics/dashboard"
rm -rf "$API/auth/change-password"
rm -rf "$API/auth/forgot-password"
rm -rf "$API/auth/reset-password"
rm -rf "$API/auth/send-verification-code"
rm -rf "$API/auth/register-with-organization"
rm -rf "$API/bible/verse-of-day"
rm -rf "$API/bible/chapters/[chapterId]"
rm -rf "$API/bible/passages/[passageId]"
rm -rf "$API/bible/verses/[reference]"
rm -rf "$API/fields/entities/[entityType]"
rm -rf "$API/settings/senders/resolved"

echo "✓ Route restructuring complete"
