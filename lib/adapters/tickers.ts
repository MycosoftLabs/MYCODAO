/**
 * Tickers: CoinGecko (crypto), Finnhub (US equities/ETFs when FINNHUB_API_KEY),
 * DexScreener for MYCO when MYCO_SOLANA_MINT is set. No synthetic prices.
 */

import type { Ticker } from "@/lib/types";
import {
  MYCO_CANONICAL_SOLANA_MINT,
  fetchLiveMycoQuote,
} from "@/lib/adapters/myco-price-sources";
import { tickerCacheTtlMs } from "@/lib/server/pulse-env";
import { tickersFromBioMarkets } from "@/lib/adapters/bio-markets";
import { tickersFromYahoo } from "@/lib/adapters/yahoo-quotes";

let cached: Ticker[] | null = null;
let cachedAt = 0;

export function invalidateTickerCache(): void {
  cached = null;
  cachedAt = 0;
}

export function peekTickerCacheFresh(): boolean {
  const ttl = tickerCacheTtlMs();
  return ttl > 0 && cached !== null && Date.now() - cachedAt < ttl;
}

/** Last good ticker batch — returned when a live fetch fails or returns empty. */
export function getStaleTickerCache(): Ticker[] {
  return cached ?? [];
}

export type FetchTickersOptions = {
  bypassCache?: boolean;
};

/** CoinGecko `/simple/price` ids */
const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  UNI: "uniswap",
  DOT: "polkadot",
  ATOM: "cosmos",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  LTC: "litecoin",
  BNB: "binancecoin",
  MATIC: "matic-network",
  NEAR: "near",
  ARB: "arbitrum",
  OP: "optimism",
  INJ: "injective-protocol",
  TIA: "celestia",
  SUI: "sui",
  SEI: "sei-network",
  USDT: "tether",
  USDC: "usd-coin",
  TRX: "tron",
  SHIB: "shiba-inu",
  PEPE: "pepe",
  RENDER: "render-token",
  AAVE: "aave",
  FET: "fetch-ai",
  TON: "the-open-network",
  HBAR: "hedera-hashgraph",
  FIL: "filecoin",
  ICP: "internet-computer",
  CRO: "crypto-com-chain",
};

const CRYPTO_META: Record<string, { name: string; assetClass: Ticker["assetClass"] }> = {
  BTC: { name: "Bitcoin", assetClass: "crypto" },
  ETH: { name: "Ethereum", assetClass: "crypto" },
  SOL: { name: "Solana", assetClass: "crypto" },
  AVAX: { name: "Avalanche", assetClass: "crypto" },
  LINK: { name: "Chainlink", assetClass: "crypto" },
  UNI: { name: "Uniswap", assetClass: "crypto" },
  DOT: { name: "Polkadot", assetClass: "crypto" },
  ATOM: { name: "Cosmos", assetClass: "crypto" },
  XRP: { name: "Ripple", assetClass: "crypto" },
  ADA: { name: "Cardano", assetClass: "crypto" },
  DOGE: { name: "Dogecoin", assetClass: "crypto" },
  LTC: { name: "Litecoin", assetClass: "crypto" },
  BNB: { name: "BNB", assetClass: "crypto" },
  MATIC: { name: "Polygon", assetClass: "crypto" },
  NEAR: { name: "NEAR", assetClass: "crypto" },
  ARB: { name: "Arbitrum", assetClass: "crypto" },
  OP: { name: "Optimism", assetClass: "crypto" },
  INJ: { name: "Injective", assetClass: "crypto" },
  TIA: { name: "Celestia", assetClass: "crypto" },
  SUI: { name: "Sui", assetClass: "crypto" },
  SEI: { name: "Sei", assetClass: "crypto" },
  USDT: { name: "Tether USD", assetClass: "crypto" },
  USDC: { name: "USD Coin", assetClass: "crypto" },
  TRX: { name: "TRON", assetClass: "crypto" },
  SHIB: { name: "Shiba Inu", assetClass: "crypto" },
  PEPE: { name: "Pepe", assetClass: "crypto" },
  RENDER: { name: "Render", assetClass: "crypto" },
  AAVE: { name: "Aave", assetClass: "crypto" },
  FET: { name: "Fetch.ai", assetClass: "crypto" },
  TON: { name: "Toncoin", assetClass: "crypto" },
  HBAR: { name: "Hedera", assetClass: "crypto" },
  FIL: { name: "Filecoin", assetClass: "crypto" },
  ICP: { name: "Internet Computer", assetClass: "crypto" },
  CRO: { name: "Cronos", assetClass: "crypto" },
};

