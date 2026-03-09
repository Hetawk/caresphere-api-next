/**
 * GET /api/bible/test — Public test endpoint (no auth required).
 *
 * Tests the YouVersion Bible API integration by fetching:
 *   - A specific verse (defaults to JHN.3.16)
 *   - Available translations (first 5)
 *   - VOTD day mapping from /verse_of_the_days/{day}
 *
 * Query params:
 *   ref           — USFM reference to fetch (default: JHN.3.16)
 *   translationId — YouVersion version ID (default: 1 = KJV)
 *
 * Example:
 *   GET /api/bible/test
 *   GET /api/bible/test?ref=PSA.23.1&translationId=111
 */

import { NextRequest, NextResponse } from "next/server";
import { getVerse, getTranslations } from "@/services/bible.service";
import { config } from "@/lib/config";

export const GET = async (req: NextRequest) => {
  const ref = req.nextUrl.searchParams.get("ref") ?? "JHN.3.16";
  const translationId =
    req.nextUrl.searchParams.get("translationId") ??
    config.BIBLE_DEFAULT_TRANSLATION;

  const results: Record<string, unknown> = {
    apiConfigured: !!config.YOUVERSION_API_KEY,
    defaultTranslation: config.BIBLE_DEFAULT_TRANSLATION,
    requestedRef: ref,
    requestedTranslationId: translationId,
  };

  // Test 1: Fetch a single verse
  try {
    const verse = await getVerse(ref, translationId);
    results.verse = verse;
    results.verseStatus = "ok";
  } catch (err) {
    results.verseStatus = "error";
    results.verseError = err instanceof Error ? err.message : String(err);
  }

  // Test 2: Fetch available translations (first 5 only to keep response small)
  try {
    const allTranslations = await getTranslations();
    results.translationCount = allTranslations.length;
    results.sampleTranslations = allTranslations.slice(0, 5);
    results.translationsStatus = "ok";
  } catch (err) {
    results.translationsStatus = "error";
    results.translationsError =
      err instanceof Error ? err.message : String(err);
  }

  // Test 3: Probe official VOTD day endpoint shape
  try {
    const dayOfYear = Math.ceil(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
        86400000,
    );
    const url = `${config.YOUVERSION_API_URL.replace(/\/$/, "")}/verse_of_the_days/${dayOfYear}`;
    const res = await fetch(url, {
      headers: {
        "X-YVP-App-Key": config.YOUVERSION_API_KEY,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const body = await res.text();
    results.votdStatus = res.ok ? "ok" : "error";
    results.votdHttpStatus = res.status;
    results.votdResponsePreview = body.slice(0, 200);
  } catch (err) {
    results.votdStatus = "error";
    results.votdError = err instanceof Error ? err.message : String(err);
  }

  const allOk =
    results.verseStatus === "ok" &&
    results.translationsStatus === "ok" &&
    results.votdStatus === "ok";

  return NextResponse.json(
    {
      success: allOk,
      message: allOk
        ? "Bible API is working correctly"
        : "Bible API has issues — check individual test results",
      data: results,
    },
    { status: 200 },
  );
};
