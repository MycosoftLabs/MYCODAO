/**
 * Yahoo Finance chart API — fallback when Finnhub/Stooq/CoinGecko fail.
 * Used for bonds, commodities, indices, and crypto proxies.
 */

import type { Ticker } from "@/lib/types";

type YahooMeta = {
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  chartPreviousClose?: number;
  previousClose?: number;
};

function changePctFromYahooMeta(meta: YahooMeta, price: number): number {
  if (typeof meta.regularMarketChangePercent === "number" && Number.isFinite(meta.regularMarketChangePercent)) {
    return meta.regularMarketChangePercent;
  }
  const prev =
    typeof meta.chartPreviousClose === "number" && meta.chartPreviousClose > 0
      ? meta.chartPreviousClose
      : typeof meta.previousClose === "number" && meta.previousClose > 0
        ? meta.previousClose
        : null;
  if (prev && price > 0) return ((price - prev) / prev) * 100;
  return 0;
}

const YAHOO_MAP: Record<
  string,
  { yahoo: string; name: string; assetClass: Ticker["assetClass"] }
> = {
  BTC: { yahoo: "BTC-USD", name: "Bitcoin", assetClass: "crypto" },
  ETH: { yahoo: "ETH-USD", name: "Ethereum", assetClass: "crypto" },
  SOL: { yahoo: "SOL-USD", name: "Solana", assetClass: "crypto" },
  AVAX: { yahoo: "AVAX-USD", name: "Avalanche", assetClass: "crypto" },
  LINK: { yahoo: "LINK-USD", name: "Chainlink", assetClass: "crypto" },
  XRP: { yahoo: "XRP-USD", name: "Ripple", assetClass: "crypto" },
  ADA: { yahoo: "ADA-USD", name: "Cardano", assetClass: "crypto" },
  DOGE: { yahoo: "DOGE-USD", name: "Dogecoin", assetClass: "crypto" },
  DOT: { yahoo: "DOT-USD", name: "Polkadot", assetClass: "crypto" },
  BNB: { yahoo: "BNB-USD", name: "BNB", assetClass: "crypto" },
  MATIC: { yahoo: "MATIC-USD", name: "Polygon", assetClass: "crypto" },
  LTC: { yahoo: "LTC-USD", name: "Litecoin", assetClass: "crypto" },
  UNI: { yahoo: "UNI-USD", name: "Uniswap", assetClass: "crypto" },
  ATOM: { yahoo: "ATOM-USD", name: "Cosmos", assetClass: "crypto" },
  NEAR: { yahoo: "NEAR-USD", name: "NEAR", assetClass: "crypto" },
  ARB: { yahoo: "ARB-USD", name: "Arbitrum", assetClass: "crypto" },
  OP: { yahoo: "OP-USD", name: "Optimism", assetClass: "crypto" },
  INJ: { yahoo: "INJ-USD", name: "Injective", assetClass: "crypto" },
  TIA: { yahoo: "TIA-USD", name: "Celestia", assetClass: "crypto" },
  SUI: { yahoo: "SUI-USD", name: "Sui", assetClass: "crypto" },
  SHIB: { yahoo: "SHIB-USD", name: "Shiba Inu", assetClass: "crypto" },
  PEPE: { yahoo: "PEPE-USD", name: "Pepe", assetClass: "crypto" },
  AAVE: { yahoo: "AAVE-USD", name: "Aave", assetClass: "crypto" },
  FET: { yahoo: "FET-USD", name: "Fetch.ai", assetClass: "crypto" },
  RENDER: { yahoo: "RENDER-USD", name: "Render", assetClass: "crypto" },
  HBAR: { yahoo: "HBAR-USD", name: "Hedera", assetClass: "crypto" },
  FIL: { yahoo: "FIL-USD", name: "Filecoin", assetClass: "crypto" },
  ICP: { yahoo: "ICP-USD", name: "Internet Computer", assetClass: "crypto" },
  CRO: { yahoo: "CRO-USD", name: "Cronos", assetClass: "crypto" },
  USDT: { yahoo: "USDT-USD", name: "Tether USD", assetClass: "crypto" },
  USDC: { yahoo: "USDC-USD", name: "USD Coin", assetClass: "crypto" },
  DOW: { yahoo: "^DJI", name: "Dow Jones Industrial Average", assetClass: "equity" },
  SPX: { yahoo: "^GSPC", name: "S&P 500", assetClass: "equity" },
  NDX: { yahoo: "^IXIC", name: "Nasdaq Composite", assetClass: "equity" },
  RUT: { yahoo: "^RUT", name: "Russell 2000", assetClass: "equity" },
  RUA: { yahoo: "^RUA", name: "Russell 3000", assetClass: "equity" },
  VIX: { yahoo: "^VIX", name: "VIX Volatility", assetClass: "equity" },
  N225: { yahoo: "^N225", name: "Nikkei 225", assetClass: "equity" },
  FTSE: { yahoo: "^FTSE", name: "FTSE 100", assetClass: "equity" },
  DAX: { yahoo: "^GDAXI", name: "DAX", assetClass: "equity" },
  STOXX50: { yahoo: "^STOXX50E", name: "Euro STOXX 50", assetClass: "equity" },
  CAC: { yahoo: "^FCHI", name: "CAC 40", assetClass: "equity" },
  HSI: { yahoo: "^HSI", name: "Hang Seng", assetClass: "equity" },
  SSEC: { yahoo: "000001.SS", name: "Shanghai Composite", assetClass: "equity" },
  ASX: { yahoo: "^AXJO", name: "ASX 200", assetClass: "equity" },
  TSX: { yahoo: "^GSPTSE", name: "S&P/TSX Composite", assetClass: "equity" },
  KOSPI: { yahoo: "^KS11", name: "KOSPI", assetClass: "equity" },
  DXY: { yahoo: "DX-Y.NYB", name: "US Dollar Index", assetClass: "forex" },
  SPY: { yahoo: "SPY", name: "S&P 500 ETF", assetClass: "equity" },
  QQQ: { yahoo: "QQQ", name: "Nasdaq 100 ETF", assetClass: "equity" },
  IWM: { yahoo: "IWM", name: "Russell 2000 ETF", assetClass: "equity" },
  DIA: { yahoo: "DIA", name: "Dow ETF", assetClass: "equity" },
  AAPL: { yahoo: "AAPL", name: "Apple", assetClass: "equity" },
  MSFT: { yahoo: "MSFT", name: "Microsoft", assetClass: "equity" },
  NVDA: { yahoo: "NVDA", name: "NVIDIA", assetClass: "equity" },
  AMZN: { yahoo: "AMZN", name: "Amazon", assetClass: "equity" },
  GOOGL: { yahoo: "GOOGL", name: "Alphabet", assetClass: "equity" },
  META: { yahoo: "META", name: "Meta", assetClass: "equity" },
  TSLA: { yahoo: "TSLA", name: "Tesla", assetClass: "equity" },
  AMD: { yahoo: "AMD", name: "AMD", assetClass: "equity" },
  INTC: { yahoo: "INTC", name: "Intel", assetClass: "equity" },
  CRM: { yahoo: "CRM", name: "Salesforce", assetClass: "equity" },
  ORCL: { yahoo: "ORCL", name: "Oracle", assetClass: "equity" },
  NFLX: { yahoo: "NFLX", name: "Netflix", assetClass: "equity" },
  AVGO: { yahoo: "AVGO", name: "Broadcom", assetClass: "equity" },
  JPM: { yahoo: "JPM", name: "JPMorgan", assetClass: "equity" },
  GS: { yahoo: "GS", name: "Goldman Sachs", assetClass: "equity" },
  BAC: { yahoo: "BAC", name: "Bank of America", assetClass: "equity" },
  WMT: { yahoo: "WMT", name: "Walmart", assetClass: "equity" },
  XOM: { yahoo: "XOM", name: "Exxon Mobil", assetClass: "equity" },
  CVX: { yahoo: "CVX", name: "Chevron", assetClass: "equity" },
  DIS: { yahoo: "DIS", name: "Disney", assetClass: "equity" },
  PLTR: { yahoo: "PLTR", name: "Palantir", assetClass: "equity" },
  SMCI: { yahoo: "SMCI", name: "Super Micro", assetClass: "equity" },
  OIL: { yahoo: "CL=F", name: "WTI Crude Oil", assetClass: "commodity" },
  GOLD: { yahoo: "GC=F", name: "Gold Futures", assetClass: "precious_metals" },
  XAU: { yahoo: "GC=F", name: "Gold Futures", assetClass: "precious_metals" },
  SILVER: { yahoo: "SI=F", name: "Silver Futures", assetClass: "precious_metals" },
  BRENT: { yahoo: "BZ=F", name: "Brent Crude Oil", assetClass: "commodity" },
  NATGAS: { yahoo: "NG=F", name: "Natural Gas", assetClass: "commodity" },
  COPPER: { yahoo: "HG=F", name: "Copper Futures", assetClass: "commodity" },
  HG: { yahoo: "HG=F", name: "Copper Futures", assetClass: "commodity" },
  PLAT: { yahoo: "PL=F", name: "Platinum Futures", assetClass: "precious_metals" },
  PALL: { yahoo: "PA=F", name: "Palladium Futures", assetClass: "precious_metals" },
  US10Y: { yahoo: "^TNX", name: "US 10-Year Treasury Yield", assetClass: "forex" },
  TNX: { yahoo: "^TNX", name: "US 10-Year Treasury Yield", assetClass: "forex" },
  US2Y: { yahoo: "^IRX", name: "US 13-Week Treasury Bill", assetClass: "forex" },
  US5Y: { yahoo: "^FVX", name: "US 5-Year Treasury Yield", assetClass: "forex" },
  US30Y: { yahoo: "^TYX", name: "US 30-Year Treasury Yield", assetClass: "forex" },
  TLT: { yahoo: "TLT", name: "20+ Year Treasury ETF", assetClass: "equity" },
  IEF: { yahoo: "IEF", name: "7-10 Year Treasury ETF", assetClass: "equity" },
  SHY: { yahoo: "SHY", name: "1-3 Year Treasury ETF", assetClass: "equity" },
  HYG: { yahoo: "HYG", name: "High Yield Corporate ETF", assetClass: "equity" },
  LQD: { yahoo: "LQD", name: "Investment Grade Corp ETF", assetClass: "equity" },
  AGG: { yahoo: "AGG", name: "US Aggregate Bond ETF", assetClass: "equity" },
  BND: { yahoo: "BND", name: "Total Bond Market ETF", assetClass: "equity" },
  TIP: { yahoo: "TIP", name: "TIPS ETF", assetClass: "equity" },
  MUB: { yahoo: "MUB", name: "Municipal Bond ETF", assetClass: "equity" },
  EMB: { yahoo: "EMB", name: "EM Bond ETF", assetClass: "equity" },
  VCIT: { yahoo: "VCIT", name: "IG Corporate Bond ETF", assetClass: "equity" },
  USO: { yahoo: "USO", name: "WTI Crude ETF", assetClass: "commodity" },
  UNG: { yahoo: "UNG", name: "Natural Gas ETF", assetClass: "commodity" },
  SLV: { yahoo: "SLV", name: "Silver ETF", assetClass: "precious_metals" },
  CPER: { yahoo: "CPER", name: "Copper ETF", assetClass: "commodity" },
  BNO: { yahoo: "BNO", name: "Brent Crude ETF", assetClass: "commodity" },
};

