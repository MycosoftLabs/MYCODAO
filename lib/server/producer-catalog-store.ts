/**
 * Durable producer catalogs: prefer Supabase when service role is configured,
 * otherwise persist to local JSON (NEWS_PRODUCER_PRESETS_PATH / state).
 */
import "server-only";
import {
  readProducerPresets,
  writeProducerPresets,
  readProducerState,
  writeProducerState,
  type NewsProducerPresets,
  type TalentPreset,
  type ProgramAssetPreset,
  type TitleBarPreset,
} from "@/lib/server/news-producer";
import { getSupabaseServiceRole } from "@/lib/supabase/server";

const TALENT_TABLE = "blocks_producer_talent";
const PROGRAM_TABLE = "blocks_producer_programs";
const TITLE_TABLE = "blocks_producer_titles";
const LIVE_PICKS_TABLE = "blocks_producer_live_picks";

function slugId(label: string): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return base || `preset-${Date.now().toString(36)}`;
}

async function loadFromSupabase(): Promise<NewsProducerPresets | null> {
  const sb = getSupabaseServiceRole();
  if (!sb) return null;
  try {
    const [talent, program, title] = await Promise.all([
      sb.from(TALENT_TABLE).select("*").order("sort_order", { ascending: true }),
      sb.from(PROGRAM_TABLE).select("*").order("sort_order", { ascending: true }),
      sb.from(TITLE_TABLE).select("*").order("sort_order", { ascending: true }),
    ]);
    if (talent.error || program.error || title.error) return null;
    return {
      talent: (talent.data ?? []).map((row) => ({
        id: String(row.id),
        label: String(row.label),
        lines: Array.isArray(row.lines) ? row.lines : [],
      })),
      program: (program.data ?? []).map((row) => ({
        id: String(row.id),
        label: String(row.label),
        type: (row.type as ProgramAssetPreset["type"]) || "recorded",
        videoUrl: row.video_url ?? undefined,
        videoId: row.video_id ?? undefined,
        channelId: row.channel_id ?? undefined,
        nasPath: row.nas_path ?? undefined,
        titlePresetId: row.title_preset_id ?? undefined,
      })),
      title: (title.data ?? []).map((row) => ({
        id: String(row.id),
        label: String(row.label),
        title: String(row.title ?? row.label),
        logoNasPath: row.logo_nas_path ?? null,
      })),
    };
  } catch {
    return null;
  }
}

async function saveToSupabase(presets: NewsProducerPresets): Promise<boolean> {
  const sb = getSupabaseServiceRole();
  if (!sb) return false;
  try {
    await sb.from(TALENT_TABLE).delete().neq("id", "");
    await sb.from(PROGRAM_TABLE).delete().neq("id", "");
    await sb.from(TITLE_TABLE).delete().neq("id", "");
    if (presets.talent.length) {
      const { error } = await sb.from(TALENT_TABLE).insert(
        presets.talent.map((t, i) => ({
          id: t.id,
          label: t.label,
          lines: t.lines,
          sort_order: i,
          updated_at: new Date().toISOString(),
        })),
      );
      if (error) throw error;
    }
    if (presets.program.length) {
      const { error } = await sb.from(PROGRAM_TABLE).insert(
        presets.program.map((p, i) => ({
          id: p.id,
          label: p.label,
          type: p.type,
          video_url: p.videoUrl ?? null,
          video_id: p.videoId ?? null,
          channel_id: p.channelId ?? null,
          nas_path: p.nasPath ?? null,
          title_preset_id: p.titlePresetId ?? null,
          sort_order: i,
          updated_at: new Date().toISOString(),
        })),
      );
      if (error) throw error;
    }
    if (presets.title.length) {
      const { error } = await sb.from(TITLE_TABLE).insert(
        presets.title.map((t, i) => ({
          id: t.id,
          label: t.label,
          title: t.title,
          logo_nas_path: t.logoNasPath ?? null,
          sort_order: i,
          updated_at: new Date().toISOString(),
        })),
      );
      if (error) throw error;
    }
    return true;
  } catch {
    return false;
  }
}

export async function loadProducerCatalog(): Promise<NewsProducerPresets> {
  const remote = await loadFromSupabase();
  if (remote) return remote;
  return readProducerPresets();
}

