#!/usr/bin/env node
// AWS topology correction 2026-11-27: production is AWS-only; this file's legacy on-prem references are not deployment authority. See AWS_INFRA_REFERENCE.md for its replacement and disposition. Loopback development and physical-device fixtures are separate.
/**
 * Smoke-test BLOCKS scheduler integrations on production.
 * Usage: node scripts/test-scheduler-integrations-prod.mjs
 */
const base = (process.env.BLOCKS_BASE_URL ?? "https://blocks.mycodao.com").replace(/\/$/, "");

let failed = 0;

async function check(label, url, opts = {}) {
  const { acceptStatuses = [200], headers = {} } = opts;
  try {
    const res = await fetch(url, { cache: "no-store", headers });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text.slice(0, 200);
    }
    const ok = acceptStatuses.includes(res.status);
    console.log(`${ok ? "PASS" : "FAIL"} ${label} → ${res.status}`, typeof body === "object" ? JSON.stringify(body).slice(0, 120) : body);
    if (!ok) failed++;
    return { res, body };
  } catch (e) {
    console.log(`FAIL ${label} →`, e.message);
    failed++;
    return null;
  }
}

async function main() {
  console.log("BLOCKS prod smoke test:", base);
  await check("healthz", `${base}/healthz`);
  await check("epg", `${base}/api/news/epg`, { acceptStatuses: [200] });
  await check("calendar preview", `${base}/api/news/producer/integrations/calendar?daysAhead=14`, {
    acceptStatuses: [200, 401, 403],
  });

  const cronSecret = process.env.BLOCKS_SCHEDULER_CRON_SECRET?.trim();
  if (cronSecret) {
    await check("calendar cron", `${base}/api/news/producer/integrations/calendar/cron`, {
      acceptStatuses: [200],
      headers: { "x-blocks-cron-secret": cronSecret },
    });
  } else {
    console.log("SKIP calendar cron (set BLOCKS_SCHEDULER_CRON_SECRET to test)");
  }

  try {
    const n8n = await fetch("http://internal-mycosoft-core-int-21300503.us-east-1.elb.amazonaws.com:5678/healthz", { signal: AbortSignal.timeout(8000) });
    console.log(`${n8n.ok ? "PASS" : "FAIL"} n8n health → ${n8n.status}`);
    if (!n8n.ok) failed++;
  } catch (e) {
    console.log("FAIL n8n health →", e.message);
    failed++;
  }

  process.exit(failed ? 1 : 0);
}

main();
