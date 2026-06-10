import fs from "fs";
import path from "path";
import {
  buildYoutubeEmbedFromSource,
  withNewsPlayerParams,
} from "@/lib/news-channel-embed";
import type { ProgramSourceType } from "@/lib/server/news-channel-program";
import { resolveBlocksMediaFile } from "@/lib/server/blocks-nas-media";
import {
  buildShowOverlay,
  getShowConfigForProgram,
  readProgramShowConfigs,
  writeProgramShowConfig,
  type ProgramShowConfig,
  type ShowOverlayPublic,
} from "@/lib/server/news-program-show-config";
import {
  applyCommercialSlotToState,
  maxSecondsForActiveCommercial,
} from "@/lib/server/news-program-commercials";

export type { ProgramShowConfig, ShowOverlayPublic };
export {
  getShowConfigForProgram,
  readProgramShowConfigs,
  writeProgramShowConfig,
};

export interface BroadcastTalentLine {
  name: string;
  roles: string[];
  creditLine?: string;
}

export interface TalentPreset {
  id: string;
  label: string;
  lines: BroadcastTalentLine[];
}

export interface ProgramAssetPreset {
  id: string;
  label: string;
  type: "live" | "commercial" | "bumper" | "partner" | "recorded";
  videoUrl?: string;
  videoId?: string;
  channelId?: string;
  /** NAS shows/ or commercials/ clip for this preset */
  nasPath?: string;
  /** Title bar preset to sync when this program is on air */
  titlePresetId?: string;
}

export interface ProducerTitleContext {
  programSlotId?: string | null;
  programLabel?: string | null;
}

export interface TitleBarPreset {
  id: string;
  label: string;
  title: string;
  /** Relative path under BLOCKS NAS (e.g. graphics/show-logo.png) */
  logoNasPath?: string | null;
}

export interface NewsProducerPresets {
  talent: TalentPreset[];
  program: ProgramAssetPreset[];
  title: TitleBarPreset[];
}

export type ProducerProgramMode =
  | "schedule"
  | "live"
  | "commercial"
  | "bumper"
  | "partner"
  | "recorded";

export interface ProducerProgramOverride {
  label: string;
  type: ProducerProgramMode;
  videoUrl?: string;
  videoId?: string;
  channelId?: string;
  /** Relative path under BLOCKS NAS root (e.g. commercials/foo.mp4) */
  nasPath?: string;
}

export interface NewsProducerState {
  updatedAt: string;
  updatedBy?: string;
  activeTalentPresetId: string | null;
  customTalent: BroadcastTalentLine[] | null;
  activeTitlePresetId: string | null;
  customTitleText: string | null;
  customTitleLogoNasPath: string | null;
  programMode: ProducerProgramMode;
  activeProgramPresetId: string | null;
  programOverride: ProducerProgramOverride | null;
  /** Lower-third / fullscreen graphic from NAS graphics/ folder */
  activeGraphicNasPath: string | null;
  /** Markets Now asset ids (max 3) for Live Stream Data widget rotation */
  liveStreamDataAssetIds: string[];
  /** Square marketing logo in Live Stream Data widget (NAS graphics/) */
  liveStreamDataMarketingNasPath: string | null;
  /** UI selection for program side panel */
  selectedProgramPresetId: string | null;
  /** Active configured show session (go on air) */
  activeShowProgramId: string | null;
  showStartedAt: string | null;
  commercialFiredSlotIds: string[];
  activeCommercialSlotId: string | null;
}

export interface NewsProducerPublic {
  updatedAt: string;
  talent: BroadcastTalentLine[];
  talentPresetId: string | null;
  talentPresetLabel: string | null;
  titleBarText: string | null;
  titleBarLogoUrl: string | null;
  titlePresetId: string | null;
  titlePresetLabel: string | null;
  programMode: ProducerProgramMode;
  programLabel: string | null;
  programEmbedUrl: string | null;
  programMediaUrl: string | null;
  programGraphicUrl: string | null;
  programNasPath: string | null;
  programSourceType: ProgramSourceType | "producer";
  activeProgramPresetId: string | null;
  activeGraphicNasPath: string | null;
  liveStreamDataAssetIds: string[];
  liveStreamDataMarketingNasPath: string | null;
  liveStreamDataMarketingImageUrl: string | null;
  /** NAS graphics/ path for title bar logo (preset or custom title) */
  titleBarLogoNasPath: string | null;
  selectedProgramPresetId: string | null;
  activeShowProgramId: string | null;
  showStartedAt: string | null;
  showOverlay: ShowOverlayPublic | null;
}

