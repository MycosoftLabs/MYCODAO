import { buildServeUrl } from "@/lib/server/blocks-nas-media";
import {
  getSupabaseAnon,
  getSupabaseServiceRole,
} from "@/lib/supabase/server";

export type TissueCategory = "mushroom" | "mold" | "mildew" | "yeast";
export type TissueVisibility = "public" | "internal" | "hidden";
export type TissueMediaKind = "image" | "video" | "stream";

export interface TissueTaxonomy {
  kingdom?: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
  species?: string;
  [key: string]: string | undefined;
}

export interface TissueMediaRow {
  id: string;
  sample_id: string;
  nas_path: string;
  kind: TissueMediaKind;
  live_stream_url: string | null;
  is_cover: boolean;
  sort_order: number;
  visibility: TissueVisibility;
  created_at: string;
}

export interface TissueSampleRow {
  id: string;
  sample_id: string;
  common_name: string;
  scientific_name: string;
  category: TissueCategory;
  taxonomy: TissueTaxonomy;
  mindex_taxon_id: string | null;
  mass_value: number | null;
  mass_unit: "g" | "mg" | null;
  storage_location: string | null;
  collected_at: string | null;
  description: string | null;
  visibility: TissueVisibility;
  cover_media_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface TissueMediaPublic {
  id: string;
  nasPath: string;
  kind: TissueMediaKind;
  liveStreamUrl: string | null;
  isCover: boolean;
  sortOrder: number;
  visibility: TissueVisibility;
  serveUrl: string;
}

export interface TissueSamplePublic {
  id: string;
  sampleId: string;
  commonName: string;
  scientificName: string;
  category: TissueCategory;
  taxonomy: TissueTaxonomy;
  mindexTaxonId: string | null;
  massValue: number | null;
  massUnit: "g" | "mg" | null;
  massLabel: string | null;
  storageLocation: string | null;
  collectedAt: string | null;
  description: string | null;
  visibility: TissueVisibility;
  coverServeUrl: string | null;
  media: TissueMediaPublic[];
}

function supabaseForPublic() {
  const client = getSupabaseServiceRole() ?? getSupabaseAnon();
  if (!client) {
    throw new Error("supabase_unconfigured");
  }
  return client;
}

function supabaseForAdmin() {
  const client = getSupabaseServiceRole();
  if (!client) {
    throw new Error("supabase_unconfigured");
  }
  return client;
}

function formatMass(
  value: number | null,
  unit: "g" | "mg" | null,
): string | null {
  if (value == null || !unit) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return `${n} ${unit}`;
}

function toMediaPublic(row: TissueMediaRow): TissueMediaPublic {
  return {
    id: row.id,
    nasPath: row.nas_path,
    kind: row.kind,
    liveStreamUrl: row.live_stream_url,
    isCover: row.is_cover,
    sortOrder: row.sort_order,
    visibility: row.visibility,
    serveUrl: buildServeUrl(row.nas_path),
  };
}

function pickCoverServeUrl(
  sample: TissueSampleRow,
  media: TissueMediaRow[],
  publicOnly: boolean,
): string | null {
  const visible = publicOnly
    ? media.filter((m) => m.visibility === "public")
    : media;
  const cover =
    visible.find((m) => m.id === sample.cover_media_id) ||
    visible.find((m) => m.is_cover) ||
    visible[0];
  return cover ? buildServeUrl(cover.nas_path) : null;
}

function toSamplePublic(
  sample: TissueSampleRow,
  media: TissueMediaRow[],
  publicOnly: boolean,
): TissueSamplePublic {
  const visibleMedia = publicOnly
    ? media.filter((m) => m.visibility === "public")
    : media;
  const sorted = [...visibleMedia].sort(
    (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at),
  );

  return {
    id: sample.id,
    sampleId: sample.sample_id,
    commonName: sample.common_name,
    scientificName: sample.scientific_name,
    category: sample.category,
    taxonomy: (sample.taxonomy ?? {}) as TissueTaxonomy,
    mindexTaxonId: sample.mindex_taxon_id,
    massValue: sample.mass_value != null ? Number(sample.mass_value) : null,
    massUnit: sample.mass_unit,
    massLabel: formatMass(
      sample.mass_value != null ? Number(sample.mass_value) : null,
      sample.mass_unit,
    ),
    storageLocation: sample.storage_location,
    collectedAt: sample.collected_at,
    description: sample.description,
    visibility: sample.visibility,
    coverServeUrl: pickCoverServeUrl(sample, media, publicOnly),
    media: sorted.map(toMediaPublic),
  };
}

async function loadMediaForSamples(
  sampleIds: string[],
  mode: "public" | "admin" = "admin",
): Promise<Map<string, TissueMediaRow[]>> {
  const map = new Map<string, TissueMediaRow[]>();
  if (!sampleIds.length) return map;

  const sb = mode === "public" ? supabaseForPublic() : supabaseForAdmin();
  const { data, error } = await sb
    .from("tissue_media")
    .select("*")
    .in("sample_id", sampleIds)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);