/** Finnhub `quote` symbols (US). BRK.B → BRK-B. */
const FINNHUB_SYMBOL_MAP: Record<string, string> = {
  DOW: "^DJI",
  SPX: "^GSPC",
  NDX: "^IXIC",
  RUT: "^RUT",
  TNX: "^TNX",
  "BRK.B": "BRK-B",
  SPY: "SPY",
  QQQ: "QQQ",
  DXY: "UUP",
  VIX: "^VIX",
  US10Y: "^TNX",
  XAU: "OANDA:XAU_USD",
  AAPL: "AAPL",
  MSFT: "MSFT",
  NVDA: "NVDA",
  AMZN: "AMZN",
  GOOGL: "GOOGL",
  META: "META",
  JPM: "JPM",
  GS: "GS",
  V: "V",
  MA: "MA",
  UNH: "UNH",
  GOLD: "GLD",
  SILVER: "SLV",
  COPPER: "CPER",
  OIL: "USO",
  IWM: "IWM",
  DIA: "DIA",
  FXI: "FXI",
  BRENT: "BNO",
  NATGAS: "UNG",
  N225: "^N225",
  FTSE: "^FTSE",
  DAX: "^GDAXI",
  STOXX50: "^STOXX50E",
  CAC: "^FCHI",
  HSI: "^HSI",
  SSEC: "000001.SS",
  TSLA: "TSLA",
  AMD: "AMD",
  INTC: "INTC",
  CRM: "CRM",
  ORCL: "ORCL",
  NFLX: "NFLX",
  AVGO: "AVGO",
  JNJ: "JNJ",
  PG: "PG",
  WMT: "WMT",
  BAC: "BAC",
  XOM: "XOM",
  CVX: "CVX",
  DIS: "DIS",
  PLTR: "PLTR",
  SMCI: "SMCI",
  PLAT: "PLTM",
  PALL: "PALL",
  RUA: "^RUA",
  ASX: "^AXJO",
  AXJO: "^AXJO",
  TSX: "^GSPTSE",
  GSPTSE: "^GSPTSE",
  KOSPI: "^KS11",
  KS11: "^KS11",
  TLT: "TLT",
  IEF: "IEF",
  SHY: "SHY",
  HYG: "HYG",
  LQD: "LQD",
  AGG: "AGG",
  BND: "BND",
  TIP: "TIP",
  MUB: "MUB",
  EMB: "EMB",
  VCIT: "VCIT",
  US5Y: "^FVX",
};