const DEFAULT_STATE_PATH = path.join(
  process.cwd(),
  "data",
  "news-producer-state.json",
);
const DEFAULT_PRESETS_PATH = path.join(
  process.cwd(),
  "data",
  "news-producer-presets.json",
);
const SEED_DIR = path.join(process.cwd(), "config", "blocks-producer");
const SEED_PRESETS_PATH = path.join(SEED_DIR, "news-producer-presets.json");
const SEED_STATE_PATH = path.join(SEED_DIR, "news-producer-state.json");

function statePath(): string {
  return (
    process.env.NEWS_PRODUCER_STATE_PATH?.trim() || DEFAULT_STATE_PATH
  );
}

function presetsPath(): string {
  return (
    process.env.NEWS_PRODUCER_PRESETS_PATH?.trim() || DEFAULT_PRESETS_PATH
  );
}

function readJsonFile<T>(filePath: string): T | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJsonFile(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function readProducerPresets(): NewsProducerPresets {
  const presets =
    readJsonFile<NewsProducerPresets>(presetsPath()) ??
    readJsonFile<NewsProducerPresets>(SEED_PRESETS_PATH) ?? {
      talent: [],
      program: [],
      title: [],
    };
  return {
    talent: presets.talent ?? [],
    program: presets.program ?? [],
    title: presets.title ?? [],
  };
}

export function readProducerState(): NewsProducerState {
  const fallback: NewsProducerState = {
    updatedAt: new Date().toISOString(),
    activeTalentPresetId: "morgan-rockwell",
    customTalent: null,
    activeTitlePresetId: "blocks-live",
    customTitleText: null,
    customTitleLogoNasPath: null,
    programMode: "schedule",
    activeProgramPresetId: null,
    programOverride: null,
    activeGraphicNasPath: null,
    liveStreamDataAssetIds: [],
    liveStreamDataMarketingNasPath: null,
    selectedProgramPresetId: null,
    activeShowProgramId: null,
    showStartedAt: null,
    commercialFiredSlotIds: [],
    activeCommercialSlotId: null,
  };
  const raw =
    readJsonFile<NewsProducerState>(statePath()) ??
    readJsonFile<NewsProducerState>(SEED_STATE_PATH) ??
    fallback;
  return {
    ...fallback,
    ...raw,
    activeTitlePresetId: raw.activeTitlePresetId ?? fallback.activeTitlePresetId,
    customTitleText: raw.customTitleText ?? null,
    customTitleLogoNasPath: raw.customTitleLogoNasPath ?? null,
    activeGraphicNasPath: raw.activeGraphicNasPath ?? null,
    liveStreamDataAssetIds: normalizeLiveStreamDataAssetIds(
      raw.liveStreamDataAssetIds ?? [],
    ),
    liveStreamDataMarketingNasPath: raw.liveStreamDataMarketingNasPath ?? null,
    selectedProgramPresetId: raw.selectedProgramPresetId ?? null,
    activeShowProgramId: raw.activeShowProgramId ?? null,
    showStartedAt: raw.showStartedAt ?? null,
    commercialFiredSlotIds: raw.commercialFiredSlotIds ?? [],
    activeCommercialSlotId: raw.activeCommercialSlotId ?? null,
  };
}

function normalizeLiveStreamDataAssetIds(ids: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = raw?.trim().toLowerCase();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= 3) break;
  }
  return out;
}

export function buildNasMediaServePath(relPath: string): string {
  const q = `path=${encodeURIComponent(relPath.replace(/\\/g, "/"))}`;
  return `/api/news/producer/media/serve?${q}`;
}

export function resolveNasMediaServeUrl(relPath: string): string | null {
  if (!relPath?.trim()) return null;
  if (!resolveBlocksMediaFile(relPath)) return null;
  return buildNasMediaServePath(relPath);
}

function categoryToProgramMode(category: string): ProducerProgramMode {
  switch (category) {
    case "commercials":
      return "commercial";
    case "bumpers":
      return "bumper";
    case "live-streams":
      return "live";
    case "shows":
      return "recorded";
    default:
      return "recorded";
  }
}

