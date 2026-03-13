/**
 * Layout / packing layer for Mode 2 orchestration.
 * Fills available width with modules so no visual gaps remain.
 * Uses supportedSizes, preferredSize, canExpand, packingPriority from definitions.
 */

import type { ModuleId, ModuleDefinition, ModuleSizeKey } from "./dashboard-module-types";

/** Column span for a size key in a single-row layout (1x1=1, 2x1=2, 3x1=3). 2x2 not used in 1-row. */
const SIZE_WIDTH: Record<ModuleSizeKey, number> = {
  "1x1": 1,
  "2x1": 2,
  "3x1": 3,
  "2x2": 2,
};

export type Placement = {
  moduleId: ModuleId;
  sizeKey: ModuleSizeKey;
  colSpan: number;
};

export type PackingInputs = {
  /** Ordered candidate IDs from editorial layer. */
  candidateIds: ModuleId[];
  definitions: Record<ModuleId, ModuleDefinition>;
  /** Total columns to fill (e.g. 12). */
  totalWidth: number;
  /** Allowed size keys for this region (e.g. single row = 1x1, 2x1, 3x1). */
  allowedSizes?: ModuleSizeKey[];
};

const DEFAULT_ALLOWED: ModuleSizeKey[] = ["1x1", "2x1", "3x1"];

/**
 * Widths (in columns) that a module can occupy from its supportedSizes.
 */
function getWidthsForModule(
  def: ModuleDefinition,
  allowedSizes: ModuleSizeKey[]
): number[] {
  const out = new Set<number>();
  for (const key of def.supportedSizes) {
    if (allowedSizes.includes(key) && SIZE_WIDTH[key] !== undefined) {
      out.add(SIZE_WIDTH[key]);
    }
  }
  return [...out].sort((a, b) => b - a);
}

/**
 * Check if we can partition totalWidth using the first k modules (each contributing one of their widths).
 * DP: dp[i][s] = can we make sum s using first i modules.
 */
function canPartition(
  candidateIds: ModuleId[],
  definitions: Record<ModuleId, ModuleDefinition>,
  totalWidth: number,
  allowedSizes: ModuleSizeKey[],
  k: number
): boolean {
  if (k <= 0 || totalWidth <= 0) return totalWidth === 0 && k === 0;
  const widthsPerModule = candidateIds.slice(0, k).map((id) =>
    getWidthsForModule(definitions[id], allowedSizes)
  );
  const dp: boolean[][] = [];
  for (let i = 0; i <= k; i++) {
    dp[i] = new Array(totalWidth + 1).fill(false);
  }
  dp[0][0] = true;
  for (let i = 1; i <= k; i++) {
    const widths = widthsPerModule[i - 1];
    for (const w of widths) {
      for (let s = w; s <= totalWidth; s++) {
        if (dp[i - 1][s - w]) dp[i][s] = true;
      }
    }
  }
  return dp[k][totalWidth];
}

/**
 * Backtrack to get one valid assignment of widths for the first k modules that sums to totalWidth.
 */
function getPartition(
  candidateIds: ModuleId[],
  definitions: Record<ModuleId, ModuleDefinition>,
  totalWidth: number,
  allowedSizes: ModuleSizeKey[],
  k: number
): number[] | null {
  const widthsPerModule = candidateIds.slice(0, k).map((id) =>
    getWidthsForModule(definitions[id], allowedSizes)
  );
  const dp: boolean[][] = [];
  const parent: ({ prevS: number; w: number } | null)[][] = [];
  for (let i = 0; i <= k; i++) {
    dp[i] = new Array(totalWidth + 1).fill(false);
    parent[i] = new Array(totalWidth + 1).fill(null);
  }
  dp[0][0] = true;
  for (let i = 1; i <= k; i++) {
    const widths = widthsPerModule[i - 1];
    if (widths.length === 0) continue;
    for (const w of widths) {
      for (let s = w; s <= totalWidth; s++) {
        if (dp[i - 1][s - w]) {
          dp[i][s] = true;
          parent[i][s] = { prevS: s - w, w };
        }
      }
    }
  }
  if (!dp[k][totalWidth]) return null;
  const assignment: number[] = [];
  let s = totalWidth;
  for (let i = k; i >= 1; i--) {
    const p = parent[i][s];
    if (!p) return null;
    assignment.unshift(p.w);
    s = p.prevS;
  }
  return assignment;
}

/**
 * Map width to preferred size key for a module (preferredSize first, then smallest that fits).
 */
function widthToSizeKey(def: ModuleDefinition, width: number, allowedSizes: ModuleSizeKey[]): ModuleSizeKey {
  const prefW = SIZE_WIDTH[def.preferredSize];
  if (prefW === width && allowedSizes.includes(def.preferredSize)) return def.preferredSize;
  for (const key of allowedSizes) {
    if (SIZE_WIDTH[key] === width && def.supportedSizes.includes(key)) return key;
  }
  return def.preferredSize;
}

/**
 * Pack modules into totalWidth with no gaps.
 * Returns placements (moduleId, sizeKey, colSpan) in left-to-right order.
 */
export function packPlacements(inputs: PackingInputs): Placement[] {
  const {
    candidateIds,
    definitions,
    totalWidth,
    allowedSizes = DEFAULT_ALLOWED,
  } = inputs;

  if (totalWidth <= 0 || candidateIds.length === 0) return [];

  const minModules = Math.ceil(totalWidth / 3);
  let bestK = 0;
  for (let k = minModules; k <= candidateIds.length; k++) {
    if (canPartition(candidateIds, definitions, totalWidth, allowedSizes, k)) {
      bestK = k;
      break;
    }
  }

  if (bestK === 0) return [];

  const widths = getPartition(
    candidateIds,
    definitions,
    totalWidth,
    allowedSizes,
    bestK
  );
  if (!widths) return [];

  const placements: Placement[] = [];
  for (let i = 0; i < bestK; i++) {
    const moduleId = candidateIds[i];
    const def = definitions[moduleId];
    const colSpan = widths[i];
    const sizeKey = widthToSizeKey(def, colSpan, allowedSizes);
    placements.push({ moduleId, sizeKey, colSpan });
  }
  return placements;
}
