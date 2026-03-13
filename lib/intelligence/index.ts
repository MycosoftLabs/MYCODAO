/**
 * Module-driven intelligence: normalized insights and scoring.
 * Use for rotation (Mode 2) and alerts; modules consume insights for rendering.
 */

export type {
  InsightScore,
  InsightScores,
  MoverInsight,
  CatalystInsight,
  GovernanceInsight,
  ResearchMetricsInsight,
  HeadlineInsight,
} from "./insight-types";

export {
  freshnessScore,
  urgencyFromMove,
  impactFromImportance,
  compositeScore,
  defaultScores,
} from "./scoring";

export type { InsightInputs } from "./generate-insights";
export {
  generateHeadlineInsights,
  generateMoverInsights,
  generateResearchMetricsInsight,
  generateGovernanceInsight,
  generateAllInsights,
} from "./generate-insights";