export function writeProducerState(
  next: NewsProducerState,
): NewsProducerState {
  writeJsonFile(statePath(), next);
  return next;
}

export function resolveProducerTalent(
  state: NewsProducerState,
  presets: NewsProducerPresets,
): { lines: BroadcastTalentLine[]; presetId: string | null; presetLabel: string | null } {
  if (state.customTalent?.length) {
    return {
      lines: state.customTalent,
      presetId: null,
      presetLabel: "Custom",
    };
  }

  const preset = presets.talent.find(
    (t) => t.id === state.activeTalentPresetId,
  );
  if (preset) {
    if (!preset.lines?.length) {
      return {
        lines: [],
        presetId: preset.id,
        presetLabel: preset.label,
      };
    }
    return {
      lines: preset.lines,
      presetId: preset.id,
      presetLabel: preset.label,
    };
  }

  const morgan = presets.talent.find((t) => t.id === "morgan-rockwell");
  if (morgan?.lines?.length) {
    return {
      lines: morgan.lines,
      presetId: morgan.id,
      presetLabel: morgan.label,
    };
  }

  return {
    lines: [
      {
        name: "Morgan Rockwell",
        roles: ["Founder & CEO", "News Anchor"],
        creditLine: "Morgan Rockwell · Founder & CEO · News Anchor",
      },
    ],
    presetId: "morgan-rockwell",
    presetLabel: "Morgan Rockwell",
  };
}

function overrideToEmbed(
  override: ProducerProgramOverride | null,
): string | null {
  if (!override) return null;
  const built = buildYoutubeEmbedFromSource({
    videoUrl: override.videoUrl,
    videoId: override.videoId,
    channelId: override.channelId,
  });
  return built ? withNewsPlayerParams(built) : null;
}

function normalizeShowLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function readScheduleSlotsForTitleSync(): Array<{
  id: string;
  label: string;
  titlePresetId?: string;
}> {
  const paths = [
    process.env.NEWS_CHANNEL_SCHEDULE_PATH?.trim() ||
      path.join(process.cwd(), "data", "news-channel-schedule.json"),
    path.join(process.cwd(), "config", "blocks-producer", "news-channel-schedule.json"),
  ];
  for (const filePath of paths) {
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw) as {
        slots?: Array<{ id: string; label: string; titlePresetId?: string }>;
      };
      return parsed.slots ?? [];
    } catch {
      /* try next */
    }
  }
  return [];
}

