/**
 * Normalized insight types for the module-driven intelligence system.
 * Intelligence generation produces these; modules only render.
 */

export type InsightScore = number; // 0–1

/** Scores used for rotation, alerts, and ordering. */
export type InsightScores = {
  urgency: InsightScore;
  freshness: InsightScore;
  relevance: InsightScore;
  impact: InsightScore;
};

/** Top movers with reason and scores for display/rotation. */
export type MoverInsight = {
  symbol: string;
  tickerId: string;
  changePct: number;
  price: number;
  summary: string;
  headlineIds: string[];
  scores: InsightScores;
  updatedAt: string;
};

/** Upcoming or active catalyst with scores. */
export type CatalystInsight = {
  id: string;
  label: string;
  date: string;
  importance: "high" | "medium" | "low";
  relatedSymbols: string[];
  scores: InsightScores;
  sourceItemId?: string;
};

/** Governance event or proposal snapshot. */
export type GovernanceInsight = {
  id: string;
  type: "proposal" | "vote" | "grant";
  label: string;
  progressPct?: number;
  activeProposals?: number;
  scores: InsightScores;
  updatedAt: string;
};

/** Research / biobank metrics snapshot for modules. */
export type ResearchMetricsInsight = {
  grantPoolMyco: number;
  grantsDeployedMyco: number;
  activeProposals: number;
  votesToday: number;
  biobankIncentivesMyco?: number;
  activeResearchProjects?: number;
  samplesIndexed: number;
  scores: InsightScores;
  updatedAt: string;
};

/** Headline with classification and scores for ordering/rotation. */
export type HeadlineInsight = {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  catalystTags: string[];
  relatedSymbols: string[];
  importance: "high" | "medium" | "low";
  scores: InsightScores;
};
