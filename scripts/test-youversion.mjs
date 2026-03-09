/**
 * Quick YouVersion API diagnostic script.
 * Run: node scripts/test-youversion.mjs
 *
 * Tests the CORRECT API structure per docs:
 *   Auth:    X-YVP-App-Key header  (NOT Authorization: Bearer)
 *   Route:   /v1/bibles/{bible_id}/passages/{passage_id}
 *   VOTD:    /v1/verse_of_the_days/{day_of_year}
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually
const envPath = resolve(__dirname, "../.env");
const envVars = Object.fromEntries(
    readFileSync(envPath, "utf-8")
        .split("\n")
        .filter((l) => l.includes("=") && !l.startsWith("#"))
        .map((l) => {
            const [k, ...v] = l.split("=");
            return [k.trim(), v.join("=").trim().replace(/^"|"$/g, "")];
        }),
);

const APIKEY = envVars.YOUVERSION_API_KEY;
const BASE = "https://api.youversion.com/v1";

const headers = { "X-YVP-App-Key": APIKEY };

async function test(label, url) {
    console.log(`\n── ${label}`);
    console.log(`   GET ${url}`);
    try {
        const res = await fetch(url, { headers });
        const body = await res.text();
        const status = res.status;
        console.log(`   Status: ${status}`);
        if (status === 200) {
            try {
                const json = JSON.parse(body);
                console.log("   Response:", JSON.stringify(json).slice(0, 300));
            } catch {
                console.log("   Body (raw):", body.slice(0, 300));
            }
        } else {
            console.log("   Error body:", body.slice(0, 200));
        }
        return status === 200;
    } catch (e) {
        console.log("   FETCH ERROR:", e.message);
        return false;
    }
}

console.log("YouVersion API Diagnostic");
console.log("=========================");
console.log(`API Key: ${APIKEY ? APIKEY.slice(0, 8) + "..." : "NOT SET"}`);

// Day of year for VOTD
const now = new Date();
const start = new Date(now.getFullYear(), 0, 0);
const dayOfYear = Math.floor((now - start) / 86400000);

const tests = [
    // List bibles (English)
    ["List Bibles (EN)", `${BASE}/bibles?language_ranges[]=en&page_size=5`],
    // Passage — BSB (3034) is always available
    ["Passage JHN.3.16 (BSB 3034)", `${BASE}/bibles/3034/passages/JHN.3.16`],
    // Try KJV if the key has access (id varies — common ones: 1, 12, 206, etc.)
    ["Passage JHN.3.16 (Try KJV id=1)", `${BASE}/bibles/1/passages/JHN.3.16`],
    // PSA.23 chapter
    ["Chapter PSA.23 (BSB 3034)", `${BASE}/bibles/3034/passages/PSA.23`],
    // Verse of the day
    ["Verse of the Day", `${BASE}/verse_of_the_days/${dayOfYear}`],
    // Alternative VOTD path
    ["Verse of the Day Calendar", `${BASE}/verse_of_the_days`],
];

let passed = 0;
for (const [label, url] of tests) {
    const ok = await test(label, url);
    if (ok) passed++;
}

console.log(`\n=========================`);
console.log(`Results: ${passed}/${tests.length} passed`);
