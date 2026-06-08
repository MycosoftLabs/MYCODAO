import fs from "fs";
import path from "path";
import {
  buildYoutubeEmbedFromSource,
  withNewsPlayerParams,
} from "@/lib/news-channel-embed";
import type { ProgramSourceType } from "@/lib/server/news-channel-program";
import { resolveBlocksMediaFile } from "@/lib/server/blocks-nas-media";

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
}

export interface NewsProducerPresets {
  talent: TalentPreset[];
  program: ProgramAssetPreset[];
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
  programMode: ProducerProgramMode;
  activeProgramPresetId: string | null;
  programOverride: ProducerProgramOverride | null;
  /** Lower-third / fullscreen graphic from NAS graphics/ folder */
  activeGraphicNasPath: string | null;
}

export interface NewsProducerPublic {
  updatedAt: string;
  talent: BroadcastTalentLine[];
  talentPresetId: string | null;
  talentPresetLabel: string | null;
  programMode: ProducerProgramMode;
  programLabel: string | null;
  programEmbedUrl: string | null;
  programMediaUrl: string | null;
  programGraphicUrl: string | null;
  programNasPath: string | null;
  programSourceType: ProgramSourceType | "producer";
  activeProgramPresetId: string | null;
  activeGraphicNasPath: string | null;
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
    readJsonFile<NewsProducerPresets>(presetsPath()) ?? {
      talent: [],
      program: [],
    };
  return {
    talent: presets.talent ?? [],
    program: presets.program ?? [],
  };
}

export function readProducerState(): NewsProducerState {
  const fallback: NewsProducerState = {
    updatedAt: new Date().toISOString(),
    activeTalentPresetId: "morgan-rockwell",
    customTalent: null,
    programMode: "schedule",
    activeProgramPresetId: null,
    programOverride: null,
    activeGraphicNasPath: null,
  };
  const raw = readJsonFile<NewsProducerState>(statePath()) ?? fallback;
  return {
    ...fallback,
    ...raw,
    activeGraphicNasPath: raw.activeGraphicNasPath ?? null,
  };
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
  if (preset?.lines?.length) {
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

export function buildProducerPublicView(): NewsProducerPublic {
  const state = readProducerState();
  const presets = readProducerPresets();
  const talent = resolveProducerTalent(state, presets);
  const program = resolveProducerProgramEmbed(state);

  const graphicUrl = state.activeGraphicNasPath
    ? resolveNasMediaServeUrl(state.activeGraphicNasPath)
    : null;

  return {
    updatedAt: state.updatedAt,
    talent: talent.lines,
    talentPresetId: talent.presetId,
    talentPresetLabel: talent.presetLabel,
    programMode: state.programMode,
    programLabel: program?.label ?? null,
    programEmbedUrl: program?.embedUrl ?? null,
    programMediaUrl: program?.mediaUrl ?? null,
    programNasPath: program?.nasPath ?? null,
    programGraphicUrl: graphicUrl,
    programSourceType: program?.sourceType ?? "producer",
    activeProgramPresetId: state.activeProgramPresetId,
    activeGraphicNasPath: state.activeGraphicNasPath,
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

type PatchBody = Partial<{
  activeTalentPresetId: string | null;
  customTalent: BroadcastTalentLine[] | null;
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
  returnToLive: boolean;
  updatedBy: string;
}>;

export function applyProducerPatch(body: PatchBody): NewsProducerState {
  const state = readProducerState();
  const presets = readProducerPresets();
  const next: NewsProducerState = { ...state };

  if (body.returnToLive) {
    next.programMode = "schedule";
    next.activeProgramPresetId = null;
    next.programOverride = null;
    next.activeGraphicNasPath = null;
  }

  if (body.clearGraphic) {
    next.activeGraphicNasPath = null;
  }

  if (body.activeGraphicNasPath !== undefined) {
    next.activeGraphicNasPath = body.activeGraphicNasPath;
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
      } else {
        next.programMode = preset.type;
        next.activeProgramPresetId = preset.id;
        next.programOverride = {
          label: preset.label,
          type: preset.type,
          videoUrl: preset.videoUrl,
          videoId: preset.videoId,
          channelId: preset.channelId,
        };
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
