/**
 * Generate normalized insights from raw data.
 * Consumed by modules for rendering; scoring drives rotation and alerts.
 */

import type { Ticker, NewsItem, MycoSnapshot } from "@/lib/types";
import type { NewsWithIntelligence } from "@/lib/news-intelligence";
import { enrichNewsWithIntelligence, classifyNews, getHeadlinesForMover } from "@/lib/news-intelligence";
import type { MoverInsight, HeadlineInsight, ResearchMetricsInsight, GovernanceInsight } from "./insight-types";
import {
  freshnessScore,
  urgencyFromMove,
  impactFromImportance,
  defaultScores,
  type InsightScores,
} from "./scoring";

export type InsightInputs = {
  tickers: Ticker[];
  news: NewsItem[];
  myco: MycoSnapshot | null;
};

/** Headlines as normalized insights with scores. */
export function generateHeadlineInsights(news: NewsItem[]): HeadlineInsight[] {
  const enriched = enrichNewsWithIntelligence(classifyNews(news));
  return enriched.map((item) => {
    const importance = item.importance ?? "medium";
    const scores: InsightScores = {
      urgency: 0.5,
      freshness: freshnessScore(item.publishedAt),
      relevance: item.relatedSymbols.length > 0 ? 0.8 : 0.5,
      impact: impactFromImportance(importance),
    };
    return {
      id: item.id,
      title: item.title,
      source: item.source,
      url: item.url,
      publishedAt: item.publishedAt,
      catalystTags: item.catalystTags ?? [],
      relatedSymbols: item.relatedSymbols ?? [],
      importance,
      scores,
    };
  });
}

/** Top movers with reason and scores. */
export function generateMoverInsights(
  tickers: Ticker[],
  enrichedNews: NewsWithIntelligence[],
  maxMovers = 12
): MoverInsight[] {
  const byMove = [...tickers]
    .filter((t) => t.changePct !== 0)
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, maxMovers);

  return byMove.map((t) => {
    const headlines = getHeadlinesForMover(t.symbol, enrichedNews);
    let summary = "";
    if (headlines.length > 0) {
      const h = headlines[0];
      const titleSnippet = h.title.length > 40 ? h.title.slice(0, 37) + "…" : h.title;
      if (h.catalystTags?.length > 0 && h.catalystTags[0] !== "markets") {
        summary = `${h.catalystTags[0]} — ${titleSnippet}`;
      } else {
        summary = titleSnippet;
      }
    }
    const scores: InsightScores = {
      urgency: urgencyFromMove(Math.abs(t.changePct)),
      freshness: freshnessScore(t.updatedAt),
      relevance: headlines.length > 0 ? 0.8 : 0.4,
      impact: impactFromImportance(headlines[0]?.importance ?? "medium"),
    };
    return {
      symbol: t.symbol,
      tickerId: t.id,
      changePct: t.changePct,
      price: t.price,
      summary,
      headlineIds: headlines.map((h) => h.id),
      scores,
      updatedAt: t.updatedAt,
    };
  });
}

/** Research metrics as a single insight for modules. */
export function generateResearchMetricsInsight(myco: MycoSnapshot | null): ResearchMetricsInsight | null {
  const rf = myco?.researchFunding;
  if (!rf) return null;
  const updatedAt = myco.updatedAt ?? new Date().toISOString();
  return {
    grantPoolMyco: rf.grantPoolMyco,
    grantsDeployedMyco: rf.grantsDeployedMyco,
    activeProposals: rf.activeProposals,
    votesToday: rf.votesToday,
    biobankIncentivesMyco: rf.biobankIncentivesMyco,
    activeResearchProjects: rf.activeResearchProjects,
    samplesIndexed: rf.samplesIndexed,
    scores: defaultScores(updatedAt, "medium"),
    updatedAt,
  };
}

/** Governance snapshot for DAO module. */
export function generateGovernanceInsight(myco: MycoSnapshot | null): GovernanceInsight | null {
  const gov = myco?.governance;
  if (!gov) return null;
  const updatedAt = myco.updatedAt ?? new Date().toISOString();
  return {
    id: "governance-snapshot",
    type: "proposal",
    label: `${gov.activeProposals} active · ${gov.votingProgressPct}% progress`,
    progressPct: gov.votingProgressPct,
    activeProposals: gov.activeProposals,
    scores: defaultScores(updatedAt, "medium"),
    updatedAt,
  };
}

/** All insights from current data. Used by provider to feed modules and rotation. */
export function generateAllInsights(inputs: InsightInputs) {
  const enrichedNews = enrichNewsWithIntelligence(classifyNews(inputs.news));
  return {
    headlines: generateHeadlineInsights(inputs.news),
    movers: generateMoverInsights(inputs.tickers, enrichedNews),
    researchMetrics: generateResearchMetricsInsight(inputs.myco),
    governance: generateGovernanceInsight(inputs.myco),
    enrichedNews,
  };
}
