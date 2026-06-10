import fs from "node:fs";
import path from "node:path";

export interface BroadcastTalentLine {
  name: string;
  roles: string[];
  creditLine?: string;
}

export interface ProgramCommercialSlot {
  id: string;
  enabled: boolean;
  nasPath?: string;
  trigger: "manual" | "offsetAfterStart";
  offsetMinutes?: number;
  playMode: "fullDuration" | "maxSeconds";
  maxDurationSeconds?: number;
  autoReturnOnEnd: boolean;
}

export interface ProgramGraphicsZone {
  zone: "liveData" | "newsReel" | "bottomBar" | "fullscreen";
  nasPath?: string;
  timing: "static" | "cycle" | "showStartOffset";
  cycleSeconds?: number;
  offsetSeconds?: number;
}

export interface ProgramShowConfig {
  programPresetId: string;
  titlePresetId?: string | null;
  titleLogoNasPath?: string | null;
  talentPresetIds: string[];
  customTalent?: BroadcastTalentLine[];
  liveData: {
    enabled: boolean;
    assetIds: string[];
    marketingNasPath?: string | null;
  };
  commercials: ProgramCommercialSlot[];
  graphicsZones: ProgramGraphicsZone[];
  newsReel: {
    mode: "news" | "customText" | "graphic" | "hidden";
    customCrawlText?: string;
    graphicNasPath?: string;
  };
  bottomBar: {
    mode: "newsTicker" | "customText" | "graphic" | "hidden";
    customText?: string;
    graphicNasPath?: string;
  };
  /** NAS shows/ clip or leave empty to use preset default from news-producer-presets.json */
  showVideoNasPath?: string | null;
  /** YouTube URL override when not using NAS file */
  showVideoUrl?: string | null;
}

export interface ShowOverlayPublic {
  activeShowProgramId: string | null;
  liveDataEnabled: boolean;
  liveDataGraphicUrl: string | null;
  newsReelMode: ProgramShowConfig["newsReel"]["mode"];
  newsReelCustomText: string | null;
  newsReelGraphicUrl: string | null;
  bottomBarMode: ProgramShowConfig["bottomBar"]["mode"];
  bottomBarCustomText: string | null;
  bottomBarGraphicUrl: string | null;
  fullscreenGraphicUrl: string | null;
  activeCommercialLabel: string | null;
  maxPlaybackSeconds: number | null;
}

const DATA_DIR = path.join(process.cwd(), "data");
const CONFIG_DIR = path.join(process.cwd(), "config", "blocks-producer");
const RUNTIME_PATH = path.join(DATA_DIR, "news-program-show-configs.json");
const SEED_PATH = path.join(CONFIG_DIR, "news-program-show-configs.json");

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function newSlotId(): string {
  return `slot-${Date.now().toString(36)}`;
}

export function defaultProgramShowConfig(
  programPresetId: string,
  titlePresetId?: string | null,
): ProgramShowConfig {
  return {
    programPresetId,
    titlePresetId: titlePresetId ?? null,
    titleLogoNasPath: null,
    talentPresetIds: [],
    customTalent: [],
    liveData: {
      enabled: true,
      assetIds: [],
      marketingNasPath: null,
    },
    commercials: [],
    graphicsZones: [],
    newsReel: { mode: "news" },
    bottomBar: { mode: "newsTicker" },
  };
}

function seedConfigsFromPresets(): Record<string, ProgramShowConfig> {
  const presetsPath = path.join(CONFIG_DIR, "news-producer-presets.json");
  if (!fs.existsSync(presetsPath)) return {};
  try {
    const raw = JSON.parse(fs.readFileSync(presetsPath, "utf8")) as {
      program?: Array<{
        id: string;
        titlePresetId?: string;
      }>;
    };
    const out: Record<string, ProgramShowConfig> = {};
    for (const p of raw.program ?? []) {
      if (!p.id?.startsWith("show-")) continue;
      out[p.id] = defaultProgramShowConfig(p.id, p.titlePresetId ?? null);
    }
    return out;
  } catch {
    return {};
  }
}

export function readProgramShowConfigs(): Record<string, ProgramShowConfig> {
  ensureDataDir();
  if (!fs.existsSync(RUNTIME_PATH)) {
    let seed: Record<string, ProgramShowConfig> = {};
    if (fs.existsSync(SEED_PATH)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(SEED_PATH, "utf8")) as {
          configs?: Record<string, ProgramShowConfig>;
        };
        seed = parsed.configs ?? {};
      } catch {
        seed = {};
      }
    }
    if (Object.keys(seed).length === 0) {
      seed = seedConfigsFromPresets();
    }
    fs.writeFileSync(
      RUNTIME_PATH,
      JSON.stringify({ configs: seed }, null, 2),
      "utf8",
    );
    return seed;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(RUNTIME_PATH, "utf8")) as {
      configs?: Record<string, ProgramShowConfig>;
    };
    return parsed.configs ?? {};
  } catch {
    return {};
  }
}