async function fetchYahooMeta(yahooSym: string): Promise<YahooMeta | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MycosoftPulse/1.0)" },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { chart?: { result?: Array<{ meta?: YahooMeta }> } };
    return body.chart?.result?.[0]?.meta ?? null;
  } catch {
    return null;
  }
}

function metaToTicker(sym: string, meta: YahooMeta): Ticker | null {
  const map = YAHOO_MAP[sym];
  if (!map) return null;
  const price = meta.regularMarketPrice;
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) return null;
  const changePct = changePctFromYahooMeta(meta, price);
  const change = (price * changePct) / 100;
  const now = new Date().toISOString();
  return {
    id: sym,
    symbol: sym,
    name: map.name,
    assetClass: map.assetClass,
    currency: "USD",
    price,
    change,
    changePct,
    sessionChangePct: changePct,
    sparkline: Array.from({ length: 24 }, () => price),
    updatedAt: now,
  };
}

/** Parallel Yahoo quotes — fills bonds, commodities, indices when other feeds fail. */
export async function tickersFromYahoo(skipSymbols?: Set<string>): Promise<Ticker[]> {
  const symbols = Object.keys(YAHOO_MAP).filter((s) => !skipSymbols?.has(s));
  const out: Ticker[] = [];
  const BATCH = 12;

  for (let i = 0; i < symbols.length; i += BATCH) {
    const batch = symbols.slice(i, i + BATCH);
    const rows = await Promise.all(
      batch.map(async (sym) => {
        const map = YAHOO_MAP[sym];
        const meta = await fetchYahooMeta(map.yahoo);
        if (!meta) return null;
        return metaToTicker(sym, meta);
      })
    );
    for (const row of rows) {
      if (row) out.push(row);
    }
  }
  return out;
}