export async function saveProducerCatalog(
  presets: NewsProducerPresets,
): Promise<{ presets: NewsProducerPresets; storage: "supabase" | "json" }> {
  const normalized = writeProducerPresets(presets);
  const ok = await saveToSupabase(normalized);
  return { presets: normalized, storage: ok ? "supabase" : "json" };
}

export async function upsertTalentPreset(
  input: Partial<TalentPreset> & { label: string },
): Promise<NewsProducerPresets> {
  const catalog = await loadProducerCatalog();
  const id = input.id?.trim() || slugId(input.label);
  const next: TalentPreset = {
    id,
    label: input.label.trim(),
    lines: Array.isArray(input.lines) ? input.lines : [{ name: input.label.trim(), roles: ["On air"] }],
  };
  const talent = [...catalog.talent.filter((t) => t.id !== id), next];
  return (await saveProducerCatalog({ ...catalog, talent })).presets;
}

export async function removeTalentPreset(id: string): Promise<NewsProducerPresets> {
  const catalog = await loadProducerCatalog();
  return (await saveProducerCatalog({
    ...catalog,
    talent: catalog.talent.filter((t) => t.id !== id),
  })).presets;
}

export async function upsertProgramPreset(
  input: Partial<ProgramAssetPreset> & { label: string; type: ProgramAssetPreset["type"] },
): Promise<NewsProducerPresets> {
  const catalog = await loadProducerCatalog();
  const id = input.id?.trim() || slugId(input.label);
  const next: ProgramAssetPreset = {
    id,
    label: input.label.trim(),
    type: input.type,
    videoUrl: input.videoUrl,
    videoId: input.videoId,
    channelId: input.channelId,
    nasPath: input.nasPath,
    titlePresetId: input.titlePresetId,
  };
  const program = [...catalog.program.filter((p) => p.id !== id), next];
  return (await saveProducerCatalog({ ...catalog, program })).presets;
}

export async function removeProgramPreset(id: string): Promise<NewsProducerPresets> {
  const catalog = await loadProducerCatalog();
  return (await saveProducerCatalog({
    ...catalog,
    program: catalog.program.filter((p) => p.id !== id),
  })).presets;
}

export async function upsertTitlePreset(
  input: Partial<TitleBarPreset> & { label: string; title: string },
): Promise<NewsProducerPresets> {
  const catalog = await loadProducerCatalog();
  const id = input.id?.trim() || slugId(input.label);
  const next: TitleBarPreset = {
    id,
    label: input.label.trim(),
    title: input.title.trim(),
    logoNasPath: input.logoNasPath ?? null,
  };
  const title = [...catalog.title.filter((t) => t.id !== id), next];
  return (await saveProducerCatalog({ ...catalog, title })).presets;
}

export async function removeTitlePreset(id: string): Promise<NewsProducerPresets> {
  const catalog = await loadProducerCatalog();
  return (await saveProducerCatalog({
    ...catalog,
    title: catalog.title.filter((t) => t.id !== id),
  })).presets;
}

/** Persist live-data instrument picks to shared store (and producer state). */
export async function saveLiveDataPicks(
  assetIds: string[],
  actor?: string,
): Promise<{ assetIds: string[]; storage: "supabase" | "json" }> {
  const ids = assetIds.map((id) => id.trim()).filter(Boolean).slice(0, 3);
  const state = readProducerState();
  writeProducerState({
    ...state,
    liveStreamDataAssetIds: ids,
    updatedAt: new Date().toISOString(),
    updatedBy: actor,
  });
  const sb = getSupabaseServiceRole();
  if (sb) {
    try {
      await sb.from(LIVE_PICKS_TABLE).upsert({
        id: "default",
        asset_ids: ids,
        updated_at: new Date().toISOString(),
        updated_by: actor ?? null,
      });
      return { assetIds: ids, storage: "supabase" };
    } catch {
      /* fall through */
    }
  }
  return { assetIds: ids, storage: "json" };
}

export async function loadLiveDataPicks(): Promise<string[]> {
  const sb = getSupabaseServiceRole();
  if (sb) {
    try {
      const { data, error } = await sb
        .from(LIVE_PICKS_TABLE)
        .select("asset_ids")
        .eq("id", "default")
        .maybeSingle();
      if (!error && data && Array.isArray(data.asset_ids)) {
        return data.asset_ids.map(String).slice(0, 3);
      }
    } catch {
      /* fall through */
    }
  }
  return readProducerState().liveStreamDataAssetIds ?? [];
}
