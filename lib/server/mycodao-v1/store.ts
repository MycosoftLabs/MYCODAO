import "server-only";
import { readFile } from "fs/promises";
import path from "path";
import { mindexApiBase, mindexInternalHeaders } from "@/lib/server/pulse-env";

/**
 * mycodao/v1 content store.
 * Source of truth is MINDEX (`/api/mindex/mycodao/v1`). When MINDEX is unreachable, reads the local
 * mirror in `content/mycodao-v1/*.json` — the same records the MINDEX seed script loads — and labels
 * every response `source: "local_mirror"`.
 */

export const MIRROR_TABLES = [
  "content_items",
  "projects",
  "project_milestones",
  "funding_needs",
  "organizations",
  "media_items",
  "myco_spec",
  "myco_utilities",
  "fungip_offerings",
  "release_routes",
] as const;
export type MirrorTable = (typeof MIRROR_TABLES)[number];

export type ContentSource = "mindex" | "local_mirror";

const MIRROR_DIR = path.join(process.cwd(), "content", "mycodao-v1");
const PROBE_OK_TTL_MS = 60_000;
const PROBE_FAIL_TTL_MS = 10 * 60_000;
let probe: { ok: boolean; at: number } | null = null;

function mindexV1Base(): string | null {
  const base = mindexApiBase();
  return base ? `${base}/api/mindex/mycodao/v1` : null;
}

function mindexHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json", ...mindexInternalHeaders() };
  const apiKey = process.env.MINDEX_API_KEY?.trim();
  if (apiKey) headers["X-API-Key"] = apiKey;
  return headers;
}

export async function mindexReachable(): Promise<boolean> {
  if (process.env.MYCODAO_V1_SOURCE === "local") return false;
  const base = mindexV1Base();
  if (!base) return false;
  if (probe && Date.now() - probe.at < (probe.ok ? PROBE_OK_TTL_MS : PROBE_FAIL_TTL_MS)) return probe.ok;
  let ok = false;
  try {
    const res = await fetch(`${base}/health`, { headers: mindexHeaders(), cache: "no-store", signal: AbortSignal.timeout(2_500) });
    ok = res.ok;
  } catch {
    ok = false;
  }
  probe = { ok, at: Date.now() };
  return ok;
}

export async function contentSource(): Promise<ContentSource> {
  return (await mindexReachable()) ? "mindex" : "local_mirror";
}

/** GET a MINDEX mycodao/v1 path (with query) and return its JSON, or null on any failure. */
export async function mindexGet<T>(pathAndQuery: string): Promise<T | null> {
  const base = mindexV1Base();
  if (!base) return null;
  try {
    const res = await fetch(`${base}${pathAndQuery}`, { headers: mindexHeaders(), cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    probe = { ok: false, at: Date.now() };
    return null;
  }
}

const mirrorCache = new Map<MirrorTable, { at: number; value: unknown }>();

export async function readMirror<T>(table: MirrorTable): Promise<T> {
  const cached = mirrorCache.get(table);
  if (cached && Date.now() - cached.at < 10_000) return cached.value as T;
  const raw = await readFile(path.join(MIRROR_DIR, `${table}.json`), "utf8");
  const value = JSON.parse(raw) as T;
  mirrorCache.set(table, { at: Date.now(), value });
  return value;
}