const FINNHUB_META: Record<string, { name: string; assetClass: Ticker["assetClass"] }> = {
  DOW: { name: "Dow Jones Industrial Average", assetClass: "equity" },
  SPX: { name: "S&P 500", assetClass: "equity" },
  NDX: { name: "Nasdaq Composite", assetClass: "equity" },
  RUT: { name: "Russell 2000", assetClass: "equity" },
  TNX: { name: "US 10-Year Treasury Yield", assetClass: "forex" },
  XAU: { name: "Gold Spot", assetClass: "precious_metals" },
  "BRK.B": { name: "Berkshire Hathaway", assetClass: "equity" },
  SPY: { name: "S&P 500 ETF", assetClass: "equity" },
  QQQ: { name: "Nasdaq 100 ETF", assetClass: "equity" },
  DXY: { name: "US Dollar Index (proxy)", assetClass: "forex" },
  VIX: { name: "VIX Volatility", assetClass: "equity" },
  US10Y: { name: "US 10-Year Treasury Yield", assetClass: "forex" },
  AAPL: { name: "Apple", assetClass: "equity" },
  MSFT: { name: "Microsoft", assetClass: "equity" },
  NVDA: { name: "NVIDIA", assetClass: "equity" },
  AMZN: { name: "Amazon", assetClass: "equity" },
  GOOGL: { name: "Alphabet", assetClass: "equity" },
  META: { name: "Meta", assetClass: "equity" },
  JPM: { name: "JPMorgan", assetClass: "equity" },
  GS: { name: "Goldman Sachs", assetClass: "equity" },
  V: { name: "Visa", assetClass: "equity" },
  MA: { name: "Mastercard", assetClass: "equity" },
  UNH: { name: "UnitedHealth", assetClass: "equity" },
  GOLD: { name: "Gold", assetClass: "precious_metals" },
  SILVER: { name: "Silver (SLV)", assetClass: "precious_metals" },
  COPPER: { name: "Copper (CPER)", assetClass: "commodity" },
  OIL: { name: "WTI Crude (USO)", assetClass: "commodity" },
  IWM: { name: "Russell 2000 ETF", assetClass: "equity" },
  DIA: { name: "Dow ETF", assetClass: "equity" },
  FXI: { name: "China Large-Cap ETF", assetClass: "equity" },
  BRENT: { name: "Brent Crude (BNO)", assetClass: "commodity" },
  NATGAS: { name: "Natural Gas (UNG)", assetClass: "commodity" },
  N225: { name: "Nikkei 225", assetClass: "equity" },
  FTSE: { name: "FTSE 100", assetClass: "equity" },
  DAX: { name: "DAX", assetClass: "equity" },
  STOXX50: { name: "Euro STOXX 50", assetClass: "equity" },
  CAC: { name: "CAC 40", assetClass: "equity" },
  HSI: { name: "Hang Seng", assetClass: "equity" },
  SSEC: { name: "Shanghai Composite", assetClass: "equity" },
  TSLA: { name: "Tesla", assetClass: "equity" },
  AMD: { name: "AMD", assetClass: "equity" },
  INTC: { name: "Intel", assetClass: "equity" },
  CRM: { name: "Salesforce", assetClass: "equity" },
  ORCL: { name: "Oracle", assetClass: "equity" },
  NFLX: { name: "Netflix", assetClass: "equity" },
  AVGO: { name: "Broadcom", assetClass: "equity" },
  JNJ: { name: "Johnson & Johnson", assetClass: "equity" },
  PG: { name: "Procter & Gamble", assetClass: "equity" },
  WMT: { name: "Walmart", assetClass: "equity" },
  BAC: { name: "Bank of America", assetClass: "equity" },
  XOM: { name: "Exxon Mobil", assetClass: "equity" },
  CVX: { name: "Chevron", assetClass: "equity" },
  DIS: { name: "Disney", assetClass: "equity" },
  PLTR: { name: "Palantir", assetClass: "equity" },
  SMCI: { name: "Super Micro", assetClass: "equity" },
  PLAT: { name: "Platinum (PLTM)", assetClass: "precious_metals" },
  PALL: { name: "Palladium (PALL)", assetClass: "precious_metals" },
  RUA: { name: "Russell 3000", assetClass: "equity" },
  ASX: { name: "ASX 200", assetClass: "equity" },
  AXJO: { name: "ASX 200", assetClass: "equity" },
  TSX: { name: "S&P/TSX Composite", assetClass: "equity" },
  GSPTSE: { name: "S&P/TSX Composite", assetClass: "equity" },
  KOSPI: { name: "KOSPI", assetClass: "equity" },
  KS11: { name: "KOSPI", assetClass: "equity" },
  TLT: { name: "20+ Year Treasury ETF", assetClass: "equity" },
  IEF: { name: "7-10 Year Treasury ETF", assetClass: "equity" },
  SHY: { name: "1-3 Year Treasury ETF", assetClass: "equity" },
  HYG: { name: "High Yield Corporate ETF", assetClass: "equity" },
  LQD: { name: "Investment Grade Corp ETF", assetClass: "equity" },
  AGG: { name: "US Aggregate Bond ETF", assetClass: "equity" },
  BND: { name: "Total Bond Market ETF", assetClass: "equity" },
  TIP: { name: "TIPS ETF", assetClass: "equity" },
  MUB: { name: "Municipal Bond ETF", assetClass: "equity" },
  EMB: { name: "EM Bond ETF", assetClass: "equity" },
  VCIT: { name: "IG Corporate Bond ETF", assetClass: "equity" },
  US5Y: { name: "US 5-Year Treasury Yield", assetClass: "forex" },
};

