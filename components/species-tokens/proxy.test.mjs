import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const { NextResponse } = require("next/server");
const source = readFileSync(new URL("../../lib/server/species-token-proxy.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const userId = "12345678-1234-4234-8234-123456789abc";

function proxy({ configured = true, authConfigured = true, fetch: fetchImpl = async () => { throw new Error("Unexpected fetch"); } } = {}) {
  const testModule = { exports: {} };
  vm.runInNewContext(compiled, {
    exports: testModule.exports, module: testModule,
    require(name) {
      if (name === "server-only") return {};
      if (name === "next/server") return { NextResponse };
      if (name === "@/lib/server/supabase-public") return { getPublicSupabaseConfig: () => ({ supabaseUrl: authConfigured ? "https://auth.example.test" : "", supabaseAnonKey: authConfigured ? "anon" : "" }) };
      throw new Error(`Unexpected dependency: ${name}`);
    },
    process: { env: configured ? { SPECIES_TOKEN_SERVICE_URL: "http://127.0.0.1:8095", SPECIES_TOKEN_PROXY_KEY: "server-secret" } : {} },
    fetch: fetchImpl, URL, TextDecoder, AbortSignal, setTimeout, clearTimeout,
  });
  return testModule.exports.speciesTokenProxy;
}

function request(path = "me", options = {}) { return new Request(`https://mycodao.example.test/api/species-tokens/${path}`, options); }
function json(value, status = 200) { return Response.json(value, { status }); }

test("unconfigured service returns unavailable, with no invented empty catalog", async () => {
  const response = await proxy({ configured: false })(request("catalog"), "catalog");
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.state, "unavailable");
  assert.equal(body.reason, "service_unconfigured");
  assert.equal("items" in body, false);
});

test("anonymous private requests and administrative endpoints never reach service", async () => {
  const run = proxy();
  assert.equal((await run(request(), "me")).status, 401);
  assert.equal((await run(request("admin/mint"), "admin/mint")).status, 404);
});

test("catalog query is bounded and only approved query keys are forwarded", async () => {
  const run = proxy({ fetch: async (url, options) => {
    assert.equal(new URL(url).searchParams.get("limit"), "24");
    assert.equal(new URL(url).searchParams.get("q"), "Amanita");
    assert.equal(new URL(url).searchParams.has("admin"), false);
    assert.equal(options.headers["x-user-id"], undefined);
    return json({ state: "empty", items: [], total: 0 });
  } });
  assert.equal((await run(request("catalog?limit=101"), "catalog")).status, 400);
  assert.equal((await run(request(`catalog?q=${"x".repeat(161)}`), "catalog")).status, 400);
  assert.equal((await run(request("catalog?q=Amanita&admin=true"), "catalog")).status, 200);
});

test("Supabase identity replaces caller headers; JWT and proxy secret do not leak into response", async () => {
  let calls = 0;
  const run = proxy({ fetch: async (url, options) => {
    calls += 1;
    if (calls === 1) {
      assert.equal(String(url), "https://auth.example.test/auth/v1/user");
      assert.equal(options.headers.Authorization, "Bearer actual-access-token");
      assert.equal(options.headers.apikey, "anon");
      return json({ id: userId });
    }
    assert.equal(String(url), "http://127.0.0.1:8095/v1/me");
    assert.equal(options.headers["x-user-id"], userId);
    assert.equal(options.headers["x-species-token-proxy-key"], "server-secret");
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.redirect, "error");
    return json({ userId, wallets: [], discoveries: [] });
  } });
  const response = await run(request("me", { headers: { Authorization: "Bearer actual-access-token", "x-user-id": "forged", "x-species-token-proxy-key": "forged" } }), "me");
  assert.equal(calls, 2);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal((await response.text()).includes("server-secret"), false);
});

test("invalid auth, missing auth config, and malformed Supabase identity fail closed", async () => {
  const req = () => request("rewards", { headers: { Authorization: "Bearer invalid" } });
  assert.equal((await proxy({ authConfigured: false })(req(), "rewards")).status, 503);
  assert.equal((await proxy({ fetch: async () => json({}, 401) })(req(), "rewards")).status, 401);
  assert.equal((await proxy({ fetch: async () => json({ id: "not-a-uuid" }) })(req(), "rewards")).status, 401);
});

test("discovery requests reject caller identity and oversized bodies before forwarding", async () => {
  let calls = 0;
  const run = proxy({ fetch: async () => { calls += 1; return json({ id: userId }); } });
  const post = (body) => request("discoveries", { method: "POST", headers: { Authorization: "Bearer token", "Content-Type": "application/json" }, body: JSON.stringify(body) });
  assert.equal((await run(post({ taxonId: "1", userId: "forged" }), "discoveries")).status, 400);
  assert.equal((await run(post({ evidenceUri: "x".repeat(17_000) }), "discoveries")).status, 413);
  assert.equal(calls, 2); // Both calls were identity checks; the service received neither request.
});

test("valid discovery carries only allowed evidence fields and verified user", async () => {
  const body = { taxonId: "taxon-1", source: "inaturalist", sourceRecordId: "obs-1", evidenceUri: "https://example.test/evidence", evidenceSha256: "a".repeat(64) };
  let calls = 0;
  const run = proxy({ fetch: async (_url, options) => {
    if (++calls === 1) return json({ id: userId });
    assert.deepEqual(JSON.parse(options.body), body);
    assert.equal(options.headers["x-user-id"], userId);
    return json({ id: "new-discovery", status: "pending" }, 201);
  } });
  const response = await run(request("discoveries", { method: "POST", headers: { Authorization: "Bearer token", "Content-Type": "application/json" }, body: JSON.stringify(body) }), "discoveries");
  assert.equal(response.status, 201);
});

test("upstream failures and excessive responses return unavailable", async () => {
  assert.equal((await proxy()(request("status"), "status")).status, 503);
  assert.equal((await proxy({ fetch: async () => json({ value: "x".repeat(1_000_001) }) })(request("status"), "status")).status, 503);
});
