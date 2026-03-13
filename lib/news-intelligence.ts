import type { NewsItem, Ticker } from "./types";

export type NewsClass = "nowMoving" | "upcomingCatalyst" | "ecosystem";

export type NewsWithClass = NewsItem & { newsClass: NewsClass };

/** Importance for upcoming catalysts / events (market impact). */
export type CatalystImportance = "high" | "medium" | "low";

/** Enriched news item: classification + catalyst tags, related symbols, importance. */
export type NewsWithIntelligence = NewsWithClass & {
  catalystTags: string[];
  relatedSymbols: string[];
  importance: CatalystImportance;
};

/** One-line "why it's moving" context for a symbol. */
export type WhyMoving = {
  symbol: string;
  summary: string;
  headlineIds: string[];
};

const MOVER_TAGS = ["nvda", "gold", "sol", "solana", "myco", "earnings", "rates", "dxy", "fed", "macro", "ai ", "analyst"];
const CATALYST_TAGS = ["earnings", "cpi", "fomc", "rates", "release", "conference", "upcoming"];
const ECOSYSTEM_TAGS = ["mycodao", "myco", "governance", "proposal", "grant", "partnership", "funding", "biobank", "dao"];

/** Tag/keyword → likely symbols (for related-asset extraction). */
const TAG_TO_SYMBOLS: Record<string, string[]> = {
  nvda: ["NVDA"],
  solana: ["SOL"],
  sol: ["SOL"],
  bitcoin: ["BTC"],
  btc: ["BTC"],
  ethereum: ["ETH"],
  eth: ["ETH"],
  spy: ["SPY"],
  dxy: ["DXY"],
  fed: ["DXY", "SPY"],
  rates: ["DXY", "US10Y", "GOLD"],
  gold: ["GOLD"],
  commodities: ["GOLD", "OIL", "COPPER"],
  oil: ["OIL"],
  copper: ["COPPER"],
  myco: ["MYCO"],
  mycodao: ["MYCO"],
  governance: ["MYCO"],
  grant: ["MYCO"],
  grants: ["MYCO"],
  biobank: ["MYCO"],
  tech: ["NVDA", "AAPL", "MSFT"],
  earnings: ["NVDA", "AAPL", "MSFT"],
  defi: ["SOL", "ETH"],
  l2: ["ETH"],
};

/** Known symbols to detect in title/summary/tags (order matters: longer first). */
const SYMBOLS_IN_TEXT = ["MYCO", "NVDA", "Solana", "SOL", "Bitcoin", "BTC", "Ethereum", "ETH", "SPY", "DXY", "gold", "GOLD", "oil", "OIL", "copper", "COPPER"];

function extractRelatedSymbols(item: NewsItem): string[] {
  if (item.relatedAssets && item.relatedAssets.length > 0) {
    return item.relatedAssets.map((s) => s.toUpperCase());
  }
  const all = `${item.title} ${item.summary} ${item.tags.join(" ")}`.toLowerCase();
  const out = new Set<string>();
  for (const sym of SYMBOLS_IN_TEXT) {
    if (all.includes(sym.toLowerCase())) out.add(sym.toUpperCase());
  }
  item.tags.forEach((t) => {
    const key = t.toLowerCase();
    TAG_TO_SYMBOLS[key]?.forEach((s) => out.add(s));
  });
  return Array.from(out);
}

function extractCatalystTags(item: NewsItem): string[] {
  const tags: string[] = [];
  if (item.catalystType) tags.push(item.catalystType);
  const all = `${item.title} ${item.summary} ${item.tags.join(" ")}`.toLowerCase();
  const candidates = [
    "earnings", "cpi", "fomc", "rates", "fed", "dxy", "macro", "analyst",
    "governance", "proposal", "grant", "partnership", "funding", "biobank", "biobank milestone", "myco",
    "solana", "tech", "defi", "commodities",
  ];
  candidates.forEach((c) => {
    if (all.includes(c) && !tags.includes(c)) tags.push(c);
  });
  return tags.length ? tags : ["markets"];
}

