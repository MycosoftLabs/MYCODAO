/**
 * Scoring layer: urgency, freshness, relevance, impact.
 * Used by Mode 2 rotation and alerts; 0–1 scale.
 */

import type { InsightScores } from "./insight-types";

const nowMs = () => Date.now();
const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

/** Recency: newer → higher freshness. */
export function freshnessScore(updatedAt: string): number {
  const t = new Date(updatedAt).getTime();
  const ageMs = nowMs() - t;
  if (ageMs <= ONE_HOUR_MS) return 1;
  if (ageMs <= 6 * ONE_HOUR_MS) return 0.8;
  if (ageMs <= ONE_DAY_MS) return 0.5;
  if (ageMs <= 3 * ONE_DAY_MS) return 0.3;
  return 0.1;
}

/** Importance level → impact score. */
export function impactFromImportance(importance: "high" | "medium" | "low"): number {
  switch (importance) {
    case "high": return 1;
    case "medium": return 0.6;
    case "low": return 0.3;
    default: return 0.5;
  }
}

/** Magnitude of move → urgency (for movers). */
export function urgencyFromMove(absChangePct: number): number {
  if (absChangePct >= 15) return 1;
  if (absChangePct >= 10) return 0.85;
  if (absChangePct >= 5) return 0.65;
  if (absChangePct >= 2) return 0.4;
  return 0.2;
}

/** Combine scores into a single composite for ordering (e.g. rotation). */
export function compositeScore(scores: InsightScores, weights?: Partial<Record<keyof InsightScores, number>>): number {
  const w = {
    urgency: weights?.urgency ?? 0.3,
    freshness: weights?.freshness ?? 0.3,
    relevance: weights?.relevance ?? 0.2,
    impact: weights?.impact ?? 0.2,
  };
  return (
    scores.urgency * w.urgency +
    scores.freshness * w.freshness +
    scores.relevance * w.relevance +
    scores.impact * w.impact
  );
}

/** Default scores when no specific logic. */
export function defaultScores(updatedAt: string, importance: "high" | "medium" | "low" = "medium"): InsightScores {
  return {
    urgency: 0.5,
    freshness: freshnessScore(updatedAt),
    relevance: 0.5,
    impact: impactFromImportance(importance),
  };
}
