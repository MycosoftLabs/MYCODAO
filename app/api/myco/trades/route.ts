import { NextResponse } from "next/server";
import { fetchOnchainMycoSwaps } from "@/lib/server/myco-onchain-trades";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MINT = process.env.MYCO_SOLANA_MINT?.trim() || "EzYEwn4R5tNkNGw4K2a5a58MJFQESdf1r4UJrV7cpUF3";
const POOL = process.env.MYCO_DEX_PAIR?.trim() || "FgCQoL7tcC1nkNazV5onEgWbm9UJ9nbzqo9rZCYm6Yi4";
const TTL_MS = 10 * 60_000;
const DAILY_TTL_MS = 30 * 60_000;

interface MycoTrade {
  tx_hash: string;
  at: string;
  side: "buy" | "sell";
  price_usd: number | null;
  price_sol: number;
  myco_amount: number;
  sol_amount: number;
  volume_usd: number | null;
  wallet: string | null;
}

interface TradesBody {
  trades: MycoTrade[];
  pool: string;
  source: string;
  usd_basis: string;
  fetched_at: string;
}

let cached: { at: number; body: TradesBody } | null = null;
let dailyCloses: { at: number; byDay: Map<string, number> } | null = null;

/** MYCO daily USD closes, used to put a dollar value on each on-chain swap. */
async function loadDailyCloses(): Promise<Map<string, number>> {
  if (dailyCloses && Date.now() - dailyCloses.at < DAILY_TTL_MS) return dailyCloses.byDay;
  const byDay = new Map<string, number>();
  try {
    const res = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/solana/pools/${POOL}/ohlcv/day?limit=1000&currency=usd&token=base`,
      { headers: { Accept: "application/json;version=20230302" }, cache: "no-store", signal: AbortSignal.timeout(15_000) }
    );
    if (res.ok) {
      const rows: number[][] = (await res.json())?.data?.attributes?.ohlcv_list ?? [];
      for (const [t, , , , close] of rows) byDay.set(new Date(t * 1000).toISOString().slice(0, 10), close);
    }
  } catch {
    /* keep previous closes */
  }
  if (byDay.size || !dailyCloses) dailyCloses = { at: Date.now(), byDay };
  return dailyCloses.byDay;
}

/** Real MYCO / SOL swaps from the pool's on-chain history, newest first. */
export async function GET() {
  if (cached && Date.now() - cached.at < TTL_MS) return NextResponse.json(cached.body);
  try {
    const [swaps, closes] = await Promise.all([fetchOnchainMycoSwaps(POOL, MINT, 60), loadDailyCloses()]);
    const trades: MycoTrade[] = swaps.map((s) => {
      const close = closes.get(s.at.slice(0, 10)) ?? null;
      return {
        ...s,
        price_usd: close,
        volume_usd: close != null ? close * s.myco_amount : null,
      };
    });
    if (trades.length || !cached) {
      cached = {
        at: Date.now(),
        body: {
          trades,
          pool: POOL,
          source: "Solana mainnet: MYCO / SOL pool vault balance changes (QuickNode RPC)",
          usd_basis: "USD estimated at MYCO's GeckoTerminal daily close for the trade date",
          fetched_at: new Date().toISOString(),
        },
      };
    }
    return NextResponse.json(cached.body, { headers: { "Cache-Control": "public, max-age=120" } });
  } catch (error) {
    if (cached) return NextResponse.json(cached.body);
    return NextResponse.json({ trades: [], error: "MYCO trades unavailable", detail: String(error) }, { status: 503 });
  }
}
