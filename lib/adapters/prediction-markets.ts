/**
 * Live Polymarket + Kalshi prediction markets (public APIs, server-side).
 * Politics slice: Trump, senators, Congress, elections, etc.
 */

import type { PredictionMarketRow, PredictionMarketsBundle } from "@/lib/types";

const POLY_GAMMA = "https://gamma-api.polymarket.com";
const KALSHI_API = "https://api.elections.kalshi.com/trade-api/v2";

export const POLITICS_KEYWORDS = [
  "trump",
  "biden",
  "harris",
  "vance",
  "obama",
  "pelosi",
  "schumer",
  "mcconnell",
  "senate",
  "senator",
  "congress",
  "house",
  "gop",
  "republican",
  "democrat",
  "president",
  "election",
  "ballot",
  "primary",
  "impeach",
  "speaker",
  "cabinet",
  "desantis",
  "newsom",
  "mamdani",
  "dnc",
  "rnc",
  "fec",
  "governor",
  "vp ",
  "vice president",
  "white house",
  "scotus",
  "supreme court",
];

function formatUsd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function formatPct(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

export function isPoliticsTitle(title: string): boolean {
  const lower = title.toLowerCase();
  return POLITICS_KEYWORDS.some((kw) => lower.includes(kw));
}

function parseOutcomePrices(raw: unknown): { yes?: number; label?: string } {
  if (typeof raw !== "string") return {};
  try {
    const arr = JSON.parse(raw) as string[];
    const yes = parseFloat(arr[0] ?? "");
    return { yes: Number.isFinite(yes) ? yes : undefined };
  } catch {
    return {};
  }
}

type PolyMarket = {
  id?: string;
  question?: string;
  groupItemTitle?: string;
  slug?: string;
  volume24hr?: number;
  volume?: number;
  outcomePrices?: string;
  outcomes?: string;
  updatedAt?: string;
  category?: string;
};

type PolyEvent = {
  id?: string;
  title?: string;
  slug?: string;
  markets?: PolyMarket[];
  tags?: Array<{ slug?: string; label?: string }>;
};

async function fetchPolymarketTop(limit = 30): Promise<PredictionMarketRow[]> {
  const url = `${POLY_GAMMA}/markets?active=true&closed=false&order=volume24hr&ascending=false&limit=${limit}`;
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];

  const markets = (await res.json()) as PolyMarket[];
  if (!Array.isArray(markets)) return [];

  return markets.map((m, i) => {
    const { yes } = parseOutcomePrices(m.outcomePrices);
    const vol = m.volume24hr ?? m.volume ?? 0;
    const title = m.question || m.groupItemTitle || "Market";
    const slug = m.slug;
    return {
      id: String(m.id ?? `poly-${i}`),
      platform: "polymarket" as const,
      title,
      outcome: yes !== undefined ? `Yes ${formatPct(yes)}` : undefined,
      probability: yes !== undefined ? formatPct(yes) : undefined,
      probabilityNum: yes,
      volume: formatUsd(vol),
      volumeNum: vol,
      category: m.category,
      url: slug ? `https://polymarket.com/event/${slug}` : "https://polymarket.com/",
      updatedAt: m.updatedAt,
    };
  });
}

async function fetchPolymarketPoliticsEvents(limit = 25): Promise<PredictionMarketRow[]> {
  const url = `${POLY_GAMMA}/events?tag_slug=politics&active=true&closed=false&limit=${limit}`;
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];

  const events = (await res.json()) as PolyEvent[];
  if (!Array.isArray(events)) return [];

  const rows: PredictionMarketRow[] = [];
  for (const ev of events) {
    const eventTitle = ev.title || "Politics event";
    const eventSlug = ev.slug;
    const markets = ev.markets ?? [];
    for (const m of markets.slice(0, 4)) {
      const { yes } = parseOutcomePrices(m.outcomePrices);
      const vol = m.volume24hr ?? m.volume ?? 0;
      const q = m.question || m.groupItemTitle || eventTitle;
      const slug = m.slug || eventSlug;
      rows.push({
        id: String(m.id ?? `${ev.id}-${rows.length}`),
        platform: "polymarket",
        title: q,
        outcome: yes !== undefined ? `Yes ${formatPct(yes)}` : undefined,
        probability: yes !== undefined ? formatPct(yes) : undefined,
        probabilityNum: yes,
        volume: formatUsd(vol),
        volumeNum: vol,
        category: "politics",
        url: slug ? `https://polymarket.com/event/${slug}` : "https://polymarket.com/",
        updatedAt: m.updatedAt,
      });
    }
    if (!markets.length) {
      rows.push({
        id: String(ev.id ?? `poly-ev-${rows.length}`),
        platform: "polymarket",
        title: eventTitle,
        category: "politics",
        url: eventSlug ? `https://polymarket.com/event/${eventSlug}` : "https://polymarket.com/",
      });
    }
  }
  return rows;
}

type KalshiMarket = {
  ticker?: string;
  title?: string;
  subtitle?: string;
  yes_bid_dollars?: string;
  yes_ask_dollars?: string;
  last_price_dollars?: string;
  volume?: number;
  volume_24h?: number;
  category?: string;
  close_time?: string;
  event_ticker?: string;
};

type KalshiEvent = {
  event_ticker?: string;
  title?: string;
  category?: string;
  markets?: KalshiMarket[];
};

