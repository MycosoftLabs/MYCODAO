/**
 * LIVE STREAM ACQUISITION — rotate BTC/SOL/ETH and symbols mentioned in live news headlines.
 */

import type { PulseTicker } from "./pulseApi";
import type { BroadcastNewsLine } from "../data/studioPresets";

export interface AcquisitionQuote {
  symbol: string;
  label: string;
  price: string;
  change: string;
  up: boolean;
}

const ROTATION_ANCHORS = ["BTC", "SOL", "ETH"] as const;

const STABLECOINS = new Set(["USDT", "USDC", "DAI", "USDE", "FDUSD"]);

/** Word/alias → canonical ticker symbol */
const ALIAS_TO_SYMBOL: Record<string, string> = {
  BITCOIN: "BTC",
  BTC: "BTC",
  ETHEREUM: "ETH",
  ETHER: "ETH",
  ETH: "ETH",
  SOLANA: "SOL",
  SOL: "SOL",
  MYCO: "MYCO",
  MYCODAO: "MYCO",
  TETHER: "USDT",
  USDT: "USDT",
  USDC: "USDC",
  "USD COIN": "USDC",
  DAI: "DAI",
  AVALANCHE: "AVAX",
  AVAX: "AVAX",
  DOGE: "DOGE",
  DOGECOIN: "DOGE",
  XRP: "XRP",
  RIPPLE: "XRP",
  BNB: "BNB",
  ARBITRUM: "ARB",
  ARB: "ARB",
  OPTIMISM: "OP",
  OP: "OP",
  LINK: "LINK",
  CHAINLINK: "LINK",
  UNI: "UNI",
  UNISWAP: "UNI",
  BASE: "ETH",
  COINBASE: "ETH",
};

const DISPLAY_LABELS: Record<string, string> = {
  BTC: "Bitcoin CM",
  ETH: "Ethereum CM",
  SOL: "Solana CM",
  MYCO: "MYCO",
  USDT: "Tether USD",
  USDC: "USD Coin",
  DAI: "DAI Stable",
  AVAX: "Avalanche",
  DOGE: "Dogecoin",
  XRP: "Ripple",
  BNB: "BNB",
  ARB: "Arbitrum",
  OP: "Optimism",
  LINK: "Chainlink",
  UNI: "Uniswap",
};

/** Ordered patterns — longer phrases first where relevant */
const TEXT_PATTERNS: { re: RegExp; symbol: string }[] = [
  { re: /\bmy codao\b/gi, symbol: "MYCO" },
  { re: /\bmycodao\b/gi, symbol: "MYCO" },
  { re: /\busd coin\b/gi, symbol: "USDC" },
  { re: /\bstablecoin\b/gi, symbol: "USDT" },
  { re: /\bbitcoin\b/gi, symbol: "BTC" },
  { re: /\bethereum\b/gi, symbol: "ETH" },
  { re: /\bsolana\b/gi, symbol: "SOL" },
  { re: /\btether\b/gi, symbol: "USDT" },
  { re: /\bchainlink\b/gi, symbol: "LINK" },
  { re: /\barbitrum\b/gi, symbol: "ARB" },
  { re: /\boptimism\b/gi, symbol: "OP" },
  { re: /\bavalanche\b/gi, symbol: "AVAX" },
  { re: /\bdogecoin\b/gi, symbol: "DOGE" },
  { re: /\bripple\b/gi, symbol: "XRP" },
  { re: /\buniswap\b/gi, symbol: "UNI" },
  { re: /\bcoinbase\b/gi, symbol: "ETH" },
  { re: /\bbase\s+(chain|network|l2|ecosystem)\b/gi, symbol: "ETH" },
  { re: /\b(BTC|ETH|SOL|MYCO|USDT|USDC|DAI|AVAX|DOGE|XRP|BNB|ARB|OP|LINK|UNI)\b/gi, symbol: "" },
];

function normalizeSymbol(raw: string): string | null {
  const key = raw.trim().toUpperCase().replace(/\s+/g, " ");
  return ALIAS_TO_SYMBOL[key] ?? (key.length <= 6 ? key : null);
}

export function extractSymbolsFromNewsText(text: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();

  const add = (sym: string) => {
    const n = normalizeSymbol(sym);
    if (!n || seen.has(n)) return;
    seen.add(n);
    found.push(n);
  };

  for (const { re, symbol } of TEXT_PATTERNS) {
    re.lastIndex = 0;
    if (!re.test(text)) continue;
    if (symbol) {
      add(symbol);
      continue;
    }
    const matches = text.match(re);
    if (matches) {
      for (const m of matches) add(m);
    }
  }

  return found;
}

export function extractSymbolsFromNewsLines(lines: BroadcastNewsLine[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const blob = `${line.label} ${line.headline}`;
    for (const sym of extractSymbolsFromNewsText(blob)) {
      if (!seen.has(sym)) {
        seen.add(sym);
        out.push(sym);
      }
    }
  }
  return out;
}

function formatPrice(symbol: string, price: number): string {
  if (STABLECOINS.has(symbol)) return price.toFixed(3);
  if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(5);
}

function formatChange(pct: number): { change: string; up: boolean } {
  const up = pct >= 0;
  const sign = up ? "+" : "";
  return { change: `${sign}${pct.toFixed(2)}%`, up };
}

function placeholderQuote(symbol: string): AcquisitionQuote {
  return {
    symbol,
    label: DISPLAY_LABELS[symbol] ?? symbol,
    price: "—",
    change: "—",
    up: true,
  };
}

function tickerToQuote(symbol: string, ticker?: PulseTicker): AcquisitionQuote {
  if (!ticker || ticker.price <= 0) return placeholderQuote(symbol);
  const { change, up } = formatChange(ticker.changePct ?? 0);
  return {
    symbol,
    label: DISPLAY_LABELS[symbol] ?? ticker.name ?? symbol,
    price: formatPrice(symbol, ticker.price),
    change,
    up,
  };
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Build rotation pool: active headline symbols first, then shuffled anchors, then other news symbols.
 */
export function buildAcquisitionPool(
  tickers: PulseTicker[],
  lines: BroadcastNewsLine[],
  activeLineIndex: number
): AcquisitionQuote[] {
  const bySym = Object.fromEntries(tickers.map((t) => [t.symbol.toUpperCase(), t]));
  const quotes: AcquisitionQuote[] = [];
  const used = new Set<string>();

  const pushSymbol = (sym: string) => {
    const upper = sym.toUpperCase();
    if (used.has(upper)) return;
    used.add(upper);
    quotes.push(tickerToQuote(upper, bySym[upper]));
  };

  const activeLine = lines[activeLineIndex];
  if (activeLine) {
    const activeSyms = extractSymbolsFromNewsText(`${activeLine.label} ${activeLine.headline}`);
    for (const sym of activeSyms) pushSymbol(sym);
  }

  for (const sym of shuffle([...ROTATION_ANCHORS])) pushSymbol(sym);

  for (const sym of extractSymbolsFromNewsLines(lines)) pushSymbol(sym);

  if (!quotes.length) {
    for (const sym of ROTATION_ANCHORS) pushSymbol(sym);
  }

  return quotes;
}

export function pickNextAcquisitionIndex(pool: AcquisitionQuote[], prev: number): number {
  if (pool.length <= 1) return 0;
  let next = Math.floor(Math.random() * pool.length);
  let guard = 0;
  while (next === prev && guard < 8) {
    next = Math.floor(Math.random() * pool.length);
    guard++;
  }
  return next;
}

export const ACQUISITION_ROTATE_MS = 5000;