function importanceForItem(item: NewsWithClass): CatalystImportance {
  if (item.impactLevel) return item.impactLevel;
  const all = `${item.title} ${item.summary} ${item.tags.join(" ")}`.toLowerCase();
  if (item.newsClass === "ecosystem") return "medium";
  if (/\b(cpi|fomc|fed\s+speaker|earnings|pce)\b/i.test(all)) return "high";
  if (/\b(rates|release|conference|ism)\b/i.test(all)) return "medium";
  return "low";
}

/**
 * Classify news into: Now Moving Markets, Upcoming Catalysts, Ecosystem/MycoDAO.
 */
export function classifyNews(items: NewsItem[]): NewsWithClass[] {
  return items.map((item) => {
    const titleLower = item.title.toLowerCase();
    const summaryLower = item.summary.toLowerCase();
    const tagsLower = item.tags.map((t) => t.toLowerCase());
    const all = `${titleLower} ${summaryLower} ${tagsLower.join(" ")}`;

    if (item.category === "mycodao" || ECOSYSTEM_TAGS.some((t) => all.includes(t))) {
      return { ...item, newsClass: "ecosystem" as NewsClass };
    }
    if (CATALYST_TAGS.some((t) => all.includes(t)) || /upcoming|next week|tomorrow|today's release/i.test(all)) {
      return { ...item, newsClass: "upcomingCatalyst" as NewsClass };
    }
    return { ...item, newsClass: "nowMoving" as NewsClass };
  });
}

export function getNowMoving(news: NewsWithClass[]): NewsWithClass[] {
  return news.filter((n) => n.newsClass === "nowMoving");
}

export function getUpcomingCatalysts(news: NewsWithClass[]): NewsWithClass[] {
  return news.filter((n) => n.newsClass === "upcomingCatalyst");
}

export function getEcosystemNews(news: NewsWithClass[]): NewsWithClass[] {
  return news.filter((n) => n.newsClass === "ecosystem");
}

/**
 * Enrich classified news with catalyst tags, related symbols, and importance.
 * Use this for UI that shows "why it's moving" and related-asset badges.
 */
export function enrichNewsWithIntelligence(items: NewsWithClass[]): NewsWithIntelligence[] {
  return items.map((item) => ({
    ...item,
    catalystTags: extractCatalystTags(item),
    relatedSymbols: extractRelatedSymbols(item),
    importance: importanceForItem(item),
  }));
}

/** Headlines that mention or relate to the given symbol (for Big Movers "why" context). */
export function getHeadlinesForMover(symbol: string, news: NewsWithIntelligence[]): NewsWithIntelligence[] {
  const sym = symbol.toUpperCase();
  return news.filter((n) => n.relatedSymbols.includes(sym)).slice(0, 3);
}

/**
 * Build a map of symbol → "why it's moving" summary and linked headline IDs.
 * Uses top movers by absolute change and links to relevant news.
 */
export function buildWhyMovingMap(
  tickers: Ticker[],
  news: NewsWithIntelligence[],
  maxMovers = 10
): Map<string, WhyMoving> {
  const map = new Map<string, WhyMoving>();
  const byMove = [...tickers]
    .filter((t) => t.changePct !== 0)
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, maxMovers);

  byMove.forEach((t) => {
    const headlines = getHeadlinesForMover(t.symbol, news);
    let summary = "";
    if (headlines.length > 0) {
      const h = headlines[0];
      const titleSnippet = h.title.length > 40 ? h.title.slice(0, 37) + "…" : h.title;
      if (h.catalystTags?.length > 0 && h.catalystTags[0] !== "markets") {
        summary = `${h.catalystTags[0]} — ${titleSnippet}`;
      } else if (h.summary && h.summary.length <= 55) {
        summary = h.summary;
      } else {
        summary = titleSnippet;
      }
    }
    map.set(t.symbol, {
      symbol: t.symbol,
      summary,
      headlineIds: headlines.map((h) => h.id),
    });
  });
  return map;
}
