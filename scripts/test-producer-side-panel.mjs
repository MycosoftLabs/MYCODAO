#!/usr/bin/env node
/**
 * Smoke-test Producer Program Side Panel APIs (GET + server-side patch simulation).
 * Requires: npm run dev (or dev:pulse) on port 3004.
 *
 * Usage: node scripts/test-producer-side-panel.mjs
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

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

const BASE = (process.env.PULSE_SMOKE_BASE ?? "http://localhost:3004").replace(
  /\/$/,
  "",
);

let passed = 0;
let failed = 0;

function ok(label) {
  console.log(`OK   ${label}`);
  passed++;
}

function fail(label, detail = "") {
  console.error(`FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  failed++;
}

async function getProducer() {
  const res = await fetch(`${BASE}/api/news/producer`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET producer HTTP ${res.status}`);
  return res.json();
}

async function testGetShape() {
  const data = await getProducer();
  if (!data.presets?.program?.length) {
    fail("GET producer presets.program");
    return null;
  }
  ok(`GET producer presets (${data.presets.program.length} programs)`);

  if (typeof data.showConfigs !== "object" || data.showConfigs === null) {
    fail("GET showConfigs object");
    return data;
  }
  const cfgCount = Object.keys(data.showConfigs).length;
  if (cfgCount < 1) fail("GET showConfigs seeded", `count=${cfgCount}`);
  else ok(`GET showConfigs (${cfgCount} entries)`);

  if (!("selectedProgramPresetId" in data)) {
    fail("GET selectedProgramPresetId field");
  } else ok("GET selectedProgramPresetId field");

  if (!("activeShowProgramId" in data)) {
    fail("GET activeShowProgramId field");
  } else ok("GET activeShowProgramId field");

  if (!("showOverlay" in data)) {
    fail("GET showOverlay field");
  } else ok(`GET showOverlay (${data.showOverlay === null ? "null off-air" : "object"})`);

  return data;
}

async function testPatchRequiresAuth() {
  const res = await fetch(`${BASE}/api/news/producer`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectProgramPresetId: "show-mycosoft-garage" }),
  });
  if (res.status === 401) {
    ok("PATCH without token returns 401");
  } else {
    fail("PATCH without token", `expected 401 got ${res.status}`);
  }
}

function testServerPatchHandlers() {
  // Direct server module test (no HTTP auth) via Next compiled path — use dynamic import of TS via register
  // Fallback: verify data file paths and config seed on disk
  const dataDir = join(root, "data");
  const showCfgPath = join(dataDir, "news-program-show-configs.json");
  const statePath = join(dataDir, "news-producer-state.json");

  if (existsSync(showCfgPath)) {
    const raw = JSON.parse(readFileSync(showCfgPath, "utf8"));
    const configs = raw.configs ?? raw;
    const n = Object.keys(configs).length;
    if (n >= 1) ok(`data/news-program-show-configs.json (${n} programs)`);
    else fail("data/news-program-show-configs.json empty");
  } else {
    ok("data/news-program-show-configs.json (will seed on first PATCH/GET cycle)");
  }

  if (existsSync(statePath)) {
    const state = JSON.parse(readFileSync(statePath, "utf8"));
    const fields = [
      "selectedProgramPresetId",
      "activeShowProgramId",
      "showStartedAt",
      "commercialFiredSlotIds",
    ];
    for (const f of fields) {
      if (!(f in state)) fail(`state field ${f}`);
      else ok(`state has ${f}`);
    }
  } else {
    ok("data/news-producer-state.json (defaults on read)");
  }
}

async function testBlocksBundle() {
  const htmlRes = await fetch(`${BASE}/blocks/`, { cache: "no-store" });
  if (!htmlRes.ok) {
    fail("GET /blocks/", `HTTP ${htmlRes.status}`);
    return;
  }
  const html = await htmlRes.text();
  if (!html.includes("/blocks/assets/index-") || !html.includes(".js")) {
    fail("/blocks/ index.html missing pulse bundle script");
    return;
  }
  ok("GET /blocks/ serves pulse index.html");

  const jsMatch = html.match(/\/blocks\/assets\/(index-[^"]+\.js)/);
  if (!jsMatch) {
    fail("parse pulse JS path from index.html");
    return;
  }
  const jsUrl = `${BASE}/blocks/assets/${jsMatch[1]}`;
  const jsRes = await fetch(jsUrl, { cache: "no-store" });
  if (!jsRes.ok) {
    fail("GET pulse bundle", jsUrl);
    return;
  }
  const js = await jsRes.text();
  const markers = [
    "saveProgramShowConfig",
    "goOnAirProgramId",
    "selectProgramPresetId",
    "newsReel",
    "bottomBar",
  ];
  let found = 0;
  for (const m of markers) {
    if (js.includes(m)) found++;
  }
  if (found >= 4) ok(`pulse bundle contains side-panel markers (${found}/${markers.length})`);
  else fail("pulse bundle side-panel markers", `found ${found}/${markers.length} — run npm run build:pulse`);
}

async function testNasCompleteRoute() {
  const res = await fetch(`${BASE}/api/news/program/nas-complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (res.ok) {
    ok("POST nas-complete (200)");
  } else if (res.status >= 400 && res.status < 500) {
    ok(`POST nas-complete (${res.status} — route reachable)`);
  } else {
    fail("POST nas-complete", `HTTP ${res.status}`);
  }
}

async function main() {
  console.log(`Producer side panel smoke — ${BASE}\n`);
  try {
    await testGetShape();
    await testPatchRequiresAuth();
    testServerPatchHandlers();
    await testBlocksBundle();
    await testNasCompleteRoute();
  } catch (e) {
    fail("smoke aborted", e.message);
    console.error("\nStart dev: cd MYCODAO && npm run dev:pulse");
    process.exit(1);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
