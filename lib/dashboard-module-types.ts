/** Dashboard mode: 1 = fixed terminal, 2 = rotating slots, 3 = focus/broadcast. */
export type DashboardModeId = 1 | 2 | 3;

/** Mode identifier for module definitions. */
export type ModuleModeKey = "mode1" | "mode2" | "mode3";

/** Grid slot size (cols x rows). */
export type ModuleSizeKey = "1x1" | "2x1" | "2x2" | "3x1";

/**
 * Canonical module definition: identity, layout, and scoring hints.
 * Used for packing, rotation, and UI; runtime state (e.g. lastShownAt) is kept separately.
 */
export type ModuleDefinition = {
  id: string;
  title: string;
  rotatable: boolean;
  pinned: boolean;
  supportedModes: ModuleModeKey[];
  supportedSizes: ModuleSizeKey[];
  preferredSize: ModuleSizeKey;
  packingPriority: number;
  editorialWeight: number;
  freshnessScore?: number;
  urgencyScore?: number;
  canExpand: boolean;
};

/** Supported slot size in grid (legacy). */
export type ModuleSizeSupport = "compact" | "full" | "both";

/** When the module's data is refreshed. */
export type RefreshCadence = number | "on-demand"; // ms interval or only on manual refresh

/** Data keys the module depends on (tickers, news, myco, research, etc.). */
export type DataDependency = "tickers" | "news" | "myco" | "research" | "learn" | "podcasts" | "watchlist";

/**
 * Runtime metadata for dashboard modules (derived from ModuleDefinition + lastShownAt).
 * Used for rotation (Mode 2), focus (Mode 3), and intelligence.
 */
export type ModuleMetadata = {
  id: string;
  priority: number; // from packingPriority
  pinned: boolean;
  rotatable: boolean;
  lastShownAt: number; // Unix timestamp (runtime)
  freshnessScore: number; // 0–1, from definition or default
  supportedModes: DashboardModeId[];
  sizeSupport: ModuleSizeSupport;
  refreshCadence: RefreshCadence;
  dataDependencies: DataDependency[];
};

export type ModuleId =
  | "research"
  | "learn"
  | "podcasts"
  | "calendar"
  | "researchFunding"
  | "featuredNews"
  | "featuredProposal"
  | "featuredGrant"
  | "watchlist"
  | "heatmap"
  | "whyMoving"
  | "biobank"
  | "daoGovernance";

const now = () => Math.floor(Date.now() / 1000);

const DEFAULT_MODES: ModuleModeKey[] = ["mode1", "mode2"];
/** Single-row packing: 1x1, 2x1, 3x1 for no-gap layout in Mode 2. */
const PACKING_SIZES: ModuleSizeKey[] = ["1x1", "2x1", "3x1"];
const DEFAULT_CADENCE: RefreshCadence = 60_000;

