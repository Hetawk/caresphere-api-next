#!/usr/bin/env node
// Probes YouVersion API to find correct endpoint paths

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");
const envVars = Object.fromEntries(
    readFileSync(envPath, "utf-8")
        .split("\n")
        .filter((line) => line.includes("=") && !line.startsWith("#"))
        .map((line) => {
            const [k, ...v] = line.split("=");
            return [k.trim(), v.join("=").trim().replace(/^"|"$/g, "")];
        }),
);

const API_KEY = envVars.YOUVERSION_API_KEY;
const BASE = "https://api.youversion.com/v1";
const HEADERS = { "X-YVP-App-Key": API_KEY, Accept: "application/json" };

const DOY = Math.ceil((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000); // day-of-year

async function probe(label, path) {
    const url = `${BASE}${path}`;
    try {
        const res = await fetch(url, { headers: HEADERS });
        const body = await res.text();
        const preview = body.slice(0, 200);
        console.log(`\n[${res.status}] ${label}`);
        console.log(`  URL: ${url}`);
        console.log(`  Body: ${preview}`);
        return { status: res.status, body };
    } catch (e) {
        console.log(`\n[ERR] ${label}: ${e.message}`);
    }
}

console.log(`Day of year: ${DOY}\n`);
console.log(`API Key: ${API_KEY ? API_KEY.slice(0, 8) + "..." : "NOT SET"}`);

await probe("Bibles list EN", "/bibles?language_ranges[]=en&page_size=5");
await probe("Bible books for 3034", "/bibles/3034/books");
await probe("Passage JHN.3.16", "/bibles/3034/passages/JHN.3.16");
await probe("Passage range JHN.3.16-18", "/bibles/3034/passages/JHN.3.16-18");
await probe("Chapter via passages/JHN.3", "/bibles/3034/passages/JHN.3");
await probe("Chapters list for GEN", "/bibles/3034/books/GEN/chapters");
await probe("Chapter GEN.1 content", "/bibles/3034/chapters/GEN.1/verses");
await probe("Search shepherd", "/bibles/3034/search?query=shepherd&limit=3");
await probe(`VOTD /verse_of_the_days/${DOY}`, `/verse_of_the_days/${DOY}`);
await probe("VOTD full calendar", "/verse_of_the_days");
