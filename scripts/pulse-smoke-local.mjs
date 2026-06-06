#!/usr/bin/env node
/**
 * Smoke-test Pulse API routes against a running dev or prod server.
 *
 * Prerequisites: `npm run dev` (or `npm run start`) on port 3004 in another terminal.
 *
 * Usage:
 *   node scripts/pulse-smoke-local.mjs
 *   node scripts/pulse-smoke-local.mjs https://pulse.mycodao.com
 *
 * Optional first argument overrides base URL (same as PULSE_SMOKE_BASE).
 *
 * Env (optional, see .env.example):
 *   PULSE_SMOKE_BASE — full origin + base path, e.g. http://localhost:3004 or http://localhost:3004/mycodao.financial
 *   NEXT_PUBLIC_BASE_PATH — if set and PULSE_SMOKE_BASE unset, combined with http://localhost:3004
 *   NEXT_PUBLIC_PULSE_SSE — if "1" or "true", also checks /api/pulse/stream for hello + tickers events
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

function smokeBase() {
  const argvUrl = process.argv[2]?.trim();
  if (argvUrl) return argvUrl.replace(/\/$/, "");
  const explicit = process.env.PULSE_SMOKE_BASE?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const path = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
  return `http://localhost:3004${path}`;
}

async function expectJson(url, label) {
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  if (!res.ok) {
    console.error(`FAIL ${label} HTTP ${res.status} ${url}`);
    console.error(text.slice(0, 200));
    return false;
  }
  try {
    JSON.parse(text);
  } catch {
    console.error(`FAIL ${label} not JSON ${url}`);
    console.error(text.slice(0, 200));
    return false;
  }
  console.log(`OK   ${label} ${url}`);
  return true;
}

async function smokeSse(base) {
  const url = `${base}/api/pulse/stream`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok || !res.body) {
    console.error(`FAIL SSE HTTP ${res.status} ${url}`);
    return false;
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let sawHello = false;
  let sawTickers = false;
  const deadline = Date.now() + 25_000;
  try {
    while ((!sawHello || !sawTickers) && Date.now() < deadline) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split("\n\n");
      buf = parts.pop() ?? "";
      for (const block of parts) {
        const line = block.split("\n").find((l) => l.startsWith("data:"));
        if (!line) continue;
        const jsonStr = line.replace(/^data:\s*/, "").trim();
        try {
          const j = JSON.parse(jsonStr);
          if (j.type === "hello") sawHello = true;
          if (j.type === "tickers") sawTickers = true;
        } catch {
          /* ignore */
        }
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      /* ignore */
    }
  }
  if (sawHello && sawTickers) {
    console.log(`OK   SSE hello+ticker events ${url}`);
    return true;
  }
  console.error(`FAIL SSE expected hello + tickers from ${url}`);
  return false;
}

const base = smokeBase();
console.log(`Pulse smoke (base: ${base})\n`);

const MYCO_REALM_PK = "At93fiCMzEkZWBAHxSNjfk7zUHnF3JcxyCyPjZELjK9Y";

const paths = [
  ["/api/tickers", "tickers"],
  ["/api/news", "news"],
  ["/api/podcasts", "podcasts"],
  ["/api/realms/daos?limit=2", "realms_daos"],
  [`/api/realms/daos/${MYCO_REALM_PK}?proposals=1&treasury=1&members=0`, "realms_dao_detail"],
  ["/api/learn", "learn"],
  ["/api/research", "research"],
  ["/api/myco", "myco"],
  ["/api/calendar", "calendar"],
  ["/api/ohlc?symbol=BTC&interval=1D", "ohlc"],
];

let ok = true;
for (const [p, label] of paths) {
  const u = `${base}${p}`;
  const pass = await expectJson(u, label);
  if (!pass) ok = false;
}

try {
  const tickersRes = await fetch(`${base}/api/tickers`, { cache: "no-store" });
  const tickers = await tickersRes.json();
  const myco = Array.isArray(tickers)
    ? tickers.find((t) => String(t.symbol).toUpperCase() === "MYCO")
    : null;
  if (myco?.price > 0) {
    console.log(`OK   MYCO live price $${myco.price} (${base}/api/tickers)`);
  } else {
    console.error(`FAIL MYCO missing or zero price in /api/tickers`);
    ok = false;
  }
  const mycoRes = await fetch(`${base}/api/myco`, { cache: "no-store" });
  const snap = await mycoRes.json();
  if (snap?.price > 0) {
    console.log(`OK   MYCO snapshot $${snap.price} (${base}/api/myco)`);
  } else {
    console.error(`FAIL MYCO snapshot missing or zero price in /api/myco`);
    ok = false;
  }
} catch (e) {
  console.error("FAIL MYCO price validation", e);
  ok = false;
}

const passHealth = await expectJson(`${base}/api/health?deep=1`, "health_deep");
if (!passHealth) ok = false;

const passConfig = await expectJson(`${base}/api/pulse/config-status`, "config_status");
if (!passConfig) ok = false;

const passChainStats = await expectJson(`${base}/api/pulse/chain-stats`, "chain_stats");
if (!passChainStats) ok = false;

const passMasInfo = await expectJson(`${base}/api/pulse/mas-task`, "mas_task_get");
if (!passMasInfo) ok = false;

const sseOn =
  process.env.NEXT_PUBLIC_PULSE_SSE === "1" || process.env.NEXT_PUBLIC_PULSE_SSE === "true";
if (sseOn) {
  const pass = await smokeSse(base);
  if (!pass) ok = false;
} else {
  console.log("[skip] SSE (set NEXT_PUBLIC_PULSE_SSE=1 in .env.local to test /api/pulse/stream)");
}

if (!ok) {
  console.error("\nSmoke failed. Is the app running on port 3004? (npm run dev)");
  process.exit(1);
}
console.log("\nAll smoke checks passed.");