type CgPrice = Record<string, { usd: number; usd_24h_change?: number }>;

async function fetchCoinGeckoPrices(): Promise<CgPrice | null> {
  const ids = Array.from(new Set(Object.values(COINGECKO_IDS))).join(",");
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
    { cache: "no-store", signal: AbortSignal.timeout(12_000) }
  );
  if (!res.ok) return null;
  return (await res.json()) as CgPrice;
}

function tickersFromCoinGecko(data: CgPrice): Ticker[] {
  const now = new Date().toISOString();
  const out: Ticker[] = [];
  for (const [symbol, id] of Object.entries(COINGECKO_IDS)) {
    const raw = data[id];
    const meta = CRYPTO_META[symbol];
    if (!raw || typeof raw.usd !== "number" || !meta) continue;
    const changePct = typeof raw.usd_24h_change === "number" ? raw.usd_24h_change : 0;
    const price = raw.usd;
    const change = (price * changePct) / 100;
    const sparkline = Array.from({ length: 24 }, () => price);
    out.push({
      id: symbol,
      symbol,
      name: meta.name,
      assetClass: meta.assetClass,
      currency: "USD",
      price,
      change,
      changePct,
      sessionChangePct: changePct,
      sparkline,
      updatedAt: now,
    });
  }
  return out;
}

type FinnhubQuote = { c?: number; d?: number; dp?: number; pc?: number };

type StooqRow = { close: number; open: number };

async function fetchStooqQuote(stooqSymbol: string): Promise<StooqRow | null> {
  try {
    const url = `https://stooq.com/q/l/?s=${encodeURIComponent(stooqSymbol)}&f=sd2t2ohlcv&h&e=csv`;
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "MycosoftPulse/1.0" },
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.includes("<!DOCTYPE")) return null;
    const lines = text.trim().split("\n");
    if (lines.length < 2) return null;
    const cols = lines[1].split(",");
    const open = parseFloat(cols[3] ?? "");
    const close = parseFloat(cols[6] ?? "");
    if (!Number.isFinite(close) || close <= 0) return null;
    return { close, open: Number.isFinite(open) ? open : close };
  } catch {
    return null;
  }
}

