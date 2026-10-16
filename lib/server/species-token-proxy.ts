import "server-only";
import { NextResponse } from "next/server";
import { getPublicSupabaseConfig } from "@/lib/server/supabase-public";

type Endpoint = "catalog" | "status" | "me" | "rewards" | "discoveries" | "wallet/challenge" | "wallet/verify";

const PRIVATE_ENDPOINTS = new Set<Endpoint>(["me", "rewards", "discoveries", "wallet/challenge", "wallet/verify"]);
const ENDPOINTS = new Set<Endpoint>(["catalog", "status", ...PRIVATE_ENDPOINTS]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 16_384;
const RESPONSE_LIMIT_BYTES = 1_000_000;

function failure(message: string, reason: string, status: number) {
  return NextResponse.json({ state: "unavailable", error: message, reason }, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function serviceConfig() {
  const rawUrl = process.env.SPECIES_TOKEN_SERVICE_URL?.trim();
  const key = process.env.SPECIES_TOKEN_PROXY_KEY?.trim();
  if (!rawUrl || !key) return null;
  try {
    const url = new URL(rawUrl);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) return null;
    return { url: url.toString().replace(/\/$/, ""), key };
  } catch { return null; }
}

async function verifiedUser(request: Request): Promise<{ userId: string } | { response: NextResponse }> {
  const bearer = request.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1];
  if (!bearer || bearer.length > 16_384) return { response: failure("Sign in to access your contributions and rewards.", "authentication_required", 401) };
  const { supabaseUrl, supabaseAnonKey } = getPublicSupabaseConfig();
  if (!supabaseUrl || !supabaseAnonKey) return { response: failure("Account verification is not configured.", "auth_unconfigured", 503) };
  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${bearer}`, apikey: supabaseAnonKey },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 401 || response.status === 403) return { response: failure("Your session has expired. Please sign in again.", "invalid_session", 401) };
    if (!response.ok) return { response: failure("Account verification is temporarily unavailable.", "auth_unavailable", 503) };
    const user = await response.json();
    if (typeof user?.id !== "string" || !UUID.test(user.id)) return { response: failure("The account could not be verified.", "invalid_session", 401) };
    return { userId: user.id };
  } catch {
    return { response: failure("Account verification is temporarily unavailable.", "auth_unavailable", 503) };
  }
}

/** Bounded JSON reader: do not buffer arbitrary upstream or request bodies. */
async function boundedText(stream: ReadableStream<Uint8Array> | null, maxBytes: number) {
  if (!stream) return "";
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let output = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new Error("body_too_large");
      }
      output += decoder.decode(value, { stream: true });
    }
    return output + decoder.decode();
  } finally { reader.releaseLock(); }
}

/** Only literal, explicitly exposed endpoints call this helper. Never forward caller identity headers. */
export async function speciesTokenProxy(request: Request, endpoint: Endpoint): Promise<NextResponse> {
  if (!ENDPOINTS.has(endpoint)) return failure("Endpoint not found.", "not_found", 404);
  const method = endpoint === "discoveries" || endpoint.startsWith("wallet/") ? "POST" : "GET";
  if (request.method !== method) return failure("Method not supported.", "method_not_allowed", 405);
  const config = serviceConfig();
  if (!config) return failure("The species token service is not configured. No tokens or rewards are available from this connection.", "service_unconfigured", 503);

  const headers: Record<string, string> = { "x-species-token-proxy-key": config.key, Accept: "application/json" };
  if (PRIVATE_ENDPOINTS.has(endpoint)) {
    const auth = await verifiedUser(request);
    if ("response" in auth) return auth.response;
    headers["x-user-id"] = auth.userId;
  }
  const url = new URL(`${config.url}/v1/${endpoint}`);
  if (endpoint === "catalog") {
    const query = new URL(request.url).searchParams;
    const offset = query.get("offset") || "0";
    const limit = query.get("limit") || "24";
    const q = query.get("q") || "";
    if (!/^\d{1,9}$/.test(offset) || !/^\d{1,3}$/.test(limit) || Number(limit) < 1 || Number(limit) > 100 || q.length > 160) {
      return failure("Use an offset of zero or greater, a limit from 1 to 100, and a search of up to 160 characters.", "invalid_query", 400);
    }
    url.searchParams.set("offset", offset);
    url.searchParams.set("limit", limit);
    if (q.trim()) url.searchParams.set("q", q.trim());
  }
  let body: string | undefined;
  if (method === "POST") {
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return failure("Send a JSON request.", "invalid_content_type", 415);
    try {
      const raw = await boundedText(request.body, MAX_BODY_BYTES);
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid_json");
      // Identity and administrative fields are never accepted by these user routes.
      const fields = endpoint === "discoveries"
        ? ["taxonId", "source", "sourceRecordId", "evidenceUri", "evidenceSha256"]
        : endpoint === "wallet/challenge" ? ["wallet"] : ["wallet", "nonce", "signatureBase64"];
      if (Object.keys(parsed).some((field) => !fields.includes(field))) return failure("The request includes unsupported fields.", "invalid_fields", 400);
      body = JSON.stringify(parsed);
      headers["Content-Type"] = "application/json";
    } catch (error) {
      return failure("The request must contain a JSON object smaller than 16 KB.", "invalid_body", error instanceof Error && error.message === "body_too_large" ? 413 : 400);
    }
  }
  try {
    const upstream = await fetch(url, { method, headers, body, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000) });
    const raw = await boundedText(upstream.body, RESPONSE_LIMIT_BYTES);
    const payload = JSON.parse(raw);
    if (!payload || typeof payload !== "object") throw new Error("invalid_response");
    return NextResponse.json(payload, { status: upstream.status, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return failure("The species token service is temporarily unavailable. Please try again later.", "service_unavailable", 503);
  }
}
