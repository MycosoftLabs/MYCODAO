/**
 * Editorial / intelligence selection layer for Mode 2 orchestration.
 * Chooses which modules to consider for placement based on urgency, freshness,
 * relevance, impact, pinned state, and lastShownAt.
 */

import type { ModuleId, ModuleDefinition, ModuleMetadata } from "./dashboard-module-types";
import { ROTATABLE_IDS } from "./dashboard-module-types";

export type ModuleScoreInputs = {
  urgency?: number;
  freshness?: number;
  relevance?: number;
  impact?: number;
};

export type EditorialInputs = {
  definitions: Record<ModuleId, ModuleDefinition>;
  registry: Record<ModuleId, ModuleMetadata>;
  /** Optional per-module scores from intelligence layer (0–1). */
  moduleScores?: Partial<Record<ModuleId, ModuleScoreInputs>>;
};

/**
 * Composite editorial score for a module (higher = more likely to be shown).
 * Uses definition weights + optional live scores + lastShownAt (stale = higher priority to show).
 */
function editorialScore(
  id: ModuleId,
  def: ModuleDefinition,
  meta: ModuleMetadata,
  scores?: ModuleScoreInputs
): number {
  const urgency = scores?.urgency ?? def.urgencyScore ?? 0.5;
  const freshness = scores?.freshness ?? meta.freshnessScore;
  const relevance = scores?.relevance ?? def.editorialWeight;
  const impact = scores?.impact ?? def.editorialWeight;
  const now = Math.floor(Date.now() / 1000);
  const stale = Math.max(0, now - meta.lastShownAt);
  const staleBonus = Math.min(1, stale / 300);
  return (
    def.editorialWeight * 0.25 +
    (urgency * 0.2 + freshness * 0.2 + relevance * 0.15 + impact * 0.15) +
    staleBonus * 0.25
  );
}

/**
 * Returns an ordered list of module IDs for the packing layer.
 * Pinned modules first, then by editorial score (urgency, freshness, relevance, impact, staleness).
 */
export function selectEditorialCandidates(inputs: EditorialInputs): ModuleId[] {
  const { definitions, registry, moduleScores } = inputs;
  const rotatable = ROTATABLE_IDS.filter((id) => {
    const def = definitions[id];
    const meta = registry[id];
    return def?.rotatable && meta;
  });
  const pinned = rotatable.filter((id) => registry[id].pinned);
  const notPinned = rotatable.filter((id) => !registry[id].pinned);

  notPinned.sort((a, b) => {
    const scoreA = editorialScore(a, definitions[a], registry[a], moduleScores?.[a]);
    const scoreB = editorialScore(b, definitions[b], registry[b], moduleScores?.[b]);
    if (scoreB !== scoreA) return scoreB - scoreA;
    if (registry[b].priority !== registry[a].priority) return registry[b].priority - registry[a].priority;
    return (registry[b].lastShownAt - registry[a].lastShownAt);
  });

  return [...pinned, ...notPinned];
}