async function fetchFinnhubQuote(sym: string, apiKey: string): Promise<Ticker | null> {
  const fhSym = FINNHUB_SYMBOL_MAP[sym];
  const meta = FINNHUB_META[sym];
  if (!fhSym || !meta) return null;
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(fhSym)}&token=${apiKey}`;
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const q = (await res.json()) as FinnhubQuote;
    if (typeof q.c !== "number" || !Number.isFinite(q.c) || q.c <= 0) return null;
    const price = q.c;
    let changePct = typeof q.dp === "number" && Number.isFinite(q.dp) ? q.dp : 0;
    if (Math.abs(changePct) < 0.0001 && typeof q.pc === "number" && q.pc > 0) {
      changePct = ((price - q.pc) / q.pc) * 100;
    } else if (Math.abs(changePct) < 0.0001 && typeof q.d === "number" && Number.isFinite(q.d) && price > 0) {
      changePct = (q.d / price) * 100;
    }
    const change =
      typeof q.d === "number" && Number.isFinite(q.d)
        ? q.d
        : (price * changePct) / 100;
    const now = new Date().toISOString();
    return {
      id: sym,
      symbol: sym,
      name: meta.name,
      assetClass: meta.assetClass,
      currency: "USD",
      price,
      change,
      changePct,
      sessionChangePct: changePct,
      sparkline: Array.from({ length: 24 }, () => price),
      updatedAt: now,
    };
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function tickersFromFinnhub(apiKey: string): Promise<Ticker[]> {
  const symbols = Object.keys(FINNHUB_SYMBOL_MAP);
  const out: Ticker[] = [];
  const FINNHUB_BATCH = 12;

  for (let i = 0; i < symbols.length; i += FINNHUB_BATCH) {
    const batch = symbols.slice(i, i + FINNHUB_BATCH);
    const rows = await Promise.all(batch.map((sym) => fetchFinnhubQuote(sym, apiKey)));
    for (const row of rows) {
      if (row) out.push(row);
    }
    if (i + FINNHUB_BATCH < symbols.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  return out;
}

const STOOQ_SUPPLEMENT: {
  sym: string;
  stooq: string;
  name: string;
  assetClass: Ticker["assetClass"];
}[] = [
  { sym: "DOW", stooq: "^dji", name: "Dow Jones Industrial Average", assetClass: "equity" },
  { sym: "SPX", stooq: "^spx", name: "S&P 500", assetClass: "equity" },
  { sym: "NDX", stooq: "^ndx", name: "Nasdaq Composite", assetClass: "equity" },
  { sym: "RUT", stooq: "^rut", name: "Russell 2000", assetClass: "equity" },
  { sym: "VIX", stooq: "^vix", name: "VIX Volatility", assetClass: "equity" },
  { sym: "OIL", stooq: "cl.f", name: "WTI Crude Oil", assetClass: "commodity" },
  { sym: "XAU", stooq: "xauusd", name: "Gold Spot", assetClass: "precious_metals" },
  { sym: "GOLD", stooq: "xauusd", name: "Gold Spot", assetClass: "precious_metals" },
  { sym: "US10Y", stooq: "10yusy.b", name: "US 10-Year Treasury Yield", assetClass: "forex" },
  { sym: "TNX", stooq: "10yusy.b", name: "US 10-Year Treasury Yield", assetClass: "forex" },
  { sym: "US2Y", stooq: "2yt.us", name: "US 2-Year Treasury Yield", assetClass: "forex" },
  { sym: "US5Y", stooq: "5yt.us", name: "US 5-Year Treasury Yield", assetClass: "forex" },
  { sym: "US30Y", stooq: "30yt.us", name: "US 30-Year Treasury Yield", assetClass: "forex" },
  { sym: "SILVER", stooq: "xagusd", name: "Silver Spot", assetClass: "precious_metals" },
  { sym: "N225", stooq: "^n225", name: "Nikkei 225", assetClass: "equity" },
  { sym: "FTSE", stooq: "^ftse", name: "FTSE 100", assetClass: "equity" },
  { sym: "DAX", stooq: "^dax", name: "DAX", assetClass: "equity" },
  { sym: "STOXX50", stooq: "^sx5e", name: "Euro STOXX 50", assetClass: "equity" },
  { sym: "CAC", stooq: "^cac", name: "CAC 40", assetClass: "equity" },
  { sym: "HSI", stooq: "^hsi", name: "Hang Seng", assetClass: "equity" },
  { sym: "SSEC", stooq: "^ssec", name: "Shanghai Composite", assetClass: "equity" },
  { sym: "BRENT", stooq: "cb.f", name: "Brent Crude Oil", assetClass: "commodity" },
  { sym: "NATGAS", stooq: "ng.f", name: "Natural Gas", assetClass: "commodity" },
  { sym: "PLAT", stooq: "xptusd", name: "Platinum", assetClass: "precious_metals" },
  { sym: "PALL", stooq: "xpdusd", name: "Palladium", assetClass: "precious_metals" },
  { sym: "HG", stooq: "hg.f", name: "Copper Futures", assetClass: "commodity" },
  { sym: "COPPER", stooq: "hg.f", name: "Copper Futures", assetClass: "commodity" },
  { sym: "RUA", stooq: "^rua", name: "Russell 3000", assetClass: "equity" },
  { sym: "ASX", stooq: "^axjo", name: "ASX 200", assetClass: "equity" },
  { sym: "TSX", stooq: "^tsx", name: "S&P/TSX Composite", assetClass: "equity" },
  { sym: "KOSPI", stooq: "^kospi", name: "KOSPI", assetClass: "equity" },
  { sym: "TLT", stooq: "tlt.us", name: "20+ Year Treasury ETF", assetClass: "equity" },
  { sym: "IEF", stooq: "ief.us", name: "7-10 Year Treasury ETF", assetClass: "equity" },
  { sym: "SHY", stooq: "shy.us", name: "1-3 Year Treasury ETF", assetClass: "equity" },
  { sym: "HYG", stooq: "hyg.us", name: "High Yield Corporate ETF", assetClass: "equity" },
  { sym: "LQD", stooq: "lqd.us", name: "Investment Grade Corp ETF", assetClass: "equity" },
  { sym: "AGG", stooq: "agg.us", name: "US Aggregate Bond ETF", assetClass: "equity" },
  { sym: "BND", stooq: "bnd.us", name: "Total Bond Market ETF", assetClass: "equity" },
  { sym: "TIP", stooq: "tip.us", name: "TIPS ETF", assetClass: "equity" },
  { sym: "MUB", stooq: "mub.us", name: "Municipal Bond ETF", assetClass: "equity" },
  { sym: "EMB", stooq: "emb.us", name: "EM Bond ETF", assetClass: "equity" },
  { sym: "VCIT", stooq: "vcit.us", name: "IG Corporate Bond ETF", assetClass: "equity" },
  { sym: "USO", stooq: "uso.us", name: "WTI Crude ETF", assetClass: "commodity" },
  { sym: "UNG", stooq: "ung.us", name: "Natural Gas ETF", assetClass: "commodity" },
  { sym: "SLV", stooq: "slv.us", name: "Silver ETF", assetClass: "precious_metals" },
  { sym: "CPER", stooq: "cper.us", name: "Copper ETF", assetClass: "commodity" },
  { sym: "BNO", stooq: "bno.us", name: "Brent Crude ETF", assetClass: "commodity" },
];

function tickerFromStooqRow(
  entry: (typeof STOOQ_SUPPLEMENT)[number],
  q: StooqRow
): Ticker {
  const changePct = q.open > 0 ? ((q.close - q.open) / q.open) * 100 : 0;
  const now = new Date().toISOString();
  return {
    id: entry.sym,
    symbol: entry.sym,
    name: entry.name,
    assetClass: entry.assetClass,
    currency: "USD",
    price: q.close,
    change: (q.close * changePct) / 100,
    changePct,
    sessionChangePct: changePct,
    sparkline: Array.from({ length: 24 }, () => q.close),
    updatedAt: now,
  };
}

/** Stooq fills bonds/commodities/yields when Finnhub is slow or missing symbols. */
async function tickersFromStooqSupplement(skipSymbols: Set<string>): Promise<Ticker[]> {
  const missing = STOOQ_SUPPLEMENT.filter((entry) => !skipSymbols.has(entry.sym));
  const out: Ticker[] = [];
  const STOOQ_BATCH = 10;

  for (let i = 0; i < missing.length; i += STOOQ_BATCH) {
    const batch = missing.slice(i, i + STOOQ_BATCH);
    const rows = await Promise.all(
      batch.map(async (entry) => {
        const q = await fetchStooqQuote(entry.stooq);
        if (!q) return null;
        return tickerFromStooqRow(entry, q);
      })
    );
    for (const row of rows) {
      if (row) out.push(row);
    }
    if (i + STOOQ_BATCH < missing.length) {
      await new Promise((r) => setTimeout(r, 120));
    }
  }
  return out;
}

async function tickerFromLiveMyco(mint: string): Promise<Ticker | null> {
  const quote = await fetchLiveMycoQuote(mint);
  if (!quote) return null;
  const now = new Date().toISOString();
  const change = (quote.priceUsd * quote.change24h) / 100;
  const sparkline = Array.from({ length: 24 }, () => quote.priceUsd);
  return {
    id: "MYCO",
    symbol: "MYCO",
    name: "MYCO",
    assetClass: "bio",
    currency: "USD",
    price: quote.priceUsd,
    changePct: quote.change24h,
    change,
    sessionChangePct: quote.change24h,
    sparkline,
    updatedAt: now,
  };
}

export async function fetchTickers(opts?: FetchTickersOptions): Promise<Ticker[]> {
  const ttl = tickerCacheTtlMs();
  if (!opts?.bypassCache && ttl > 0 && cached !== null && Date.now() - cachedAt < ttl) {
    return cached;
  }
  if (opts?.bypassCache) {
    invalidateTickerCache();
  }

  const bySymbol = new Map<string, Ticker>();
  const finnhubKey = process.env.FINNHUB_API_KEY?.trim();
  const mycoMint = MYCO_CANONICAL_SOLANA_MINT;
  const previousCache = cached ? [...cached] : [];

  const [cgResult, yahooResult, fhResult, mycoResult] = await Promise.allSettled([
    fetchCoinGeckoPrices().then((cg) => (cg && Object.keys(cg).length > 0 ? tickersFromCoinGecko(cg) : [])),
    tickersFromYahoo(new Set()),
    finnhubKey
      ? withTimeout(tickersFromFinnhub(finnhubKey), 15_000, [])
      : Promise.resolve([] as Ticker[]),
    tickerFromLiveMyco(mycoMint),
  ]);

  if (yahooResult.status === "fulfilled") {
    for (const t of yahooResult.value) {
      if (!bySymbol.has(t.symbol)) bySymbol.set(t.symbol, t);
    }
  }
  if (cgResult.status === "fulfilled") {
    for (const t of cgResult.value) {
      const existing = bySymbol.get(t.symbol);
      const cgHasChange = typeof t.changePct === "number" && Math.abs(t.changePct) > 0.0001;
      const prevHasChange =
        existing && typeof existing.changePct === "number" && Math.abs(existing.changePct) > 0.0001;
      if (existing && !cgHasChange && prevHasChange) {
        bySymbol.set(t.symbol, {
          ...t,
          changePct: existing.changePct,
          change: existing.change,
          sessionChangePct: existing.sessionChangePct ?? existing.changePct,
        });
      } else {
        bySymbol.set(t.symbol, t);
      }
    }
  }
  if (fhResult.status === "fulfilled") {
    for (const t of fhResult.value) {
      const existing = bySymbol.get(t.symbol);
      const fhHasChange = typeof t.changePct === "number" && Math.abs(t.changePct) > 0.0001;
      const prevHasChange =
        existing && typeof existing.changePct === "number" && Math.abs(existing.changePct) > 0.0001;
      if (existing && !fhHasChange && prevHasChange) {
        bySymbol.set(t.symbol, {
          ...t,
          changePct: existing.changePct,
          change: existing.change,
          sessionChangePct: existing.sessionChangePct ?? existing.changePct,
        });
      } else {
        bySymbol.set(t.symbol, t);
      }
    }
  }
  if (mycoResult.status === "fulfilled" && mycoResult.value) {
    bySymbol.set("MYCO", mycoResult.value);
  }

  try {
    const bioRows = await tickersFromBioMarkets();
    for (const t of bioRows) {
      bySymbol.set(t.symbol, t);
    }
  } catch {
    /* bio.xyz optional */
  }

  const cryptoCount = [...bySymbol.values()].filter((t) => t.assetClass === "crypto").length;
  const needStooq =
    cryptoCount < 8 ||
    !bySymbol.has("BTC") ||
    !bySymbol.has("ETH") ||
    !bySymbol.has("SPX") ||
    bySymbol.size < 55;
  if (needStooq) {
    const stooqRows = await withTimeout(tickersFromStooqSupplement(new Set(bySymbol.keys())), 15_000, []);
    for (const t of stooqRows) {
      if (!bySymbol.has(t.symbol)) bySymbol.set(t.symbol, t);
    }
  }

  const bioInBatch = [...bySymbol.values()].filter((t) => t.assetClass === "bio").length;
  const cryptoInBatch = [...bySymbol.values()].filter((t) => t.assetClass === "crypto").length;
  if (previousCache.length > 0) {
    for (const t of previousCache) {
      if (t.assetClass === "bio" && bioInBatch < 3 && !bySymbol.has(t.symbol)) {
        bySymbol.set(t.symbol, t);
      }
      if (t.assetClass === "crypto" && cryptoInBatch < 12 && !bySymbol.has(t.symbol)) {
        bySymbol.set(t.symbol, t);
      }
    }
  }

  const out = Array.from(bySymbol.values());

  if (out.length === 0) {
    if (previousCache.length > 0) return previousCache;
    return [];
  }

  if (previousCache.length > 0 && out.length < previousCache.length * 0.6) {
    const merged = new Map<string, Ticker>();
    for (const t of previousCache) merged.set(t.symbol, t);
    for (const t of out) merged.set(t.symbol, t);
    const mergedOut = Array.from(merged.values());
    cached = mergedOut;
    cachedAt = Date.now();
    return mergedOut;
  }

  cached = out;
  cachedAt = Date.now();
  return out;
}
