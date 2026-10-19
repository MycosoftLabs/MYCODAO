import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MINT = process.env.MYCO_SOLANA_MINT?.trim() || "EzYEwn4R5tNkNGw4K2a5a58MJFQESdf1r4UJrV7cpUF3";
const POOL = process.env.MYCO_DEX_PAIR?.trim() || "FgCQoL7tcC1nkNazV5onEgWbm9UJ9nbzqo9rZCYm6Yi4";
const GT = "https://api.geckoterminal.com/api/v2/networks/solana";
const HEADERS = { Accept: "application/json;version=20230302" };
/** Pool reserve below this is treated as too thin to trade; the warning clears itself once reserves recover. */
const LOW_LIQUIDITY_USD = Number(process.env.MYCO_LOW_LIQUIDITY_USD) || 5_000;

const TIMEFRAMES = {
  day: { path: "day", aggregate: 1, limit: 1000, ttlMs: 10 * 60_000 },
  hour4: { path: "hour", aggregate: 4, limit: 500, ttlMs: 5 * 60_000 },
  hour1: { path: "hour", aggregate: 1, limit: 500, ttlMs: 3 * 60_000 },
  minute15: { path: "minute", aggregate: 15, limit: 500, ttlMs: 60_000 },
} as const;
type Timeframe = keyof typeof TIMEFRAMES;

interface Candle {
  t: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume_usd: number;
}

type LiquidityStatus = "active" | "low" | "none" | "unknown";

interface HistoryPayload {
  mint: string;
  pool: string;
  timeframe: Timeframe;
  dex: string | null;
  pool_name: string | null;
  pool_created_at: string | null;
  reserve_usd: number | null;
  price_usd: number | null;
  price_change_24h_pct: number | null;
  volume_24h_usd: number | null;
  transactions_24h: { buys: number; sells: number } | null;
  last_price_usd: number | null;
  last_trade_at: string | null;
  last_trade_day: string | null;
  all_time_high_usd: number | null;
  all_time_high_day: string | null;
  candles: Candle[];
  dexscreener_pairs_active: boolean;
  liquidity_status: LiquidityStatus;
  low_liquidity_threshold_usd: number;
  dexscreener_url: string;
  geckoterminal_url: string;
  source: string;
  fetched_at: string;
}

const cache = new Map<Timeframe, { at: number; body: HistoryPayload }>();

async function getJson(url: string): Promise<any | null> {
  const res = await fetch(url, { headers: HEADERS, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  return res.ok ? res.json() : null;
}

function num(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  return Number.isFinite(n) ? n : null;
}

function liquidityStatus(reserveUsd: number | null, dexActive: boolean): LiquidityStatus {
  if (reserveUsd == null) return dexActive ? "active" : "unknown";
  if (reserveUsd <= 1) return "none";
  if (reserveUsd < LOW_LIQUIDITY_USD) return "low";
  return "active";
}

const POOL_META_TTL_MS = 2 * 60_000;
let poolMeta: { at: number; pool: any | null; dex: any | null } | null = null;

/** Pool record + DexScreener status are shared by every timeframe to stay inside GeckoTerminal's rate limit. */
async function loadPoolMeta(): Promise<{ pool: any | null; dex: any | null }> {
  if (poolMeta && Date.now() - poolMeta.at < POOL_META_TTL_MS) return poolMeta;
  const [pool, dex] = await Promise.all([
    getJson(`${GT}/pools/${POOL}`).catch(() => null),
    fetch(`https://api.dexscreener.com/latest/dex/pairs/solana/${POOL}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
  ]);
  if (pool || !poolMeta) poolMeta = { at: Date.now(), pool, dex };
  return poolMeta;
}

async function load(tf: Timeframe): Promise<HistoryPayload> {
  const spec = TIMEFRAMES[tf];
  const [ohlcv, { pool, dex }] = await Promise.all([
    getJson(
      `${GT}/pools/${POOL}/ohlcv/${spec.path}?aggregate=${spec.aggregate}&limit=${spec.limit}&currency=usd&token=base`
    ).catch(() => null),
    loadPoolMeta(),
  ]);
  const rows: number[][] = ohlcv?.data?.attributes?.ohlcv_list ?? [];
  const candles: Candle[] = rows
    .map(([t, o, h, l, c, v]) => ({ t: t * 1000, open: o, high: h, low: l, close: c, volume_usd: v }))
    .sort((a, b) => a.t - b.t);
  const last = candles[candles.length - 1];
  const ath = candles.reduce<Candle | null>((best, c) => (!best || c.high > best.high ? c : best), null);
  const attrs = pool?.data?.attributes ?? {};
  const reserveUsd = num(attrs.reserve_in_usd);
  const dexActive = Array.isArray(dex?.pairs) && dex.pairs.length > 0;
  const tx24 = attrs.transactions?.h24;
  return {
    mint: MINT,
    pool: POOL,
    timeframe: tf,
    dex: pool?.data?.relationships?.dex?.data?.id ?? null,
    pool_name: attrs.name ?? null,
    pool_created_at: attrs.pool_created_at ?? null,
    reserve_usd: reserveUsd,
    price_usd: num(attrs.base_token_price_usd),
    price_change_24h_pct: num(attrs.price_change_percentage?.h24),
    volume_24h_usd: num(attrs.volume_usd?.h24),
    transactions_24h: tx24 ? { buys: Number(tx24.buys) || 0, sells: Number(tx24.sells) || 0 } : null,
    last_price_usd: last ? last.close : num(attrs.base_token_price_usd),
    last_trade_at: last ? new Date(last.t).toISOString() : null,
    last_trade_day: last ? new Date(last.t).toISOString().slice(0, 10) : null,
    all_time_high_usd: ath ? ath.high : null,
    all_time_high_day: ath ? new Date(ath.t).toISOString().slice(0, 10) : null,
    candles,
    dexscreener_pairs_active: dexActive,
    liquidity_status: liquidityStatus(reserveUsd, dexActive),
    low_liquidity_threshold_usd: LOW_LIQUIDITY_USD,
    dexscreener_url: `https://dexscreener.com/solana/${POOL}`,
    geckoterminal_url: `https://www.geckoterminal.com/solana/pools/${POOL}`,
    source: `GeckoTerminal ${tf} OHLCV + pool record; DexScreener pair status`,
    fetched_at: new Date().toISOString(),
  };
}

/** MYCO trading history from the canonical pool, available even when the pool has no current liquidity. */
export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get("tf") ?? "day";
  const tf: Timeframe = requested in TIMEFRAMES ? (requested as Timeframe) : "day";
  const hit = cache.get(tf);
  if (hit && Date.now() - hit.at < TIMEFRAMES[tf].ttlMs) return NextResponse.json(hit.body);
  try {
    const body = await load(tf);
    if (body.candles.length || !hit) cache.set(tf, { at: Date.now(), body });
    return NextResponse.json(cache.get(tf)!.body, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch (error) {
    if (hit) return NextResponse.json(hit.body);
    return NextResponse.json({ error: "MYCO history unavailable", detail: String(error) }, { status: 503 });
  }
}