function resolveLinkedTitlePresetId(
  state: NewsProducerState,
  presets: NewsProducerPresets,
  ctx: ProducerTitleContext,
): string | null {
  if (state.activeProgramPresetId) {
    const prog = presets.program.find(
      (p) => p.id === state.activeProgramPresetId,
    );
    if (prog?.titlePresetId) return prog.titlePresetId;
  }

  if (ctx.programSlotId) {
    const slot = readScheduleSlotsForTitleSync().find(
      (s) => s.id === ctx.programSlotId,
    );
    if (slot?.titlePresetId) return slot.titlePresetId;
    if (slot?.label) {
      const key = normalizeShowLabel(slot.label);
      const byTitle = presets.title.find(
        (t) => normalizeShowLabel(t.label) === key,
      );
      if (byTitle) return byTitle.id;
      const byProgram = presets.program.find(
        (p) =>
          p.titlePresetId &&
          normalizeShowLabel(p.label) === key,
      );
      if (byProgram?.titlePresetId) return byProgram.titlePresetId;
    }
  }

  const override = state.programOverride;
  if (override) {
    const overrideKey = override.label
      ? normalizeShowLabel(override.label)
      : "";
    const byProgram = presets.program.find(
      (p) =>
        p.titlePresetId &&
        ((override.nasPath && p.nasPath === override.nasPath) ||
          (overrideKey && normalizeShowLabel(p.label) === overrideKey)),
    );
    if (byProgram?.titlePresetId) return byProgram.titlePresetId;

    const nas = override.nasPath?.trim() ?? "";
    if (nas.startsWith("shows/")) {
      const slug = nas
        .replace(/^shows\//i, "")
        .replace(/\.[^.]+$/, "")
        .toLowerCase();
      const bySlug = presets.program.find(
        (p) =>
          p.titlePresetId &&
          (p.id === `show-${slug}` ||
            p.id === slug ||
            p.nasPath?.replace(/^shows\//i, "").replace(/\.[^.]+$/, "").toLowerCase() ===
              slug),
      );
      if (bySlug?.titlePresetId) return bySlug.titlePresetId;
    }
  }

  if (ctx.programLabel?.trim()) {
    const key = normalizeShowLabel(ctx.programLabel);
    const byTitle = presets.title.find(
      (t) => normalizeShowLabel(t.label) === key,
    );
    if (byTitle) return byTitle.id;
  }

  return null;
}

function resolveTitlePresetLogoNasPath(
  preset: TitleBarPreset | undefined | null,
): string | null {
  const explicit = preset?.logoNasPath?.trim();
  if (explicit) return explicit;
  if (!preset?.id) return null;
  const slug = preset.id;
  const candidates = [
    `graphics/shows/${slug}.png`,
    `graphics/shows/${slug}.webp`,
    `graphics/shows/${slug}.svg`,
  ];
  for (const candidate of candidates) {
    if (resolveBlocksMediaFile(candidate)) return candidate;
  }
  return null;
}

function applyTitlePresetSync(
  next: NewsProducerState,
  presets: NewsProducerPresets,
  titlePresetId: string,
): void {
  next.activeTitlePresetId = titlePresetId;
  next.customTitleText = null;
  const preset = presets.title.find((t) => t.id === titlePresetId);
  next.customTitleLogoNasPath = resolveTitlePresetLogoNasPath(preset);
}

function titleBarFromPreset(
  preset: TitleBarPreset,
  runtimeLogoNasPath: string | null,
): {
  text: string;
  logoUrl: string | null;
  logoNasPath: string | null;
  presetId: string;
  presetLabel: string;
} {
  const logoNasPath =
    runtimeLogoNasPath?.trim() ||
    resolveTitlePresetLogoNasPath(preset) ||
    null;
  const logoUrl = logoNasPath ? resolveNasMediaServeUrl(logoNasPath) : null;
  return {
    text: preset.title.trim(),
    logoUrl,
    logoNasPath,
    presetId: preset.id,
    presetLabel: preset.label,
  };
}

export function resolveProducerTitleBar(
  state: NewsProducerState,
  presets: NewsProducerPresets,
  programLabel: string | null,
  programMode: ProducerProgramMode,
  ctx: ProducerTitleContext = {},
): {
  text: string;
  logoUrl: string | null;
  logoNasPath: string | null;
  presetId: string | null;
  presetLabel: string | null;
} {
  const runtimeLogoNasPath = state.customTitleLogoNasPath?.trim() || null;

  if (state.customTitleText?.trim()) {
    const logoNasPath = runtimeLogoNasPath;
    const logoUrl = logoNasPath ? resolveNasMediaServeUrl(logoNasPath) : null;
    return {
      text: state.customTitleText.trim(),
      logoUrl,
      logoNasPath,
      presetId: null,
      presetLabel: "Custom",
    };
  }

  const manualPreset = presets.title.find(
    (t) => t.id === state.activeTitlePresetId,
  );
  if (manualPreset?.title?.trim()) {
    return titleBarFromPreset(manualPreset, runtimeLogoNasPath);
  }

  const linkedId = resolveLinkedTitlePresetId(state, presets, {
    programSlotId: ctx.programSlotId ?? null,
    programLabel: ctx.programLabel ?? programLabel,
  });
  if (linkedId) {
    const linked = presets.title.find((t) => t.id === linkedId);
    if (linked?.title?.trim()) {
      const logoOverride =
        state.activeTitlePresetId === linkedId ? runtimeLogoNasPath : null;
      return titleBarFromPreset(linked, logoOverride);
    }
  }

  if (programMode !== "schedule" && programLabel?.trim()) {
    return {
      text: programLabel.trim().toUpperCase(),
      logoUrl: runtimeLogoNasPath
        ? resolveNasMediaServeUrl(runtimeLogoNasPath)
        : null,
      logoNasPath: runtimeLogoNasPath,
      presetId: null,
      presetLabel: "Program",
    };
  }

  const blocksLive = presets.title.find((t) => t.id === "blocks-live");
  if (blocksLive?.title?.trim()) {
    return titleBarFromPreset(blocksLive, runtimeLogoNasPath);
  }

  const first = presets.title[0];
  if (first?.title?.trim()) {
    return titleBarFromPreset(first, runtimeLogoNasPath);
  }

  return {
    text: "BLOCKS NEWS · LIVE",
    logoUrl: null,
    logoNasPath: null,
    presetId: null,
    presetLabel: null,
  };
}

export function resolveProducerProgramEmbed(
  state: NewsProducerState,
): {
  embedUrl: string | null;
  mediaUrl: string | null;
  nasPath: string | null;
  label: string;
  sourceType: ProgramSourceType | "producer";
} | null {
  if (state.programMode === "schedule" || !state.programOverride) {
    return null;
  }

  const nasPath = state.programOverride.nasPath?.trim();
  if (nasPath) {
    const mediaUrl = resolveNasMediaServeUrl(nasPath);
    return {
      embedUrl: null,
      mediaUrl,
      nasPath,
      label: state.programOverride.label,
      sourceType: state.programOverride.type as ProgramSourceType,
    };
  }

  const embedUrl = overrideToEmbed(state.programOverride);
  return {
    embedUrl,
    mediaUrl: null,
    nasPath: null,
    label: state.programOverride.label,
    sourceType: state.programOverride.type as ProgramSourceType,
  };
}

export function buildProducerPublicView(
  ctx: ProducerTitleContext = {},
): NewsProducerPublic {
  const state = readProducerState();
  const presets = readProducerPresets();
  const talent = resolveProducerTalent(state, presets);
  const program = resolveProducerProgramEmbed(state);
  const programLabel = ctx.programLabel ?? program?.label ?? null;
  const titleBar = resolveProducerTitleBar(
    state,
    presets,
    programLabel,
    state.programMode,
    {
      programSlotId: ctx.programSlotId ?? null,
      programLabel,
    },
  );

  const graphicUrl = state.activeGraphicNasPath
    ? resolveNasMediaServeUrl(state.activeGraphicNasPath)
    : null;

  const maxPlaybackSeconds = maxSecondsForActiveCommercial(state);
  const showOverlay = buildShowOverlay(
    state.activeShowProgramId,
    state.programMode,
    state.programOverride?.label ?? null,
    maxPlaybackSeconds,
  );

  return {
    updatedAt: state.updatedAt,
    talent: talent.lines,
    talentPresetId: talent.presetId,
    talentPresetLabel: talent.presetLabel,
    titleBarText: titleBar.text,
    titleBarLogoUrl: titleBar.logoUrl,
    titlePresetId: titleBar.presetId,
    titlePresetLabel: titleBar.presetLabel,
    programMode: state.programMode,
    programLabel,
    programEmbedUrl: program?.embedUrl ?? null,
    programMediaUrl: program?.mediaUrl ?? null,
    programNasPath: program?.nasPath ?? null,
    programGraphicUrl: graphicUrl,
    programSourceType: program?.sourceType ?? "producer",
    activeProgramPresetId: state.activeProgramPresetId,
    activeGraphicNasPath: state.activeGraphicNasPath,
    liveStreamDataAssetIds: state.liveStreamDataAssetIds ?? [],
    liveStreamDataMarketingNasPath:
      state.liveStreamDataMarketingNasPath?.trim() || null,
    liveStreamDataMarketingImageUrl: state.liveStreamDataMarketingNasPath?.trim()
      ? resolveNasMediaServeUrl(state.liveStreamDataMarketingNasPath.trim())
      : null,
    titleBarLogoNasPath: titleBar.logoNasPath,
    selectedProgramPresetId: state.selectedProgramPresetId ?? null,
    activeShowProgramId: state.activeShowProgramId ?? null,
    showStartedAt: state.showStartedAt ?? null,
    showOverlay,
  };
}

function normalizeProducerKey(value: string | undefined): string {
  if (!value) return "";
  let v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

export function readProducerApiKeyFromRequest(req: Request): string {
  return (
    normalizeProducerKey(req.headers.get("x-news-producer-key") ?? undefined) ||
    normalizeProducerKey(
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? undefined,
    )
  );
}

/** @deprecated Producer writes use Supabase session auth — see lib/server/producer-auth.ts */
export function verifyProducerApiKey(req: Request): boolean {
  const expected = normalizeProducerKey(process.env.NEWS_PRODUCER_API_KEY);
  if (!expected) {
    return false;
  }
  const provided = readProducerApiKeyFromRequest(req);
  return Boolean(provided && provided === expected);
}

function clearShowRuntime(next: NewsProducerState): void {
  next.activeShowProgramId = null;
  next.showStartedAt = null;
  next.commercialFiredSlotIds = [];
  next.activeCommercialSlotId = null;
}

function mergeTalentLines(
  presetIds: string[],
  presets: NewsProducerPresets,
  customLines: BroadcastTalentLine[] | undefined,
): BroadcastTalentLine[] {
  const seen = new Set<string>();
  const lines: BroadcastTalentLine[] = [];

  for (const id of presetIds) {
    const preset = presets.talent.find((t) => t.id === id);
    for (const line of preset?.lines ?? []) {
      const key = line.name.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(line);
    }
  }

  for (const line of customLines ?? []) {
    const key = line.name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    lines.push(line);
  }

  return lines;
}

function applyShowConfigToState(
  next: NewsProducerState,
  config: ProgramShowConfig,
  presets: NewsProducerPresets,
): void {
  if (config.titlePresetId) {
    applyTitlePresetSync(next, presets, config.titlePresetId);
  }
  if (config.titleLogoNasPath?.trim()) {
    const rel = config.titleLogoNasPath.trim();
    if (resolveBlocksMediaFile(rel)) {
      next.customTitleLogoNasPath = rel;
    }
  }

  const talentIds = config.talentPresetIds ?? [];
  if (talentIds.length === 1) {
    next.activeTalentPresetId = talentIds[0];
    const extra = config.customTalent?.filter(Boolean) ?? [];
    if (extra.length) {
      const preset = presets.talent.find((t) => t.id === talentIds[0]);
      const merged = mergeTalentLines(talentIds, presets, [
        ...(preset?.lines ?? []),
        ...extra,
      ]);
      next.customTalent = merged.length ? merged : null;
      next.activeTalentPresetId = null;
    } else {
      next.customTalent = null;
    }
  } else if (talentIds.length > 1 || (config.customTalent?.length ?? 0) > 0) {
    const merged = mergeTalentLines(talentIds, presets, config.customTalent);
    next.customTalent = merged.length ? merged : null;
    next.activeTalentPresetId = null;
  }

  if (config.liveData.enabled) {
    next.liveStreamDataAssetIds = normalizeLiveStreamDataAssetIds(
      config.liveData.assetIds ?? [],
    );
    const marketing = config.liveData.marketingNasPath?.trim() || null;
    if (marketing && resolveBlocksMediaFile(marketing)) {
      next.liveStreamDataMarketingNasPath = marketing;
    } else if (!marketing) {
      /* keep existing marketing unless explicitly cleared in config */
    }
  } else {
    next.liveStreamDataAssetIds = [];
    next.liveStreamDataMarketingNasPath = null;
  }

  const fullscreen = config.graphicsZones?.find((z) => z.zone === "fullscreen");
  if (fullscreen?.nasPath?.trim() && resolveBlocksMediaFile(fullscreen.nasPath)) {
    next.activeGraphicNasPath = fullscreen.nasPath.trim();
  }
}

function applyShowStreamFromPreset(
  next: NewsProducerState,
  preset: ProgramAssetPreset,
  config?: ProgramShowConfig | null,
): void {
  if (preset.type === "live" || preset.id === "return-live") {
    next.programMode = "schedule";
    next.activeProgramPresetId = null;
    next.programOverride = null;
    return;
  }

  const configNas = config?.showVideoNasPath?.trim() || null;
  const configUrl = config?.showVideoUrl?.trim() || null;
  const nasPath =
    configNas && resolveBlocksMediaFile(configNas) ? configNas : preset.nasPath;

  next.programMode = preset.type;
  next.activeProgramPresetId = preset.id;
  next.programOverride = {
    label: preset.label,
    type: preset.type,
    videoUrl: configUrl || preset.videoUrl,
    videoId: preset.videoId,
    channelId: preset.channelId,
    nasPath,
  };
}

function pushActiveShowLive(next: NewsProducerState, presets: NewsProducerPresets): boolean {
  const showId = next.activeShowProgramId;
  if (!showId) return false;
  const preset = presets.program.find((p) => p.id === showId);
  const config = getShowConfigForProgram(showId);
  if (!preset || !config) return false;
  applyShowConfigToState(next, config, presets);
  applyShowStreamFromPreset(next, preset, config);
  return true;
}

export function resumeActiveShow(): NewsProducerState {
  const state = readProducerState();
  if (!state.activeShowProgramId) {
    return applyProducerPatch({ returnToLive: true, updatedBy: "nas-complete" });
  }

  const presets = readProducerPresets();
  const preset = presets.program.find(
    (p) => p.id === state.activeShowProgramId,
  );
  const config = getShowConfigForProgram(state.activeShowProgramId);
  if (!preset || !config) {
    return applyProducerPatch({ returnToLive: true, updatedBy: "nas-complete" });
  }

  const next: NewsProducerState = { ...state };

  if (state.activeCommercialSlotId) {
    const fired = new Set(next.commercialFiredSlotIds ?? []);
    fired.add(state.activeCommercialSlotId);
    next.commercialFiredSlotIds = [...fired];
    next.activeCommercialSlotId = null;
  }

  applyShowConfigToState(next, config, presets);
  applyShowStreamFromPreset(next, preset, config);
  next.updatedAt = new Date().toISOString();
  return writeProducerState(next);
}

type PatchBody = Partial<{
  activeTalentPresetId: string | null;
  customTalent: BroadcastTalentLine[] | null;
  activeTitlePresetId: string | null;
  customTitleText: string | null;
  customTitleLogoNasPath: string | null;
  programMode: ProducerProgramMode;
  activeProgramPresetId: string | null;
  programOverride: ProducerProgramOverride | null;
  fireProgramPresetId: string;
  fireNasAsset: {
    relPath: string;
    label?: string;
    type?: ProducerProgramMode;
    category?: string;
  };
  activeGraphicNasPath: string | null;
  clearGraphic: boolean;
  liveStreamDataAssetIds: string[] | null;
  liveStreamDataMarketingNasPath: string | null;
  clearLiveStreamDataMarketing: boolean;
  clearTitleBarLogo: boolean;
  returnToLive: boolean;
  endShow: boolean;
  pushShowLive: boolean;
  saveProgramShowConfig: { programPresetId: string; config: ProgramShowConfig };
  selectProgramPresetId: string | null;
  goOnAirProgramId: string;
  fireCommercialSlot: { programId: string; slotId: string };
  updatedBy: string;
}>;

export function applyProducerPatch(body: PatchBody): NewsProducerState {
  const state = readProducerState();
  const presets = readProducerPresets();
  const next: NewsProducerState = { ...state };

  if (body.returnToLive || body.endShow) {
    clearShowRuntime(next);
    next.programMode = "schedule";
    next.activeProgramPresetId = null;
    next.programOverride = null;
    next.activeGraphicNasPath = null;
    next.activeTitlePresetId = null;
    next.customTitleLogoNasPath = null;
  }

  if (body.saveProgramShowConfig?.programPresetId) {
    writeProgramShowConfig(
      body.saveProgramShowConfig.programPresetId,
      body.saveProgramShowConfig.config,
    );
  }

  if (body.selectProgramPresetId !== undefined) {
    next.selectedProgramPresetId = body.selectProgramPresetId;
  }

  if (body.goOnAirProgramId) {
    const preset = presets.program.find((p) => p.id === body.goOnAirProgramId);
    const config = getShowConfigForProgram(body.goOnAirProgramId);
    if (preset && config) {
      clearShowRuntime(next);
      next.activeShowProgramId = preset.id;
      next.showStartedAt = new Date().toISOString();
      next.selectedProgramPresetId = preset.id;
      applyShowConfigToState(next, config, presets);
      applyShowStreamFromPreset(next, preset, config);
    }
  }

  if (body.pushShowLive) {
    pushActiveShowLive(next, presets);
  }

  if (body.fireCommercialSlot?.programId && body.fireCommercialSlot?.slotId) {
    const config = getShowConfigForProgram(body.fireCommercialSlot.programId);
    const slot = config?.commercials?.find(
      (s) => s.id === body.fireCommercialSlot!.slotId,
    );
    if (slot?.enabled && slot.nasPath?.trim()) {
      const patched = applyCommercialSlotToState(
        next,
        slot,
        `Commercial · ${slot.id}`,
      );
      Object.assign(next, patched);
      if (!next.activeShowProgramId) {
        next.activeShowProgramId = body.fireCommercialSlot.programId;
      }
    }
  }

  if (body.clearGraphic) {
    next.activeGraphicNasPath = null;
  }

  if (body.clearLiveStreamDataMarketing) {
    next.liveStreamDataMarketingNasPath = null;
  }

  if (body.clearTitleBarLogo) {
    next.customTitleLogoNasPath = null;
  }

  if (body.activeGraphicNasPath !== undefined) {
    next.activeGraphicNasPath = body.activeGraphicNasPath;
  }

  if (body.liveStreamDataAssetIds !== undefined) {
    next.liveStreamDataAssetIds = normalizeLiveStreamDataAssetIds(
      body.liveStreamDataAssetIds ?? [],
    );
  }

  if (body.liveStreamDataMarketingNasPath !== undefined) {
    const rel = body.liveStreamDataMarketingNasPath?.trim() || null;
    if (rel && !resolveBlocksMediaFile(rel)) {
      // ignore invalid NAS paths
    } else {
      next.liveStreamDataMarketingNasPath = rel;
    }
  }

  if (body.fireNasAsset?.relPath) {
    const relPath = body.fireNasAsset.relPath.replace(/\\/g, "/");
    if (resolveBlocksMediaFile(relPath)) {
      const isGraphic = relPath.startsWith("graphics/");
      if (isGraphic) {
        next.activeGraphicNasPath = relPath;
      } else {
        const mode =
          body.fireNasAsset.type ??
          categoryToProgramMode(
            body.fireNasAsset.category ??
              relPath.split("/")[0] ??
              "shows",
          );
        const fileName = relPath.split("/").pop() ?? relPath;
        next.programMode = mode;
        next.activeProgramPresetId = null;
        next.programOverride = {
          label: body.fireNasAsset.label?.trim() || fileName,
          type: mode,
          nasPath: relPath,
        };
        const nasTitleId = resolveLinkedTitlePresetId(next, presets, {
          programSlotId: null,
          programLabel: next.programOverride.label,
        });
        if (nasTitleId) applyTitlePresetSync(next, presets, nasTitleId);
      }
    }
  }

  if (body.fireProgramPresetId) {
    const preset = presets.program.find(
      (p) => p.id === body.fireProgramPresetId,
    );
    if (preset) {
      if (preset.type === "live" || preset.id === "return-live") {
        next.programMode = "schedule";
        next.activeProgramPresetId = null;
        next.programOverride = null;
        next.activeTitlePresetId = null;
      } else {
        next.programMode = preset.type;
        next.activeProgramPresetId = preset.id;
        next.programOverride = {
          label: preset.label,
          type: preset.type,
          videoUrl: preset.videoUrl,
          videoId: preset.videoId,
          channelId: preset.channelId,
          nasPath: preset.nasPath,
        };
        if (preset.titlePresetId) {
          applyTitlePresetSync(next, presets, preset.titlePresetId);
        }
      }
    }
  }

  if (body.activeTalentPresetId !== undefined) {
    next.activeTalentPresetId = body.activeTalentPresetId;
    if (body.activeTalentPresetId) next.customTalent = null;
  }

  if (body.customTalent !== undefined) {
    next.customTalent = body.customTalent;
    if (body.customTalent?.length) next.activeTalentPresetId = null;
  }

  if (body.activeTitlePresetId !== undefined) {
    if (body.activeTitlePresetId) {
      applyTitlePresetSync(next, presets, body.activeTitlePresetId);
    } else {
      next.activeTitlePresetId = null;
    }
  }

  if (body.customTitleText !== undefined) {
    const text = body.customTitleText?.trim() || null;
    next.customTitleText = text;
    if (text) next.activeTitlePresetId = null;
  }

  if (body.customTitleLogoNasPath !== undefined) {
    const rel = body.customTitleLogoNasPath?.trim() || null;
    if (rel && !resolveBlocksMediaFile(rel)) {
      // ignore invalid NAS paths
    } else {
      next.customTitleLogoNasPath = rel;
    }
  }

  if (body.programMode !== undefined) next.programMode = body.programMode;

  if (body.activeProgramPresetId !== undefined) {
    next.activeProgramPresetId = body.activeProgramPresetId;
  }

  if (body.programOverride !== undefined) {
    next.programOverride = body.programOverride;
    if (body.programOverride) {
      next.programMode = body.programOverride.type;
    }
  }

  next.updatedAt = new Date().toISOString();
  if (body.updatedBy) next.updatedBy = body.updatedBy;

  return writeProducerState(next);
}
