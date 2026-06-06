/**
 * Bottom crawl — live prices interleaved with live news headlines (no mock).
 */
import type { BroadcastNewsLine, StudioTickerSegment } from "../data/studioPresets";
import type { PulseTicker } from "./pulseApi";
import { cnbcScrollQuotePriority } from "./cnbcMarkets";

export interface CrawlQuote {
  sym: string;
  price: string;
  change: string;
  up: boolean;
}

function formatTickerPrice(t: PulseTicker): string {
  const p = t.price;
  const sym = t.symbol.toUpperCase();
  if (sym === "US10Y" || sym === "TNX") return `${p.toFixed(2)}%`;
  if (p >= 100_000) return p.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (p >= 1000) return p.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(2);
  if (p >= 0.01) return p.toFixed(4);
  return p.toFixed(6);
}

export function tickersToCrawlQuotes(tickers: PulseTicker[]): CrawlQuote[] {
  const priority = cnbcScrollQuotePriority();
  const bySym = Object.fromEntries(tickers.map((t) => [t.symbol.toUpperCase(), t]));
  const ordered: PulseTicker[] = [];

  for (const sym of priority) {
    const row = bySym[sym];
    if (row && row.price > 0) ordered.push(row);
  }
  for (const t of tickers) {
    if (!ordered.includes(t) && t.price > 0) ordered.push(t);
  }

  return ordered.slice(0, 14).map((t) => {
    const up = (t.changePct ?? 0) >= 0;
    const sign = up ? "+" : "";
    return {
      sym: t.symbol.toUpperCase(),
      price: formatTickerPrice(t),
      change: `${sign}${(t.changePct ?? 0).toFixed(2)}%`,
      up,
    };
  });
}

/** Alternate live quote (sym + price + change) with news headline snippets. */
const MARQUEE_FALLBACK_SYMBOLS = ["BTC", "ETH", "SOL", "SPX", "NDX", "DOW", "GOLD", "US10Y", "MYCO"] as const;

function fallbackMarqueeQuotes(): CrawlQuote[] {
  return MARQUEE_FALLBACK_SYMBOLS.map((sym) => ({
    sym,
    price: "—",
    change: "—",
    up: true,
  }));
}

export function buildLiveNewsTickerSegments(
  lines: BroadcastNewsLine[],
  tickers: PulseTicker[]
): StudioTickerSegment[] {
  const quotes = tickersToCrawlQuotes(tickers);
  const crawlQuotes = quotes.length ? quotes : fallbackMarqueeQuotes();
  const news = lines.slice(0, 16);
  const out: StudioTickerSegment[] = [];

  if (!news.length && !crawlQuotes.length) return [];

  if (!news.length) {
    for (const q of crawlQuotes) {
      out.push({
        kind: "quote",
        sym: q.sym,
        price: q.price,
        change: q.change,
        up: q.up,
        text: q.change,
      });
    }
    return out;
  }

  news.forEach((line, i) => {
    const q = crawlQuotes[i % Math.max(crawlQuotes.length, 1)];
    if (q) {
      out.push({
        kind: "quote",
        sym: q.sym,
        price: q.price,
        change: q.change,
        up: q.up,
        text: q.change,
      });
    }
    const snippet =
      line.headline.length > 52 ? `${line.headline.slice(0, 52)}…` : line.headline;
    out.push({ kind: "news", text: `${line.label}: ${snippet}` });
  });

  return out;
}
