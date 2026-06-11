/**
 * Server-only env helpers for Pulse API routes and adapters.
 */

export function masApiBase(): string {
  return (process.env.MAS_API_URL || "").replace(/\/$/, "");
}

export function mindexApiBase(): string {
  return (process.env.MINDEX_API_URL || "").replace(/\/$/, "");
}

export function natureOsApiBase(): string {
  return (process.env.NATUREOS_API_URL || "").replace(/\/$/, "");
}

/** Headers for MINDEX internal zone when MINDEX_INTERNAL_TOKEN is set. */
export function mindexInternalHeaders(): Record<string, string> {
  const t = process.env.MINDEX_INTERNAL_TOKEN?.trim();
  if (!t) return {};
  return { "X-Internal-Token": t };
}

/** Headers for MINDEX `/api/mindex/taxa` (requires X-API-Key when API_KEYS is configured). */
export function mindexApiKeyHeaders(): Record<string, string> {
  const key = process.env.MINDEX_API_KEY?.trim();
  if (!key) return {};
  return { "X-API-Key": key };
}

/** Normalize MINDEX API root to include `/api/mindex` when only host:port is set. */
export function mindexApiRoot(): string {
  const base = mindexApiBase();
  if (!base) return "";
  if (base.endsWith("/api/mindex")) return base;
  return `${base}/api/mindex`;
}

/** Aggressive refresh defaults for private fiber / colocated ingest (still bounded by upstream APIs). */
export function pulseTradeFastPath(): boolean {
  return process.env.PULSE_TRADE_FAST_PATH === "true" || process.env.PULSE_TRADE_FAST_PATH === "1";
}

/**
 * Server-side ticker merge cache. On LAN, use low values (e.g. 100–400) or 0 to always merge fresh.
 * When `PULSE_TRADE_FAST_PATH=1` and unset, defaults to 400ms (not 60s).
 */
export function tickerCacheTtlMs(): number {
  const raw = process.env.PULSE_TICKER_CACHE_MS?.trim();
  if (raw === "0") return 0;
  if (raw != null && raw !== "") {
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n)) return Math.max(0, n);
  }
  return pulseTradeFastPath() ? 400 : 60_000;
}

/** How often `/api/pulse/stream` pushes a ticker snapshot (ms). Min 50. */
export function pulseSseIntervalMs(): number {
  const raw = process.env.PULSE_SSE_INTERVAL_MS?.trim();
  const n = raw != null && raw !== "" ? parseInt(raw, 10) : NaN;
  const v = Number.isNaN(n) ? (pulseTradeFastPath() ? 150 : 2000) : n;
  return Math.max(50, v);
}

/** If true, each SSE tick bypasses the merge cache (forces upstream fetches when TTL would otherwise hit). */
export function pulseStreamBypassCache(): boolean {
  return process.env.PULSE_STREAM_BYPASS_CACHE === "true" || process.env.PULSE_STREAM_BYPASS_CACHE === "1";
}

/** LAN/dev only: allow POST /api/pulse/mas-task without internal key (never enable in production). */
export function pulseAllowOpenMasProxy(): boolean {
  return process.env.PULSE_ALLOW_OPEN_MAS_PROXY === "true" || process.env.PULSE_ALLOW_OPEN_MAS_PROXY === "1";
}

/** Server-side auth for Pulse → MAS proxy routes. Compare with `x-pulse-internal-key` header. */
export function verifyPulseInternalKey(headerValue: string | null | undefined): boolean {
  if (pulseAllowOpenMasProxy()) return true;
  const secret = process.env.PULSE_MAS_PROXY_SECRET?.trim();
  if (!secret) return false;
  return (headerValue ?? "").trim() === secret;
}