async function fetchKalshiOpenMarkets(limit = 80): Promise<PredictionMarketRow[]> {
  const url = `${KALSHI_API}/markets?status=open&limit=${limit}`;
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];

  const body = (await res.json()) as { markets?: KalshiMarket[] };
  const markets = body.markets;
  if (!Array.isArray(markets)) return [];

  return markets
    .filter((m) => (m.title || m.subtitle || "").length > 0)
    .map((m, i) => {
      const title = m.title || m.subtitle || "Kalshi market";
      const last = parseFloat(m.last_price_dollars ?? m.yes_bid_dollars ?? "");
      const prob = Number.isFinite(last) ? last : undefined;
      const vol = m.volume_24h ?? m.volume ?? 0;
      const ticker = m.ticker || m.event_ticker;
      return {
        id: String(ticker ?? `kalshi-${i}`),
        platform: "kalshi" as const,
        title,
        outcome: prob !== undefined ? `Yes ${formatPct(prob)}` : undefined,
        probability: prob !== undefined ? formatPct(prob) : undefined,
        probabilityNum: prob,
        volume: formatUsd(vol),
        volumeNum: vol,
        category: m.category,
        url: ticker ? `https://kalshi.com/markets/${ticker}` : "https://kalshi.com/",
        updatedAt: m.close_time,
      };
    })
    .sort((a, b) => (b.volumeNum ?? 0) - (a.volumeNum ?? 0));
}

async function fetchKalshiPolitics(): Promise<PredictionMarketRow[]> {
  const url = `${KALSHI_API}/events?status=open&limit=200`;
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const markets = await fetchKalshiOpenMarkets(150);
    return markets.filter((m) => isPoliticsTitle(m.title)).slice(0, 40);
  }

  const body = (await res.json()) as { events?: KalshiEvent[] };
  const events = body.events;
  if (!Array.isArray(events)) return [];

  const rows: PredictionMarketRow[] = [];
  for (const ev of events) {
    const title = ev.title || "";
    const cat = (ev.category || "").toLowerCase();
    const politics =
      cat.includes("politic") ||
      cat.includes("election") ||
      isPoliticsTitle(title);
    if (!politics) continue;

    const markets = ev.markets ?? [];
    if (markets.length) {
      for (const m of markets.slice(0, 3)) {
        const mTitle = m.title || m.subtitle || title;
        const last = parseFloat(m.last_price_dollars ?? m.yes_bid_dollars ?? "");
        const prob = Number.isFinite(last) ? last : undefined;
        const vol = m.volume_24h ?? m.volume ?? 0;
        const ticker = m.ticker || ev.event_ticker;
        rows.push({
          id: String(ticker ?? `kalshi-pol-${rows.length}`),
          platform: "kalshi",
          title: mTitle,
          outcome: prob !== undefined ? `Yes ${formatPct(prob)}` : undefined,
          probability: prob !== undefined ? formatPct(prob) : undefined,
          probabilityNum: prob,
          volume: formatUsd(vol),
          volumeNum: vol,
          category: "politics",
          url: ticker ? `https://kalshi.com/markets/${ticker}` : "https://kalshi.com/",
          updatedAt: m.close_time,
        });
      }
    } else {
      rows.push({
        id: String(ev.event_ticker ?? `kalshi-ev-${rows.length}`),
        platform: "kalshi",
        title,
        category: "politics",
        url: ev.event_ticker
          ? `https://kalshi.com/markets/${ev.event_ticker}`
          : "https://kalshi.com/",
      });
    }
  }

  if (rows.length) {
    return rows.sort((a, b) => (b.volumeNum ?? 0) - (a.volumeNum ?? 0)).slice(0, 50);
  }

  const fallback = await fetchKalshiOpenMarkets(150);
  return fallback.filter((m) => isPoliticsTitle(m.title)).slice(0, 40);
}

function dedupePolitics(rows: PredictionMarketRow[]): PredictionMarketRow[] {
  const seen = new Set<string>();
  const out: PredictionMarketRow[] = [];
  for (const r of rows) {
    const key = `${r.platform}:${r.title.toLowerCase().slice(0, 80)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out.sort((a, b) => (b.volumeNum ?? 0) - (a.volumeNum ?? 0));
}

export async function fetchPredictionMarkets(): Promise<PredictionMarketsBundle> {
  const apiKey = process.env.WHALE_ALERT_API_KEY?.trim();

  const [polymarketTop, polyPolitics, kalshi, kalshiPolitics] = await Promise.all([
    fetchPolymarketTop(35),
    fetchPolymarketPoliticsEvents(20),
    fetchKalshiOpenMarkets(60),
    fetchKalshiPolitics(),
  ]);

  const polyPoliticsFiltered = polyPolitics.filter((r) => isPoliticsTitle(r.title));
  const polyFromTop = polymarketTop.filter((r) => isPoliticsTitle(r.title));
  const politics = dedupePolitics([...polyPoliticsFiltered, ...polyFromTop, ...kalshiPolitics]);

  return {
    polymarket: polymarketTop,
    kalshi: kalshi.slice(0, 40),
    politics,
    fetchedAt: new Date().toISOString(),
    sources: {
      whaleAlertConfigured: Boolean(apiKey),
      polymarket: polymarketTop.length > 0 || polyPolitics.length > 0,
      kalshi: kalshi.length > 0 || kalshiPolitics.length > 0,
    },
  };
}