/** Canonical module definitions (source of truth for identity, layout, scoring). */
export const MODULE_DEFINITIONS: Record<ModuleId, ModuleDefinition> = {
  research: {
    id: "research",
    title: "Research",
    rotatable: true,
    pinned: false,
    supportedModes: DEFAULT_MODES,
    supportedSizes: PACKING_SIZES,
    preferredSize: "3x1",
    packingPriority: 8,
    editorialWeight: 0.7,
    freshnessScore: 0.7,
    canExpand: false,
  },
  learn: {
    id: "learn",
    title: "Learn",
    rotatable: true,
    pinned: false,
    supportedModes: DEFAULT_MODES,
    supportedSizes: PACKING_SIZES,
    preferredSize: "3x1",
    packingPriority: 7,
    editorialWeight: 0.6,
    freshnessScore: 0.6,
    canExpand: false,
  },
  podcasts: {
    id: "podcasts",
    title: "Podcasts",
    rotatable: true,
    pinned: false,
    supportedModes: DEFAULT_MODES,
    supportedSizes: PACKING_SIZES,
    preferredSize: "3x1",
    packingPriority: 8,
    editorialWeight: 0.65,
    freshnessScore: 0.65,
    canExpand: false,
  },
  calendar: {
    id: "calendar",
    title: "Calendar / Events",
    rotatable: true,
    pinned: false,
    supportedModes: DEFAULT_MODES,
    supportedSizes: PACKING_SIZES,
    preferredSize: "3x1",
    packingPriority: 9,
    editorialWeight: 0.8,
    freshnessScore: 0.8,
    canExpand: false,
  },
  researchFunding: {
    id: "researchFunding",
    title: "Research Funding",
    rotatable: true,
    pinned: false,
    supportedModes: DEFAULT_MODES,
    supportedSizes: PACKING_SIZES,
    preferredSize: "3x1",
    packingPriority: 7,
    editorialWeight: 0.6,
    freshnessScore: 0.6,
    canExpand: false,
  },
  featuredNews: {
    id: "featuredNews",
    title: "Featured News",
    rotatable: true,
    pinned: false,
    supportedModes: DEFAULT_MODES,
    supportedSizes: PACKING_SIZES,
    preferredSize: "3x1",
    packingPriority: 9,
    editorialWeight: 0.85,
    freshnessScore: 0.85,
    canExpand: false,
  },
  featuredProposal: {
    id: "featuredProposal",
    title: "Featured Proposal",
    rotatable: true,
    pinned: false,
    supportedModes: DEFAULT_MODES,
    supportedSizes: PACKING_SIZES,
    preferredSize: "3x1",
    packingPriority: 8,
    editorialWeight: 0.7,
    freshnessScore: 0.7,
    canExpand: false,
  },
  featuredGrant: {
    id: "featuredGrant",
    title: "Featured Grant",
    rotatable: true,
    pinned: false,
    supportedModes: DEFAULT_MODES,
    supportedSizes: PACKING_SIZES,
    preferredSize: "3x1",
    packingPriority: 7,
    editorialWeight: 0.65,
    freshnessScore: 0.65,
    canExpand: false,
  },
  watchlist: {
    id: "watchlist",
    title: "Watchlist",
    rotatable: true,
    pinned: false,
    supportedModes: DEFAULT_MODES,
    supportedSizes: PACKING_SIZES,
    preferredSize: "3x1",
    packingPriority: 6,
    editorialWeight: 0.5,
    freshnessScore: 0.5,
    canExpand: false,
  },
  heatmap: {
    id: "heatmap",
    title: "Heatmap",
    rotatable: true,
    pinned: false,
    supportedModes: DEFAULT_MODES,
    supportedSizes: PACKING_SIZES,
    preferredSize: "3x1",
    packingPriority: 5,
    editorialWeight: 0.5,
    freshnessScore: 0.5,
    canExpand: false,
  },
  whyMoving: {
    id: "whyMoving",
    title: "Why It's Moving",
    rotatable: true,
    pinned: false,
    supportedModes: DEFAULT_MODES,
    supportedSizes: PACKING_SIZES,
    preferredSize: "3x1",
    packingPriority: 8,
    editorialWeight: 0.75,
    freshnessScore: 0.75,
    canExpand: false,
  },
  biobank: {
    id: "biobank",
    title: "Biobank Activity",
    rotatable: true,
    pinned: false,
    supportedModes: DEFAULT_MODES,
    supportedSizes: PACKING_SIZES,
    preferredSize: "3x1",
    packingPriority: 6,
    editorialWeight: 0.55,
    freshnessScore: 0.55,
    canExpand: false,
  },
  daoGovernance: {
    id: "daoGovernance",
    title: "DAO Governance",
    rotatable: true,
    pinned: false,
    supportedModes: DEFAULT_MODES,
    supportedSizes: PACKING_SIZES,
    preferredSize: "3x1",
    packingPriority: 7,
    editorialWeight: 0.6,
    freshnessScore: 0.6,
    canExpand: false,
  },
};

/** Build runtime metadata from definition + lastShownAt (for rotation API). */
export function definitionToMetadata(
  def: ModuleDefinition,
  lastShownAt: number,
  opts?: { dataDependencies?: DataDependency[]; refreshCadence?: RefreshCadence }
): ModuleMetadata {
  const modeMap: Record<ModuleModeKey, DashboardModeId> = { mode1: 1, mode2: 2, mode3: 3 };
  return {
    id: def.id,
    priority: def.packingPriority,
    pinned: def.pinned,
    rotatable: def.rotatable,
    lastShownAt,
    freshnessScore: def.freshnessScore ?? 0.5,
    supportedModes: def.supportedModes.map((m) => modeMap[m]),
    sizeSupport: "compact",
    refreshCadence: opts?.refreshCadence ?? DEFAULT_CADENCE,
    dataDependencies: opts?.dataDependencies ?? [],
  };
}

