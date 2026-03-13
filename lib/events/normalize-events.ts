/**
 * Normalize incoming signals into unified events.
 * Consumed by Why It's Moving, catalysts, Big Movers, editorial rotation, and alerts.
 */

import type { Ticker, NewsItem, MycoSnapshot, ResearchItem } from "@/lib/types";
import type { NewsWithIntelligence } from "@/lib/news-intelligence";
import { freshnessScore, urgencyFromMove, impactFromImportance } from "@/lib/intelligence/scoring";
import { getUpcomingCatalysts } from "@/lib/upcoming-catalysts";
import type {
  UnifiedEvent,
  MarketEvent,
  CatalystEvent,
  GovernanceEvent,
  ResearchEvent,
  MediaEvent,
} from "./event-types";

export type EventInputs = {
  tickers: Ticker[];
  news: NewsItem[];
  enrichedNews?: NewsWithIntelligence[];
  myco: MycoSnapshot | null;
  research: ResearchItem[];
};

function importanceToImpact(importance: "high" | "medium" | "low"): number {
  return impactFromImportance(importance);
}

/** Market moves as events (for Big Movers / Why It's Moving). */
export function normalizeMarketEvents(
  tickers: Ticker[],
  max = 12
): MarketEvent[] {
  const byMove = [...tickers]
    .filter((t) => t.changePct !== 0)
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, max);

  return byMove.map((t) => ({
    type: "market" as const,
    id: `market-${t.id}`,
    title: `${t.symbol} ${t.changePct >= 0 ? "+" : ""}${t.changePct.toFixed(2)}%`,
    timestamp: t.updatedAt,
    relatedAssets: [t.symbol],
    urgency: urgencyFromMove(Math.abs(t.changePct)),
    freshness: freshnessScore(t.updatedAt),
    impact: 0.5,
    source: "ticker",
    symbol: t.symbol,
    changePct: t.changePct,
    price: t.price,
  }));
}

/** News/catalyst items as catalyst or media events. */
export function normalizeCatalystAndMediaEvents(
  news: NewsItem[],
  enriched?: NewsWithIntelligence[]
): (CatalystEvent | MediaEvent)[] {
  const events: (CatalystEvent | MediaEvent)[] = [];
  news.forEach((item, i) => {
    const en = enriched?.find((e) => e.id === item.id);
    const importance = en?.importance ?? "medium";
    const tags = en?.catalystTags ?? [];
    const relatedAssets = en?.relatedSymbols ?? item.relatedAssets ?? [];
    const isCatalyst = tags.some(
      (t) =>
        /earnings|cpi|fomc|rates|release|conference|upcoming|proposal|grant/i.test(t)
    );

    const base = {
      id: `news-${item.id}`,
      title: item.title,
      timestamp: item.publishedAt,
      relatedAssets: relatedAssets.map((s) => s.toUpperCase()),
      urgency: 0.5,
      freshness: freshnessScore(item.publishedAt),
      impact: importanceToImpact(importance),
      source: item.source,
      explanation: item.summary,
      url: item.url,
      summary: item.summary,
    };

    if (isCatalyst) {
      events.push({
        ...base,
        type: "catalyst",
        catalystType: item.catalystType ?? tags[0],
      } as CatalystEvent);
    } else {
      events.push({
        ...base,
        type: "media",
      } as MediaEvent);
    }
  });
  return events;
}

/** Upcoming catalysts (calendar) as CatalystEvents. */
export function normalizeUpcomingCatalystEvents(): CatalystEvent[] {
  const list = getUpcomingCatalysts();
  return list.map((c, i) => ({
    type: "catalyst" as const,
    id: `upcoming-${i}-${c.label.slice(0, 20)}`,
    title: c.label,
    timestamp: new Date().toISOString(),
    date: c.date,
    relatedAssets: c.relatedSymbols ?? [],
    urgency: importanceToImpact(c.importance),
    freshness: 0.8,
    impact: importanceToImpact(c.importance),
    source: "calendar",
    catalystType: c.catalystType,
  }));
}

/** Governance snapshot as GovernanceEvent. */
export function normalizeGovernanceEvents(myco: MycoSnapshot | null): GovernanceEvent[] {
  const events: GovernanceEvent[] = [];
  if (!myco?.governance) return events;

  const g = myco.governance;
  const ts = myco.updatedAt ?? new Date().toISOString();
  events.push({
    type: "governance",
    id: "governance-snapshot",
    title: `${g.activeProposals} active proposals · ${g.votingProgressPct}% progress`,
    timestamp: ts,
    relatedAssets: ["MYCO"],
    urgency: 0.5,
    freshness: freshnessScore(ts),
    impact: 0.6,
    source: "myco",
    subtype: "proposal",
    progressPct: g.votingProgressPct,
  });
  return events;
}

/** Research items as ResearchEvents. */
export function normalizeResearchEvents(research: ResearchItem[], max = 10): ResearchEvent[] {
  return research.slice(0, max).map((r) => ({
    type: "research" as const,
    id: `research-${r.id}`,
    title: r.title,
    timestamp: r.publishedAt,
    relatedAssets: [],
    urgency: 0.4,
    freshness: freshnessScore(r.publishedAt),
    impact: 0.5,
    source: r.source,
    category: r.category,
    summary: r.summary,
  }));
}

/** All unified events from current dashboard data. */
export function normalizeAllEvents(inputs: EventInputs): UnifiedEvent[] {
  const market = normalizeMarketEvents(inputs.tickers);
  const catalystMedia = normalizeCatalystAndMediaEvents(
    inputs.news,
    inputs.enrichedNews
  );
  const upcoming = normalizeUpcomingCatalystEvents();
  const governance = normalizeGovernanceEvents(inputs.myco);
  const research = normalizeResearchEvents(inputs.research);

  return [
    ...market,
    ...catalystMedia,
    ...upcoming,
    ...governance,
    ...research,
  ];
}

/** Events that mention or relate to the given symbol (for Why It's Moving / Big Movers). */
export function getEventsForSymbol(
  events: UnifiedEvent[],
  symbol: string,
  limit = 3
): UnifiedEvent[] {
  const sym = symbol.toUpperCase();
  return events.filter(
    (e) =>
      e.relatedAssets.includes(sym) ||
      (e.type === "market" && e.symbol === sym)
  ).slice(0, limit);
}

/** One-line explanation for a symbol from the event layer (for Why It's Moving). */
export function getExplanationForSymbol(
  events: UnifiedEvent[],
  symbol: string
): string | undefined {
  const forSymbol = getEventsForSymbol(events, symbol, 1);
  const e = forSymbol[0];
  if (!e) return undefined;
  if (e.explanation && e.explanation.length <= 80) return e.explanation;
  if (e.type === "catalyst" && e.catalystType) return `${e.catalystType} — ${e.title.slice(0, 50)}`;
  return e.title.slice(0, 60) + (e.title.length > 60 ? "…" : "");
}
