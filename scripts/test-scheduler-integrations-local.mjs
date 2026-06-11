#!/usr/bin/env node
/**
 * Smoke-test scheduler integration routes on local dev (port 3004).
 * Does NOT deploy. Public EPG works without auth; hub requires producer token.
 *
 * Usage:
 *   npm run dev   (separate terminal)
 *   npm run test:scheduler-integrations
 *   PRODUCER_ACCESS_TOKEN=eyJ... npm run test:scheduler-integrations
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envLocal = join(root, ".env.local");
if (existsSync(envLocal)) {
  for (const line of readFileSync(envLocal, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

const base = (process.env.PULSE_SMOKE_BASE ?? "http://localhost:3004").replace(
  /\/$/,
  "",
);
const token = process.env.PRODUCER_ACCESS_TOKEN?.trim() ?? "";

let failed = 0;

async function check(label, url, opts = {}) {
  const { acceptStatuses = [200], warnOnStatus, ...fetchOpts } = opts;
  try {
    const res = await fetch(url, { cache: "no-store", ...fetchOpts });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }

    if (acceptStatuses.includes(res.status)) {
      console.log(`OK   ${label}`);
      return body;
    }

    if (warnOnStatus?.(res.status, body)) {
      console.log(`WARN ${label} HTTP ${res.status} (degraded — local credentials)`);
      return body;
    }

    console.error(`FAIL ${label} HTTP ${res.status}`);
    console.error(text.slice(0, 200));
    failed += 1;
    return null;
  } catch (e) {
    console.error(`FAIL ${label}`, e instanceof Error ? e.message : e);
    failed += 1;
    return null;
  }
}

console.log(`Base: ${base}`);

await check("EPG public", `${base}/api/news/epg`);
await check("Calendar preview", `${base}/api/news/producer/integrations/calendar?daysAhead=7`, {
  acceptStatuses: [200],
  warnOnStatus: (status, body) =>
    status === 503 &&
    body &&
    typeof body === "object" &&
    (body.configured === false || typeof body.error === "string"),
});
await check("Streamlabs status", `${base}/api/news/producer/integrations/streamlabs`);

if (token) {
  const headers = { Authorization: `Bearer ${token}` };
  await check("Integrations hub", `${base}/api/news/producer/integrations/hub`, {
    headers,
  });
  await check("Commercial library", `${base}/api/news/producer/commercials`, {
    headers,
  });
} else {
  console.log("SKIP hub + commercials (set PRODUCER_ACCESS_TOKEN for auth tests)");
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nAll scheduler integration smoke checks passed (local, no deploy).");