/** Initial registry for context (derived from definitions; lastShownAt = now). */
export const MODULE_REGISTRY: Record<ModuleId, ModuleMetadata> = (() => {
  const out = {} as Record<ModuleId, ModuleMetadata>;
  const deps: Partial<Record<ModuleId, DataDependency[]>> = {
    research: ["research"],
    learn: ["learn"],
    podcasts: ["podcasts"],
    calendar: [],
    researchFunding: ["myco"],
    featuredNews: ["news"],
    featuredProposal: ["research", "myco"],
    featuredGrant: ["research"],
    watchlist: ["tickers", "watchlist"],
    heatmap: ["tickers"],
    whyMoving: ["tickers", "news"],
    biobank: ["myco"],
    daoGovernance: ["myco"],
  };
  const cadence: Partial<Record<ModuleId, RefreshCadence>> = {
    calendar: "on-demand",
  };
  (Object.keys(MODULE_DEFINITIONS) as ModuleId[]).forEach((id) => {
    out[id] = definitionToMetadata(MODULE_DEFINITIONS[id], now(), {
      dataDependencies: deps[id],
      refreshCadence: cadence[id],
    });
  });
  return out;
})();

export const ROTATABLE_IDS: ModuleId[] = [
  "research",
  "learn",
  "podcasts",
  "calendar",
  "researchFunding",
  "featuredNews",
  "featuredProposal",
  "featuredGrant",
  "watchlist",
  "heatmap",
  "whyMoving",
  "biobank",
  "daoGovernance",
];

/**
 * Deterministic rotation: modules visible longest rotate out first;
 * lower priority rotate out before high; pinned never out; fresh stay longer.
 * Returns which module IDs should fill the rotatable slots (slotCount).
 */
export function getModulesForRotatingSlots(
  registry: Record<ModuleId, ModuleMetadata>,
  slotCount: number
): ModuleId[] {
  const rotatable = ROTATABLE_IDS.filter((id) => registry[id].rotatable);
  const pinned = rotatable.filter((id) => registry[id].pinned);
  const notPinned = rotatable.filter((id) => !registry[id].pinned);

  // Sort by: lastShownAt asc (least recently shown get a turn), then priority desc, then freshnessScore desc
  notPinned.sort((a, b) => {
    const ma = registry[a];
    const mb = registry[b];
    if (ma.lastShownAt !== mb.lastShownAt) return ma.lastShownAt - mb.lastShownAt;
    if (mb.priority !== ma.priority) return mb.priority - ma.priority;
    return mb.freshnessScore - ma.freshnessScore;
  });

  const take = Math.max(0, slotCount - pinned.length);
  const fromRotating = notPinned.slice(0, take);
  return [...pinned, ...fromRotating];
}

/** Optional per-module score (e.g. from insight composite) for score-driven rotation. */
export type ModuleScoreMap = Partial<Record<ModuleId, number>>;

/**
 * Rotatable IDs sorted for rotation: lastShownAt asc, then priority desc, then freshness.
 * Pass moduleScores to bias by insight-derived scores (e.g. urgency/freshness composite).
 */
export function getModulesForRotatingSlotsWithScores(
  registry: Record<ModuleId, ModuleMetadata>,
  slotCount: number,
  moduleScores?: ModuleScoreMap
): ModuleId[] {
  const rotatable = ROTATABLE_IDS.filter((id) => registry[id].rotatable);
  const pinned = rotatable.filter((id) => registry[id].pinned);
  const notPinned = rotatable.filter((id) => !registry[id].pinned);

  notPinned.sort((a, b) => {
    const ma = registry[a];
    const mb = registry[b];
    if (ma.lastShownAt !== mb.lastShownAt) return ma.lastShownAt - mb.lastShownAt;
    const scoreA = moduleScores?.[a] ?? ma.freshnessScore;
    const scoreB = moduleScores?.[b] ?? mb.freshnessScore;
    if (scoreB !== scoreA) return scoreA - scoreB;
    if (mb.priority !== ma.priority) return mb.priority - ma.priority;
    return mb.freshnessScore - ma.freshnessScore;
  });

  const take = Math.max(0, slotCount - pinned.length);
  const fromRotating = notPinned.slice(0, take);
  return [...pinned, ...fromRotating];
}

/** Which of the currently visible rotatable modules should rotate out first (single). */
export function pickOneToRotateOut(
  registry: Record<ModuleId, ModuleMetadata>,
  visibleRotatableIds: ModuleId[]
): ModuleId | null {
  const candidates = visibleRotatableIds.filter((id) => registry[id].rotatable && !registry[id].pinned);
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    const ma = registry[a];
    const mb = registry[b];
    if (ma.lastShownAt !== mb.lastShownAt) return ma.lastShownAt - mb.lastShownAt;
    if (ma.priority !== mb.priority) return ma.priority - mb.priority;
    return ma.freshnessScore - mb.freshnessScore;
  });
  return candidates[0];
}
