/**
 * Client-side market bootstrap when /api/tickers is slow or unavailable.
 */

import { pulseApiUrl } from "./apiOrigin";
import type { PulseTicker } from "./pulseApi";

const COINGECKO_CRYPTO: { sym: string; id: string; name: string }[] = [
  { sym: "BTC", id: "bitcoin", name: "Bitcoin" },
  { sym: "ETH", id: "ethereum", name: "Ethereum" },
  { sym: "SOL", id: "solana", name: "Solana" },
  { sym: "BNB", id: "binancecoin", name: "BNB" },
  { sym: "XRP", id: "ripple", name: "Ripple" },
  { sym: "ADA", id: "cardano", name: "Cardano" },
  { sym: "AVAX", id: "avalanche-2", name: "Avalanche" },
  { sym: "LINK", id: "chainlink", name: "Chainlink" },
  { sym: "DOGE", id: "dogecoin", name: "Dogecoin" },
  { sym: "DOT", id: "polkadot", name: "Polkadot" },
  { sym: "ATOM", id: "cosmos", name: "Cosmos" },
  { sym: "UNI", id: "uniswap", name: "Uniswap" },
  { sym: "MATIC", id: "matic-network", name: "Polygon" },
  { sym: "NEAR", id: "near", name: "NEAR" },
  { sym: "ARB", id: "arbitrum", name: "Arbitrum" },
  { sym: "OP", id: "optimism", name: "Optimism" },
  { sym: "INJ", id: "injective-protocol", name: "Injective" },
  { sym: "TIA", id: "celestia", name: "Celestia" },
  { sym: "SUI", id: "sui", name: "Sui" },
  { sym: "SEI", id: "sei-network", name: "Sei" },
  { sym: "USDT", id: "tether", name: "Tether" },
  { sym: "USDC", id: "usd-coin", name: "USD Coin" },
];

const CRYPTO_HEADS = new Set(["BTC", "ETH", "SOL", "BNB", "XRP", "ADA"]);

export async function fetchBootstrapCryptoTickers(): Promise<PulseTicker[]> {
  const now = new Date().toISOString();
  let rows: PulseTicker[] = [];
  try {
    const ids = COINGECKO_CRYPTO.map((c) => c.id).join(",");
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { cache: "no-store", signal: AbortSignal.timeout(10_000) }
    );
    if (res.ok) {
      const data = (await res.json()) as Record<string, { usd?: number; usd_24h_change?: number }>;
      rows = COINGECKO_CRYPTO.map(({ sym, id, name }) => {
        const raw = data[id];
        if (!raw || typeof raw.usd !== "number" || raw.usd <= 0) return null;
        const changePct = typeof raw.usd_24h_change === "number" ? raw.usd_24h_change : 0;
        const price = raw.usd;
        const row: PulseTicker = {
          id: sym,
          symbol: sym,
          name,
          assetClass: "crypto",
          currency: "USD",
          price,
          change: (price * changePct) / 100,
          changePct,
          sessionChangePct: changePct,
          sparkline: Array.from({ length: 24 }, () => price),
          updatedAt: now,
        };
        return row;
      }).filter((t): t is PulseTicker => t !== null);
    }
  } catch {
    /* CoinGecko rate limit or network — fall through to Yahoo */
  }

  const hasHead = (sym: string) =>
    rows.some((t) => t.symbol.toUpperCase() === sym && t.price > 0 && Math.abs(t.changePct) > 0.0001);
  const needsYahoo = !rows.length || ["BTC", "ETH", "SOL"].some((s) => !hasHead(s));
  if (needsYahoo) {
    const yahoo = await fetchBootstrapYahooTickers();
    const bySym = new Map(rows.map((t) => [t.symbol.toUpperCase(), t]));
    for (const t of yahoo) {
      const sym = t.symbol.toUpperCase();
      if (!CRYPTO_HEADS.has(sym) && t.assetClass !== "crypto") continue;
      const existing = bySym.get(sym);
      const yahooHasChange = Math.abs(t.changePct) > 0.0001;
      const prevHasChange = existing && Math.abs(existing.changePct) > 0.0001;
      if (!existing || (yahooHasChange && !prevHasChange) || !prevHasChange) {
        bySym.set(sym, t);
      }
    }
    rows = Array.from(bySym.values());
  }

  return rows;
}

const STOOQ_QUICK: { sym: string; stooq: string; name: string; assetClass: string }[] = [
  { sym: "DOW", stooq: "^dji", name: "Dow Jones", assetClass: "equity" },
  { sym: "SPX", stooq: "^spx", name: "S&P 500", assetClass: "equity" },
  { sym: "NDX", stooq: "^ndx", name: "Nasdaq", assetClass: "equity" },
  { sym: "RUT", stooq: "^rut", name: "Russell 2000", assetClass: "equity" },
  { sym: "VIX", stooq: "^vix", name: "VIX", assetClass: "equity" },
  { sym: "GOLD", stooq: "xauusd", name: "Gold", assetClass: "precious_metals" },
  { sym: "OIL", stooq: "cl.f", name: "WTI Crude", assetClass: "commodity" },
  { sym: "US10Y", stooq: "10yusy.b", name: "US 10Y Treasury", assetClass: "forex" },
];