export function writeProgramShowConfig(
  programPresetId: string,
  config: ProgramShowConfig,
): ProgramShowConfig {
  ensureDataDir();
  const all = readProgramShowConfigs();
  const merged: ProgramShowConfig = {
    ...defaultProgramShowConfig(programPresetId),
    ...config,
    programPresetId,
    liveData: {
      ...defaultProgramShowConfig(programPresetId).liveData,
      ...config.liveData,
    },
    newsReel: {
      ...defaultProgramShowConfig(programPresetId).newsReel,
      ...config.newsReel,
    },
    bottomBar: {
      ...defaultProgramShowConfig(programPresetId).bottomBar,
      ...config.bottomBar,
    },
    commercials: (config.commercials ?? []).map((s, i) => ({
      ...s,
      id: s.id?.trim() || newSlotId(),
      autoReturnOnEnd: s.autoReturnOnEnd ?? true,
      playMode: s.playMode ?? "fullDuration",
      trigger: s.trigger ?? "manual",
    })),
  };
  all[programPresetId] = merged;
  fs.writeFileSync(
    RUNTIME_PATH,
    JSON.stringify({ configs: all }, null, 2),
    "utf8",
  );
  return merged;
}

export function getShowConfigForProgram(
  programPresetId: string,
): ProgramShowConfig | null {
  const all = readProgramShowConfigs();
  if (all[programPresetId]) return all[programPresetId];
  const presetsPath = path.join(CONFIG_DIR, "news-producer-presets.json");
  if (!fs.existsSync(presetsPath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(presetsPath, "utf8")) as {
      program?: Array<{ id: string; titlePresetId?: string }>;
    };
    const preset = raw.program?.find((p) => p.id === programPresetId);
    if (!preset) return null;
    return defaultProgramShowConfig(preset.id, preset.titlePresetId ?? null);
  } catch {
    return null;
  }
}

export function mediaServeUrl(nasPath: string | null | undefined): string | null {
  const p = nasPath?.trim();
  if (!p) return null;
  return `/api/news/producer/media/serve?path=${encodeURIComponent(p)}`;
}

export function buildShowOverlay(
  activeShowProgramId: string | null,
  programMode: string,
  programOverrideLabel: string | null,
  maxPlaybackSeconds: number | null,
): ShowOverlayPublic | null {
  if (!activeShowProgramId) return null;
  const config = getShowConfigForProgram(activeShowProgramId);
  if (!config) return null;

  const zoneUrl = (zone: ProgramGraphicsZone["zone"]): string | null => {
    const z = config.graphicsZones?.find((g) => g.zone === zone);
    return mediaServeUrl(z?.nasPath);
  };

  const liveDataZone = config.graphicsZones?.find((g) => g.zone === "liveData");
  const liveDataGraphicUrl = mediaServeUrl(liveDataZone?.nasPath);

  let newsReelGraphicUrl: string | null = null;
  if (config.newsReel.mode === "graphic") {
    newsReelGraphicUrl = mediaServeUrl(config.newsReel.graphicNasPath);
    if (!newsReelGraphicUrl) newsReelGraphicUrl = zoneUrl("newsReel");
  }

  let bottomBarGraphicUrl: string | null = null;
  if (config.bottomBar.mode === "graphic") {
    bottomBarGraphicUrl = mediaServeUrl(config.bottomBar.graphicNasPath);
    if (!bottomBarGraphicUrl) bottomBarGraphicUrl = zoneUrl("bottomBar");
  }

  const fullscreenZone = config.graphicsZones?.find(
    (g) => g.zone === "fullscreen",
  );
  const fullscreenGraphicUrl = mediaServeUrl(fullscreenZone?.nasPath);

  return {
    activeShowProgramId,
    liveDataEnabled: config.liveData.enabled,
    liveDataGraphicUrl:
      config.liveData.enabled === false ? liveDataGraphicUrl : liveDataGraphicUrl,
    newsReelMode: config.newsReel.mode,
    newsReelCustomText: config.newsReel.customCrawlText?.trim() || null,
    newsReelGraphicUrl,
    bottomBarMode: config.bottomBar.mode,
    bottomBarCustomText: config.bottomBar.customText?.trim() || null,
    bottomBarGraphicUrl,
    fullscreenGraphicUrl,
    activeCommercialLabel:
      programMode === "commercial" ? programOverrideLabel : null,
    maxPlaybackSeconds,
  };
}