  for (const row of (data ?? []) as TissueMediaRow[]) {
    const list = map.get(row.sample_id) ?? [];
    list.push(row);
    map.set(row.sample_id, list);
  }
  return map;
}

export async function listPublicTissueSamples(opts?: {
  category?: TissueCategory;
  search?: string;
}): Promise<TissueSamplePublic[]> {
  const sb = supabaseForPublic();
  let query = sb
    .from("tissue_samples")
    .select("*")
    .eq("visibility", "public")
    .order("updated_at", { ascending: false });

  if (opts?.category) {
    query = query.eq("category", opts.category);
  }
  if (opts?.search?.trim()) {
    const q = `%${opts.search.trim()}%`;
    query = query.or(
      `common_name.ilike.${q},scientific_name.ilike.${q},sample_id.ilike.${q}`,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const samples = (data ?? []) as TissueSampleRow[];
  const mediaMap = await loadMediaForSamples(
    samples.map((s) => s.id),
    "public",
  );

  return samples.map((s) =>
    toSamplePublic(s, mediaMap.get(s.id) ?? [], true),
  );
}

export async function getPublicTissueSample(
  idOrSampleId: string,
): Promise<TissueSamplePublic | null> {
  const sb = supabaseForPublic();
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      idOrSampleId,
    );

  let query = sb.from("tissue_samples").select("*").eq("visibility", "public");
  query = isUuid
    ? query.eq("id", idOrSampleId)
    : query.eq("sample_id", idOrSampleId);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const sample = data as TissueSampleRow;
  const mediaMap = await loadMediaForSamples([sample.id], "public");
  return toSamplePublic(sample, mediaMap.get(sample.id) ?? [], true);
}

export async function listAllTissueSamples(opts?: {
  category?: TissueCategory;
  search?: string;
}): Promise<TissueSamplePublic[]> {
  const sb = supabaseForAdmin();
  let query = sb
    .from("tissue_samples")
    .select("*")
    .order("updated_at", { ascending: false });

  if (opts?.category) query = query.eq("category", opts.category);
  if (opts?.search?.trim()) {
    const q = `%${opts.search.trim()}%`;
    query = query.or(
      `common_name.ilike.${q},scientific_name.ilike.${q},sample_id.ilike.${q}`,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const samples = (data ?? []) as TissueSampleRow[];
  const mediaMap = await loadMediaForSamples(samples.map((s) => s.id));
  return samples.map((s) => toSamplePublic(s, mediaMap.get(s.id) ?? [], false));
}

export async function getTissueSampleAdmin(
  id: string,
): Promise<TissueSamplePublic | null> {
  const sb = supabaseForAdmin();
  const { data, error } = await sb
    .from("tissue_samples")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const sample = data as TissueSampleRow;
  const mediaMap = await loadMediaForSamples([sample.id]);
  return toSamplePublic(sample, mediaMap.get(sample.id) ?? [], false);
}

export interface CreateTissueSampleInput {
  sampleId: string;
  commonName: string;
  scientificName: string;
  category: TissueCategory;
  taxonomy?: TissueTaxonomy;
  mindexTaxonId?: string | null;
  massValue?: number | null;
  massUnit?: "g" | "mg" | null;
  storageLocation?: string | null;
  collectedAt?: string | null;
  description?: string | null;
  visibility?: TissueVisibility;
  createdBy?: string | null;
}

export async function createTissueSample(
  input: CreateTissueSampleInput,
): Promise<TissueSamplePublic> {
  const sb = supabaseForAdmin();
  const now = new Date().toISOString();
  const row = {
    sample_id: input.sampleId.trim(),
    common_name: input.commonName.trim(),
    scientific_name: input.scientificName.trim(),
    category: input.category,
    taxonomy: input.taxonomy ?? {},
    mindex_taxon_id: input.mindexTaxonId ?? null,
    mass_value: input.massValue ?? null,
    mass_unit: input.massUnit ?? null,
    storage_location: input.storageLocation ?? null,
    collected_at: input.collectedAt ?? null,
    description: input.description ?? null,
    visibility: input.visibility ?? "internal",
    created_by: input.createdBy ?? null,
    updated_at: now,
  };

  const { data, error } = await sb
    .from("tissue_samples")
    .insert(row)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return toSamplePublic(data as TissueSampleRow, [], false);
}

export interface UpdateTissueSampleInput {
  commonName?: string;
  scientificName?: string;
  category?: TissueCategory;
  taxonomy?: TissueTaxonomy;
  mindexTaxonId?: string | null;
  massValue?: number | null;
  massUnit?: "g" | "mg" | null;
  storageLocation?: string | null;
  collectedAt?: string | null;
  description?: string | null;
  visibility?: TissueVisibility;
  coverMediaId?: string | null;
}

export async function updateTissueSample(
  id: string,
  input: UpdateTissueSampleInput,
): Promise<TissueSamplePublic | null> {
  const sb = supabaseForAdmin();
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.commonName !== undefined) patch.common_name = input.commonName;
  if (input.scientificName !== undefined)
    patch.scientific_name = input.scientificName;
  if (input.category !== undefined) patch.category = input.category;
  if (input.taxonomy !== undefined) patch.taxonomy = input.taxonomy;
  if (input.mindexTaxonId !== undefined)
    patch.mindex_taxon_id = input.mindexTaxonId;
  if (input.massValue !== undefined) patch.mass_value = input.massValue;
  if (input.massUnit !== undefined) patch.mass_unit = input.massUnit;
  if (input.storageLocation !== undefined)
    patch.storage_location = input.storageLocation;
  if (input.collectedAt !== undefined) patch.collected_at = input.collectedAt;
  if (input.description !== undefined) patch.description = input.description;
  if (input.visibility !== undefined) patch.visibility = input.visibility;
  if (input.coverMediaId !== undefined)
    patch.cover_media_id = input.coverMediaId;

  const { data, error } = await sb
    .from("tissue_samples")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const sample = data as TissueSampleRow;
  const mediaMap = await loadMediaForSamples([sample.id]);
  return toSamplePublic(sample, mediaMap.get(sample.id) ?? [], false);
}

export interface AttachTissueMediaInput {
  nasPath: string;
  kind: TissueMediaKind;
  liveStreamUrl?: string | null;
  isCover?: boolean;
  sortOrder?: number;
  visibility?: TissueVisibility;
}

export async function attachTissueMedia(
  sampleUuid: string,
  input: AttachTissueMediaInput,
): Promise<TissueMediaPublic> {
  const sb = supabaseForAdmin();
  const row = {
    sample_id: sampleUuid,
    nas_path: input.nasPath.replace(/\\/g, "/").replace(/^\/+/, ""),
    kind: input.kind,
    live_stream_url: input.liveStreamUrl ?? null,
    is_cover: input.isCover ?? false,
    sort_order: input.sortOrder ?? 0,
    visibility: input.visibility ?? "internal",
  };

  const { data, error } = await sb
    .from("tissue_media")
    .insert(row)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const media = data as TissueMediaRow;
  if (media.is_cover) {
    await sb
      .from("tissue_samples")
      .update({
        cover_media_id: media.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sampleUuid);
    await sb
      .from("tissue_media")
      .update({ is_cover: false })
      .eq("sample_id", sampleUuid)
      .neq("id", media.id);
    await sb
      .from("tissue_media")
      .update({ is_cover: true })
      .eq("id", media.id);
  }

  return toMediaPublic(media);
}

export async function updateTissueMedia(
  mediaId: string,
  patch: Partial<{
    visibility: TissueVisibility;
    isCover: boolean;
    sortOrder: number;
    kind: TissueMediaKind;
    liveStreamUrl: string | null;
  }>,
): Promise<TissueMediaPublic | null> {
  const sb = supabaseForAdmin();
  const row: Record<string, unknown> = {};
  if (patch.visibility !== undefined) row.visibility = patch.visibility;
  if (patch.isCover !== undefined) row.is_cover = patch.isCover;
  if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder;
  if (patch.kind !== undefined) row.kind = patch.kind;
  if (patch.liveStreamUrl !== undefined)
    row.live_stream_url = patch.liveStreamUrl;

  const { data, error } = await sb
    .from("tissue_media")
    .update(row)
    .eq("id", mediaId)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const media = data as TissueMediaRow;
  if (patch.isCover) {
    await sb
      .from("tissue_samples")
      .update({
        cover_media_id: media.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", media.sample_id);
  }

  return toMediaPublic(media);
}

export async function deleteTissueMedia(mediaId: string): Promise<boolean> {
  const sb = supabaseForAdmin();
  const { error } = await sb.from("tissue_media").delete().eq("id", mediaId);
  if (error) throw new Error(error.message);
  return true;
}