/** Bonds + commodities for Markets Now when /api/tickers is slow or missing ETFs. */
const STOOQ_BONDS_COMMODITIES: { sym: string; stooq: string; name: string; assetClass: string }[] = [
  { sym: "BRENT", stooq: "cb.f", name: "Brent Crude", assetClass: "commodity" },
  { sym: "NATGAS", stooq: "ng.f", name: "Natural Gas", assetClass: "commodity" },
  { sym: "SILVER", stooq: "xagusd", name: "Silver", assetClass: "precious_metals" },
  { sym: "PLAT", stooq: "xptusd", name: "Platinum", assetClass: "precious_metals" },
  { sym: "PALL", stooq: "xpdusd", name: "Palladium", assetClass: "precious_metals" },
  { sym: "HG", stooq: "hg.f", name: "Copper", assetClass: "commodity" },
  { sym: "COPPER", stooq: "hg.f", name: "Copper", assetClass: "commodity" },
  { sym: "US2Y", stooq: "2yt.us", name: "US 2Y Treasury", assetClass: "forex" },
  { sym: "US5Y", stooq: "5yt.us", name: "US 5Y Treasury", assetClass: "forex" },
  { sym: "US30Y", stooq: "30yt.us", name: "US 30Y Treasury", assetClass: "forex" },
  { sym: "TLT", stooq: "tlt.us", name: "20+ YR Treasury ETF", assetClass: "equity" },
  { sym: "IEF", stooq: "ief.us", name: "7-10 YR Treasury ETF", assetClass: "equity" },
  { sym: "SHY", stooq: "shy.us", name: "1-3 YR Treasury ETF", assetClass: "equity" },
  { sym: "HYG", stooq: "hyg.us", name: "High Yield Corp ETF", assetClass: "equity" },
  { sym: "LQD", stooq: "lqd.us", name: "Investment Grade ETF", assetClass: "equity" },
  { sym: "AGG", stooq: "agg.us", name: "US Aggregate Bond ETF", assetClass: "equity" },
  { sym: "BND", stooq: "bnd.us", name: "Total Bond ETF", assetClass: "equity" },
  { sym: "TIP", stooq: "tip.us", name: "TIPS ETF", assetClass: "equity" },
  { sym: "MUB", stooq: "mub.us", name: "Muni Bond ETF", assetClass: "equity" },
  { sym: "EMB", stooq: "emb.us", name: "EM Bond ETF", assetClass: "equity" },
  { sym: "VCIT", stooq: "vcit.us", name: "IG Corp Interm ETF", assetClass: "equity" },
];

async function fetchStooqRow(
  sym: string,
  stooq: string,
  name: string,
  assetClass: string
): Promise<PulseTicker | null> {
  try {
    const url = `https://stooq.com/q/l/?s=${encodeURIComponent(stooq)}&f=sd2t2ohlcv&h&e=csv`;
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(6_000),
      headers: { "User-Agent": "MycosoftPulse/1.0" },
    });
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split("\n");
    if (lines.length < 2) return null;
    const cols = lines[1].split(",");
    const open = parseFloat(cols[3] ?? "");
    const close = parseFloat(cols[6] ?? "");
    if (!Number.isFinite(close) || close <= 0) return null;
    const changePct = open > 0 ? ((close - open) / open) * 100 : 0;
    const now = new Date().toISOString();
    return {
      id: sym,
      symbol: sym,
      name,
      assetClass,
      currency: "USD",
      price: close,
      change: (close * changePct) / 100,
      changePct,
      sessionChangePct: changePct,
      sparkline: Array.from({ length: 24 }, () => close),
      updatedAt: now,
    };
  } catch {
    return null;
  }
}

/** Fast parallel Stooq quotes for headline indices when API is down. */
export async function fetchBootstrapEquityTickers(): Promise<PulseTicker[]> {
  const rows = await Promise.all(
    STOOQ_QUICK.map((e) => fetchStooqRow(e.sym, e.stooq, e.name, e.assetClass))
  );
  return rows.filter((t): t is PulseTicker => t !== null);
}

/** Yahoo-backed quick route on MYCODAO — bonds/commodities without Stooq/Finnhub. */
export async function fetchBootstrapYahooTickers(): Promise<PulseTicker[]> {
  const candidates = [pulseApiUrl("/api/tickers/quick"), "/api/tickers/quick"];
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as PulseTicker[];
      if (Array.isArray(data) && data.length) return data;
    } catch {
      /* try next */
    }
  }
  return [];
}

/** Bond ETFs + commodity futures when server tickers omit Markets Now categories. */
export async function fetchBootstrapBondCommodityTickers(): Promise<PulseTicker[]> {
  const yahoo = await fetchBootstrapYahooTickers();
  if (yahoo.length) return yahoo;

  const rows = await Promise.all(
    STOOQ_BONDS_COMMODITIES.map((e) => fetchStooqRow(e.sym, e.stooq, e.name, e.assetClass))
  );
  return rows.filter((t): t is PulseTicker => t !== null);
}
