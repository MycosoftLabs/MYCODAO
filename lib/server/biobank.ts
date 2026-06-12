/**
 * Biobank Digital Twin — data layer over Supabase (system of record).
 *
 * Tiers: tissue_taxa → tissue_strains → tissue_accessions (QR target).
 * Plus events (touch log), transfers (clone/replate/slant ETA), contaminations,
 * interactions, experiments. Media binaries live on NAS; we store paths.
 *
 * Public reads expose all non-hidden tissue (service role); writes require curator auth.
 */
import { buildServeUrl } from "@/lib/server/blocks-nas-media";
import { fetchInatImage } from "@/lib/adapters/inaturalist-image";
import { notifyBiobankEvent } from "@/lib/server/biobank-notify";
import {
  getSupabaseAnon,
  getSupabaseServiceRole,
} from "@/lib/supabase/server";
import {
  buildAccessionCode,
  buildScanUrl,
  buildStrainCode,
  computeCheckChar,
  parseAccessionCode,
  taxonCodeFromScientificName,
} from "@/lib/server/biobank-id";

export type Visibility = "public" | "internal" | "hidden";

// ---------------------------------------------------------------------------
// Row shapes (subset of columns used by the app)
// ---------------------------------------------------------------------------
export interface TaxonRow {
  id: string;
  taxon_code: string;
  scientific_name: string;
  common_name: string;
  rank: string;
  category: string;
  kingdom: string;
  taxonomy: Record<string, unknown>;
  mindex_taxon_id: string | null;
  gbif_id: string | null;
  ncbi_taxid: string | null;
  description: string | null;
  reference_image_url: string | null;
  reference_image_thumb_url: string | null;
  reference_image_attribution: string | null;
  reference_image_source: string | null;
  visibility: Visibility;
}

export interface StrainRow {
  id: string;
  taxon_id: string | null;
  strain_code: string;
  strain_label: string;
  variant_key: string;
  parent_strain_id: string | null;
  origin: string | null;
  origin_location: string | null;
  collected_at: string | null;
  genetics: Record<string, unknown>;
  chemistry: Record<string, unknown>;
  phenotype: Record<string, unknown>;
  preferred_medium: string | null;
  notes: string | null;
  visibility: Visibility;
}

export interface AccessionRow {
  id: string;
  accession_code: string;
  strain_id: string | null;
  taxon_id: string | null;
  legacy_sample_id: string | null;
  form: string;
  container: string | null;
  agar_medium: string | null;
  substrate: string | null;
  passage_number: number;
  parent_accession_id: string | null;
  location_id: string | null;
  location_note: string | null;
  status: string;
  health: string;
  viable: boolean;
  mass_value: number | null;
  mass_unit: string | null;
  quantity: number;
  date_in: string | null;
  date_out: string | null;
  last_touched_at: string | null;
  replate_due_at: string | null;
  replate_interval_days: number | null;
  qr_printed_at: string | null;
  qr_url: string | null;
  description: string | null;
  notes: string | null;
  visibility: Visibility;
  cover_media_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface MediaRow {
  id: string;
  accession_id: string | null;
  strain_id: string | null;
  taxon_id: string | null;
  nas_path: string;
  kind: "image" | "video" | "stream";
  live_stream_url: string | null;
  stream_protocol: string | null;
  caption: string | null;
  captured_at: string | null;
  is_cover: boolean;
  sort_order: number;
  visibility: Visibility;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Public scan view (safe subset shown to anyone who scans a QR)
// ---------------------------------------------------------------------------
export interface ScanMedia {
  id: string;
  kind: "image" | "video" | "stream";
  serveUrl: string | null;
  liveStreamUrl: string | null;
  streamProtocol: string | null;
  caption: string | null;
  isCover: boolean;
}

export interface ScanView {
  accessionCode: string;
  checkChar: string;
  scanUrl: string;
  form: string;
  status: string;
  health: string;
  strain: {
    code: string;
    label: string;
    variantKey: string;
  } | null;
  taxon: {
    code: string;
    scientificName: string;
    commonName: string;
    category: string;
    kingdom: string;
    taxonomy: Record<string, unknown>;
    mindexTaxonId: string | null;
  } | null;
  description: string | null;
  dateIn: string | null;
  coverServeUrl: string | null;
  media: ScanMedia[];
}

export interface ScanResult {
  found: boolean;
  restricted: boolean; // exists but not public
  accession: ScanView | null;
}

function anon() {
  const c = getSupabaseServiceRole() ?? getSupabaseAnon();
  if (!c) throw new Error("supabase_unconfigured");
  return c;
}
function admin() {
  const c = getSupabaseServiceRole();
  if (!c) throw new Error("supabase_unconfigured");
  return c;
}

function toScanMedia(rows: MediaRow[]): ScanMedia[] {
  return [...rows]
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
    .map((m) => ({
      id: m.id,
      kind: m.kind,
      serveUrl: m.kind === "stream" ? null : buildServeUrl(m.nas_path),
      liveStreamUrl: m.live_stream_url,
      streamProtocol: m.stream_protocol,
      caption: m.caption,
      isCover: m.is_cover,
    }));
}

// ---------------------------------------------------------------------------
// Public scan resolve — what a phone camera lands on
// ---------------------------------------------------------------------------
export async function resolveAccessionForScan(
  codeOrUrl: string,
): Promise<ScanResult> {
  const raw = (codeOrUrl || "").trim();
  const code = (raw.split("/").pop() || raw).toUpperCase();
  const sb = admin();

  const { data: acc, error } = await sb
    .from("tissue_accessions")
    .select("*")
    .eq("accession_code", code)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (!acc) {
    return { found: false, restricted: false, accession: null };
  }
  const row = acc as AccessionRow;
  if (row.visibility === "hidden") {
    return { found: true, restricted: true, accession: null };
  }

  let strain: StrainRow | null = null;
  if (row.strain_id) {
    const { data } = await sb
      .from("tissue_strains")
      .select("*")
      .eq("id", row.strain_id)
      .maybeSingle();
    strain = (data as StrainRow) ?? null;
  }

  let taxon: TaxonRow | null = null;
  const taxonId = row.taxon_id ?? strain?.taxon_id ?? null;
  if (taxonId) {
    const { data } = await sb
      .from("tissue_taxa")
      .select("*")
      .eq("id", taxonId)
      .maybeSingle();
    taxon = (data as TaxonRow) ?? null;
  }

  const { data: mediaRows } = await sb
    .from("tissue_media")
    .select("*")
    .eq("accession_id", row.id)
    .neq("visibility", "hidden");

  const media = toScanMedia((mediaRows as MediaRow[]) ?? []);
  const cover =
    media.find((m) => m.isCover) ?? media.find((m) => m.serveUrl) ?? null;

  const view: ScanView = {
    accessionCode: row.accession_code,
    checkChar: computeCheckChar(row.accession_code),
    scanUrl: buildScanUrl(row.accession_code),
    form: row.form,
    status: row.status,
    health: row.health,
    strain: strain
      ? {
          code: strain.strain_code,
          label: strain.strain_label,
          variantKey: strain.variant_key,
        }
      : null,
    taxon: taxon
      ? {
          code: taxon.taxon_code,
          scientificName: taxon.scientific_name,
          commonName: taxon.common_name,
          category: taxon.category,
          kingdom: taxon.kingdom,
          taxonomy: taxon.taxonomy ?? {},
          mindexTaxonId: taxon.mindex_taxon_id,
        }
      : null,
    description: row.description,
    dateIn: row.date_in,
    coverServeUrl: cover?.serveUrl ?? null,
    media,
  };

  return { found: true, restricted: false, accession: view };
}

// ---------------------------------------------------------------------------
// Admin: full accession record (all children)
// ---------------------------------------------------------------------------
export async function getAccessionFull(code: string) {
  const sb = anon();
  const c = code.trim().toUpperCase();
  const { data: acc, error } = await sb
    .from("tissue_accessions")
    .select("*")
    .eq("accession_code", c)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!acc) return null;
  const a = acc as AccessionRow;

  const [strain, events, transfers, contaminations, media] = await Promise.all([
    a.strain_id
      ? sb.from("tissue_strains").select("*").eq("id", a.strain_id).maybeSingle()
      : Promise.resolve({ data: null }),
    sb.from("tissue_events").select("*").eq("accession_id", a.id).order("occurred_at", { ascending: false }).limit(100),
    sb.from("tissue_transfers").select("*").or(`source_accession_id.eq.${a.id},target_accession_id.eq.${a.id}`).order("performed_at", { ascending: false }),
    sb.from("tissue_contaminations").select("*").eq("accession_id", a.id).order("detected_at", { ascending: false }),
    sb.from("tissue_media").select("*").eq("accession_id", a.id).order("sort_order", { ascending: true }),
  ]);

  return {
    accession: a,
    strain: (strain.data as StrainRow) ?? null,
    events: (events.data as unknown[]) ?? [],
    transfers: (transfers.data as unknown[]) ?? [],
    contaminations: (contaminations.data as unknown[]) ?? [],
    media: ((media.data as MediaRow[]) ?? []).map((m) => ({
      ...m,
      serveUrl: m.kind === "stream" ? null : buildServeUrl(m.nas_path),
    })),
  };
}

/** Public detail — all non-hidden accessions; media excludes hidden rows. */
export async function getAccessionFullPublic(code: string) {
  const full = await getAccessionFull(code);
  if (!full) return null;
  if (full.accession.visibility === "hidden") return null;
  return {
    ...full,
    media: full.media.filter((m) => m.visibility !== "hidden"),
  };
}

// ---------------------------------------------------------------------------
// Creation (taxon → strain → accession) with auto codes/sequencing
// ---------------------------------------------------------------------------
export async function ensureTaxon(input: {
  scientificName: string;
  commonName?: string;
  category?: string;
  kingdom?: string;
  taxonomy?: Record<string, unknown>;
  mindexTaxonId?: string | null;
  visibility?: Visibility;
  createdBy?: string | null;
}): Promise<TaxonRow> {
  const sb = admin();
  const code = taxonCodeFromScientificName(input.scientificName);

  // Reuse if a taxon with this scientific name already exists.
  const { data: existing } = await sb
    .from("tissue_taxa")
    .select("*")
    .eq("scientific_name", input.scientificName.trim())
    .maybeSingle();
  if (existing) return existing as TaxonRow;

  // Ensure unique taxon_code (append numeric suffix on collision).
  let taxonCode = code;
  for (let i = 2; i < 50; i++) {
    const { data: clash } = await sb
      .from("tissue_taxa")
      .select("id")
      .eq("taxon_code", taxonCode)
      .maybeSingle();
    if (!clash) break;
    taxonCode = `${code}${i}`;
  }

  // Auto-fetch a live HD species photo for the public Catalog (best-effort).
  const img = await fetchInatImage(input.scientificName);

  const { data, error } = await sb
    .from("tissue_taxa")
    .insert({
      taxon_code: taxonCode,
      scientific_name: input.scientificName.trim(),
      common_name: input.commonName?.trim() ?? "",
      category: input.category ?? "mushroom",
      kingdom: input.kingdom ?? "Fungi",
      taxonomy: input.taxonomy ?? {},
      mindex_taxon_id: input.mindexTaxonId ?? null,
      reference_image_url: img?.url ?? null,
      reference_image_thumb_url: img?.thumbUrl ?? null,
      reference_image_attribution: img?.attribution ?? null,
      reference_image_source: img?.source ?? null,
      visibility: input.visibility ?? "public",
      created_by: input.createdBy ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const taxon = data as TaxonRow;
  void notifyBiobankEvent({
    event: "species_added",
    taxonCode: taxon.taxon_code,
    scientificName: taxon.scientific_name,
    commonName: taxon.common_name,
    performedBy: input.createdBy ?? null,
  });
  return taxon;
}

export async function createStrain(input: {
  taxonId: string;
  taxonCode: string;
  variantKey: string;
  strainLabel?: string;
  origin?: string | null;
  visibility?: Visibility;
  createdBy?: string | null;
}): Promise<StrainRow> {
  const sb = admin();
  const strainCode = buildStrainCode(input.taxonCode, input.variantKey);
  const { data, error } = await sb
    .from("tissue_strains")
    .insert({
      taxon_id: input.taxonId,
      strain_code: strainCode,
      strain_label: input.strainLabel?.trim() ?? "",
      variant_key: input.variantKey.toUpperCase(),
      origin: input.origin ?? null,
      visibility: input.visibility ?? "public",
      created_by: input.createdBy ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as StrainRow;
}

/** Next free accession sequence for a strain (1-based). */
export async function nextAccessionSequence(strainCode: string): Promise<number> {
  const sb = admin();
  const { data, error } = await sb
    .from("tissue_accessions")
    .select("accession_code")
    .ilike("accession_code", `${strainCode}-%`);
  if (error) throw new Error(error.message);
  let max = 0;
  for (const r of (data as { accession_code: string }[]) ?? []) {
    const parsed = parseAccessionCode(r.accession_code);
    if (parsed && parsed.sequence > max) max = parsed.sequence;
  }
  return max + 1;
}

export async function createAccession(input: {
  strainId: string;
  strainCode: string;
  taxonId?: string | null;
  form?: string;
  container?: string | null;
  agarMedium?: string | null;
  substrate?: string | null;
  locationId?: string | null;
  status?: string;
  replateIntervalDays?: number | null;
  visibility?: Visibility;
  description?: string | null;
  createdBy?: string | null;
}): Promise<AccessionRow> {
  const sb = admin();
  const seq = await nextAccessionSequence(input.strainCode);
  const accessionCode = buildAccessionCode(input.strainCode, seq);
  const now = new Date();
  const replateDue =
    input.replateIntervalDays && input.replateIntervalDays > 0
      ? new Date(now.getTime() + input.replateIntervalDays * 86_400_000).toISOString()
      : null;

  const { data, error } = await sb
    .from("tissue_accessions")
    .insert({
      accession_code: accessionCode,
      strain_id: input.strainId,
      taxon_id: input.taxonId ?? null,
      form: input.form ?? "jar",
      container: input.container ?? null,
      agar_medium: input.agarMedium ?? null,
      substrate: input.substrate ?? null,
      location_id: input.locationId ?? null,
      status: input.status ?? "active",
      replate_interval_days: input.replateIntervalDays ?? null,
      replate_due_at: replateDue,
      qr_url: buildScanUrl(accessionCode),
      visibility: input.visibility ?? "public",
      description: input.description ?? null,
      created_by: input.createdBy ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await logEvent({
    accessionId: (data as AccessionRow).id,
    eventType: "created",
    summary: `Accession ${accessionCode} created`,
    performedBy: input.createdBy ?? null,
  });
  const created = data as AccessionRow;
  void notifyBiobankEvent({
    event: "accession_created",
    accessionCode: created.accession_code,
    status: created.status,
    health: created.health,
    performedBy: input.createdBy ?? null,
  });
  return created;
}

// ---------------------------------------------------------------------------
// Activity: events, transfers, contaminations, interactions
// ---------------------------------------------------------------------------
export async function logEvent(input: {
  accessionId?: string | null;
  strainId?: string | null;
  eventType: string;
  summary: string;
  detail?: Record<string, unknown>;
  performedBy?: string | null;
  occurredAt?: string;
}) {
  const sb = admin();
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const { error } = await sb.from("tissue_events").insert({
    accession_id: input.accessionId ?? null,
    strain_id: input.strainId ?? null,
    event_type: input.eventType,
    summary: input.summary,
    detail: input.detail ?? {},
    performed_by: input.performedBy ?? null,
    occurred_at: occurredAt,
  });
  if (error) throw new Error(error.message);
  if (input.accessionId) {
    await sb
      .from("tissue_accessions")
      .update({ last_touched_at: occurredAt, updated_at: new Date().toISOString() })
      .eq("id", input.accessionId);
  }
}

/** Record a clone/replate/passage; optionally roll the source's next-due ETA. */
export async function recordTransfer(input: {
  sourceAccessionId: string;
  targetAccessionId?: string | null;
  transferType: string;
  medium?: string | null;
  performedBy?: string | null;
  etaDays?: number | null;
  success?: boolean | null;
  notes?: string | null;
}) {
  const sb = admin();
  const now = new Date();
  const dueAt =
    input.etaDays && input.etaDays > 0
      ? new Date(now.getTime() + input.etaDays * 86_400_000).toISOString()
      : null;

  const { data, error } = await sb
    .from("tissue_transfers")
    .insert({
      source_accession_id: input.sourceAccessionId,
      target_accession_id: input.targetAccessionId ?? null,
      transfer_type: input.transferType,
      medium: input.medium ?? null,
      performed_by: input.performedBy ?? null,
      performed_at: now.toISOString(),
      due_at: dueAt,
      eta_days: input.etaDays ?? null,
      success: input.success ?? null,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  if (dueAt) {
    await sb
      .from("tissue_accessions")
      .update({ replate_due_at: dueAt, updated_at: now.toISOString() })
      .eq("id", input.sourceAccessionId);
  }
  await logEvent({
    accessionId: input.sourceAccessionId,
    eventType: input.transferType === "clone" ? "cloned" : "replated",
    summary: `${input.transferType} (${input.medium ?? "medium n/a"})`,
    performedBy: input.performedBy ?? null,
  });
  return data;
}

export async function recordContamination(input: {
  accessionId: string;
  contaminant: string;
  severity?: string;
  detectedBy?: string | null;
  resolution?: string | null;
  notes?: string | null;
}) {
  const sb = admin();
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from("tissue_contaminations")
    .insert({
      accession_id: input.accessionId,
      contaminant: input.contaminant,
      severity: input.severity ?? "minor",
      detected_at: now,
      detected_by: input.detectedBy ?? null,
      resolution: input.resolution ?? null,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await sb
    .from("tissue_accessions")
    .update({ health: "contaminated", status: "contaminated", updated_at: now })
    .eq("id", input.accessionId);
  await logEvent({
    accessionId: input.accessionId,
    eventType: "contaminated",
    summary: `Contamination: ${input.contaminant} (${input.severity ?? "minor"})`,
    performedBy: input.detectedBy ?? null,
  });
  return data;
}

export async function recordInteraction(input: {
  accessionAId?: string | null;
  accessionBId?: string | null;
  strainAId?: string | null;
  strainBId?: string | null;
  interactionType: string;
  medium?: string | null;
  outcome?: string | null;
  metrics?: Record<string, unknown>;
  observedBy?: string | null;
  notes?: string | null;
}) {
  const sb = admin();
  const { data, error } = await sb
    .from("tissue_interactions")
    .insert({
      accession_a_id: input.accessionAId ?? null,
      accession_b_id: input.accessionBId ?? null,
      strain_a_id: input.strainAId ?? null,
      strain_b_id: input.strainBId ?? null,
      interaction_type: input.interactionType,
      medium: input.medium ?? null,
      outcome: input.outcome ?? null,
      metrics: input.metrics ?? {},
      observed_by: input.observedBy ?? null,
      observed_at: new Date().toISOString(),
      notes: input.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ---------------------------------------------------------------------------
// Lists / ops dashboards
// ---------------------------------------------------------------------------
export type AccessionWithCover = AccessionRow & { coverServeUrl: string | null };

export async function listAccessionsAdmin(opts?: {
  status?: string;
  search?: string;
  limit?: number;
}): Promise<AccessionWithCover[]> {
  const sb = admin();
  let q = sb
    .from("tissue_accessions")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(opts?.limit ?? 500);
  if (opts?.status) q = q.eq("status", opts.status);
  if (opts?.search?.trim()) {
    const s = `%${opts.search.trim()}%`;
    q = q.or(`accession_code.ilike.${s},description.ilike.${s}`);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (data as AccessionRow[]) ?? [];
  return attachCovers(rows);
}

/** Public inventory list — everything except hidden accessions. */
export async function listAccessionsPublic(opts?: {
  status?: string;
  search?: string;
  limit?: number;
}): Promise<AccessionWithCover[]> {
  const sb = admin();
  let q = sb
    .from("tissue_accessions")
    .select("*")
    .neq("visibility", "hidden")
    .order("updated_at", { ascending: false })
    .limit(opts?.limit ?? 500);
  if (opts?.status) q = q.eq("status", opts.status);
  if (opts?.search?.trim()) {
    const s = `%${opts.search.trim()}%`;
    q = q.or(`accession_code.ilike.${s},description.ilike.${s}`);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (data as AccessionRow[]) ?? [];
  return attachCovers(rows);
}

/** Resolve cover serve URLs for a batch of accessions in one query. */
async function attachCovers(rows: AccessionRow[]): Promise<AccessionWithCover[]> {
  const sb = admin();
  const coverIds = rows.map((r) => r.cover_media_id).filter(Boolean) as string[];
  const accIds = rows.map((r) => r.id);
  const coverByMediaId = new Map<string, string>();
  const firstImageByAcc = new Map<string, string>();

  if (coverIds.length) {
    const { data } = await sb
      .from("tissue_media")
      .select("id, nas_path, kind")
      .in("id", coverIds);
    for (const m of (data as { id: string; nas_path: string; kind: string }[]) ?? []) {
      if (m.kind !== "stream") coverByMediaId.set(m.id, buildServeUrl(m.nas_path));
    }
  }
  if (accIds.length) {
    const { data } = await sb
      .from("tissue_media")
      .select("accession_id, nas_path, kind, is_cover, sort_order")
      .in("accession_id", accIds)
      .neq("kind", "stream")
      .order("is_cover", { ascending: false })
      .order("sort_order", { ascending: true });
    for (const m of (data as {
      accession_id: string;
      nas_path: string;
    }[]) ?? []) {
      if (!firstImageByAcc.has(m.accession_id)) {
        firstImageByAcc.set(m.accession_id, buildServeUrl(m.nas_path));
      }
    }
  }

  return rows.map((r) => ({
    ...r,
    coverServeUrl:
      (r.cover_media_id ? coverByMediaId.get(r.cover_media_id) : null) ??
      firstImageByAcc.get(r.id) ??
      null,
  }));
}

// ---------------------------------------------------------------------------
// Public biobank catalog — real species/units anyone can see (no auth).
// Includes public + internal visibility; only `hidden` is excluded.
// ---------------------------------------------------------------------------
export interface PublicCatalogItem {
  accessionCode: string;
  commonName: string;
  scientificName: string;
  category: string;
  kingdom: string;
  form: string;
  status: string;
  health: string;
  strainCode: string | null;
  coverServeUrl: string | null;
  gallery: string[];
  mediaCount: number;
  speciesImageUrl: string | null;
  speciesThumbUrl: string | null;
  speciesImageAttribution: string | null;
}

export async function getPublicBiobankCatalog(): Promise<PublicCatalogItem[]> {
  const sb = admin();
  const { data: accs, error } = await sb
    .from("tissue_accessions")
    .select("*")
    .neq("visibility", "hidden")
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  const rows = (accs as AccessionRow[]) ?? [];
  if (!rows.length) return [];

  const taxonIds = [...new Set(rows.map((r) => r.taxon_id).filter(Boolean))] as string[];
  const strainIds = [...new Set(rows.map((r) => r.strain_id).filter(Boolean))] as string[];
  const accIds = rows.map((r) => r.id);

  const taxaById = new Map<string, TaxonRow>();
  if (taxonIds.length) {
    const { data } = await sb.from("tissue_taxa").select("*").in("id", taxonIds);
    for (const t of (data as TaxonRow[]) ?? []) taxaById.set(t.id, t);
  }
  const strainCodeById = new Map<string, string>();
  if (strainIds.length) {
    const { data } = await sb
      .from("tissue_strains")
      .select("id, strain_code")
      .in("id", strainIds);
    for (const s of (data as { id: string; strain_code: string }[]) ?? []) {
      strainCodeById.set(s.id, s.strain_code);
    }
  }

  // public media per accession (ordered)
  const galleryByAcc = new Map<string, string[]>();
  if (accIds.length) {
    const { data } = await sb
      .from("tissue_media")
      .select("accession_id, nas_path, kind, is_cover, sort_order")
      .in("accession_id", accIds)
      .neq("visibility", "hidden")
      .neq("kind", "stream")
      .order("is_cover", { ascending: false })
      .order("sort_order", { ascending: true });
    for (const m of (data as { accession_id: string; nas_path: string }[]) ?? []) {
      const arr = galleryByAcc.get(m.accession_id) ?? [];
      arr.push(buildServeUrl(m.nas_path));
      galleryByAcc.set(m.accession_id, arr);
    }
  }

  const withCovers = await attachCovers(rows);
  return withCovers.map((a) => {
    const t = a.taxon_id ? taxaById.get(a.taxon_id) : null;
    const gallery = galleryByAcc.get(a.id) ?? [];
    return {
      accessionCode: a.accession_code,
      commonName: t?.common_name ?? "",
      scientificName: t?.scientific_name ?? "",
      category: t?.category ?? "other",
      kingdom: t?.kingdom ?? "",
      form: a.form,
      status: a.status,
      health: a.health,
      strainCode: a.strain_id ? strainCodeById.get(a.strain_id) ?? null : null,
      coverServeUrl: a.coverServeUrl,
      gallery,
      mediaCount: gallery.length,
      speciesImageUrl: t?.reference_image_url ?? null,
      speciesThumbUrl: t?.reference_image_thumb_url ?? null,
      speciesImageAttribution: t?.reference_image_attribution ?? null,
    };
  });
}

/** Units due (or overdue) for replating/slant recycling. */
export async function listReplatesDue(withinDays = 7) {
  const sb = admin();
  const cutoff = new Date(Date.now() + withinDays * 86_400_000).toISOString();
  const { data, error } = await sb
    .from("tissue_accessions")
    .select("*")
    .not("replate_due_at", "is", null)
    .lte("replate_due_at", cutoff)
    .neq("status", "discarded")
    .neq("visibility", "hidden")
    .order("replate_due_at", { ascending: true });
  if (error) throw new Error(error.message);
  return attachCovers((data as AccessionRow[]) ?? []);
}

// ---------------------------------------------------------------------------
// Accession lookups + mutation
// ---------------------------------------------------------------------------
export async function getAccessionByCode(code: string): Promise<AccessionRow | null> {
  const sb = admin();
  const { data, error } = await sb
    .from("tissue_accessions")
    .select("*")
    .eq("accession_code", code.trim().toUpperCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as AccessionRow) ?? null;
}

const ACCESSION_PATCH_FIELDS = new Set([
  "status",
  "health",
  "viable",
  "container",
  "agar_medium",
  "substrate",
  "location_id",
  "location_note",
  "mass_value",
  "mass_unit",
  "quantity",
  "passage_number",
  "description",
  "notes",
  "visibility",
  "replate_interval_days",
  "replate_due_at",
  "date_out",
  "qr_printed_at",
]);

/** Patch a whitelisted subset of accession fields by code. */
export async function patchAccession(
  code: string,
  patch: Record<string, unknown>,
  performedBy?: string | null,
): Promise<AccessionRow> {
  const sb = admin();
  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (ACCESSION_PATCH_FIELDS.has(k)) update[k] = v;
  }
  if (Object.keys(update).length === 0) {
    const cur = await getAccessionByCode(code);
    if (!cur) throw new Error("accession_not_found");
    return cur;
  }
  update.updated_at = new Date().toISOString();
  update.last_touched_at = update.last_touched_at ?? new Date().toISOString();
  const { data, error } = await sb
    .from("tissue_accessions")
    .update(update)
    .eq("accession_code", code.trim().toUpperCase())
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const row = data as AccessionRow;
  await logEvent({
    accessionId: row.id,
    eventType: "status_change",
    summary: `Updated ${Object.keys(update).filter((k) => k !== "updated_at" && k !== "last_touched_at").join(", ")}`,
    detail: update,
    performedBy: performedBy ?? null,
  });
  void notifyBiobankEvent({
    event: "accession_updated",
    accessionCode: row.accession_code,
    status: row.status,
    health: row.health,
    detail: update,
    performedBy: performedBy ?? null,
  });
  return row;
}

// ---------------------------------------------------------------------------
// Accession media (NAS images / video / live stream)
// ---------------------------------------------------------------------------
export async function attachAccessionMedia(input: {
  accessionCode: string;
  nasPath?: string | null;
  kind: "image" | "video" | "stream";
  caption?: string | null;
  liveStreamUrl?: string | null;
  streamProtocol?: string | null;
  isCover?: boolean;
  sortOrder?: number;
  visibility?: Visibility;
  performedBy?: string | null;
}) {
  const sb = admin();
  const code = input.accessionCode.trim().toUpperCase();
  const { data: acc, error: accErr } = await sb
    .from("tissue_accessions")
    .select("id, strain_id, taxon_id")
    .eq("accession_code", code)
    .maybeSingle();
  if (accErr) throw new Error(accErr.message);
  if (!acc) throw new Error("accession_not_found");
  const a = acc as { id: string; strain_id: string | null; taxon_id: string | null };

  const nasPath =
    input.kind === "stream"
      ? input.nasPath?.replace(/\\/g, "/").replace(/^\/+/, "") ?? ""
      : (input.nasPath ?? "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (input.kind !== "stream" && !nasPath) throw new Error("missing_nas_path");
  if (input.kind === "stream" && !input.liveStreamUrl) {
    throw new Error("missing_stream_url");
  }

  const { data, error } = await sb
    .from("tissue_media")
    .insert({
      accession_id: a.id,
      strain_id: a.strain_id,
      taxon_id: a.taxon_id,
      nas_path: nasPath,
      kind: input.kind,
      live_stream_url: input.liveStreamUrl ?? null,
      stream_protocol: input.streamProtocol ?? null,
      caption: input.caption ?? null,
      is_cover: input.isCover ?? false,
      sort_order: input.sortOrder ?? 0,
      visibility: input.visibility ?? "public",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const media = data as MediaRow;

  if (input.isCover) {
    await sb
      .from("tissue_accessions")
      .update({ cover_media_id: media.id, updated_at: new Date().toISOString() })
      .eq("id", a.id);
  }
  await logEvent({
    accessionId: a.id,
    eventType: input.kind === "video" ? "filmed" : input.kind === "image" ? "photographed" : "note",
    summary:
      input.kind === "stream"
        ? `Live stream linked (${input.streamProtocol ?? "stream"})`
        : `Attached ${input.kind}: ${media.nas_path}`,
    performedBy: input.performedBy ?? null,
  });

  return {
    ...media,
    serveUrl: media.kind === "stream" ? null : buildServeUrl(media.nas_path),
  };
}

export async function setAccessionCover(accessionCode: string, mediaId: string) {
  const sb = admin();
  const acc = await getAccessionByCode(accessionCode);
  if (!acc) throw new Error("accession_not_found");
  await sb.from("tissue_media").update({ is_cover: false }).eq("accession_id", acc.id);
  await sb.from("tissue_media").update({ is_cover: true }).eq("id", mediaId);
  await sb
    .from("tissue_accessions")
    .update({ cover_media_id: mediaId, updated_at: new Date().toISOString() })
    .eq("id", acc.id);
}

export async function deleteAccessionMedia(mediaId: string) {
  const sb = admin();
  const { error } = await sb.from("tissue_media").delete().eq("id", mediaId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Strains
// ---------------------------------------------------------------------------
export async function getStrainByCode(code: string): Promise<StrainRow | null> {
  const sb = anon();
  const { data, error } = await sb
    .from("tissue_strains")
    .select("*")
    .eq("strain_code", code.trim().toUpperCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as StrainRow) ?? null;
}

const STRAIN_PATCH_FIELDS = new Set([
  "strain_label",
  "origin",
  "origin_location",
  "genetics",
  "chemistry",
  "phenotype",
  "preferred_medium",
  "notes",
  "visibility",
]);

export async function patchStrain(
  code: string,
  patch: Record<string, unknown>,
): Promise<StrainRow> {
  const sb = admin();
  const update: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (STRAIN_PATCH_FIELDS.has(k)) update[k] = v;
  }
  update.updated_at = new Date().toISOString();
  const { data, error } = await sb
    .from("tissue_strains")
    .update(update)
    .eq("strain_code", code.trim().toUpperCase())
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as StrainRow;
}

// ---------------------------------------------------------------------------
// Locations / Scientists / Experiments (reference data)
// ---------------------------------------------------------------------------
export async function listLocations() {
  const sb = anon();
  const { data, error } = await sb
    .from("tissue_locations")
    .select("*")
    .order("location_code", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createLocation(input: {
  locationCode: string;
  name?: string;
  kind?: string;
  parentLocationId?: string | null;
  temperatureC?: number | null;
  humidityPct?: number | null;
  notes?: string | null;
}) {
  const sb = admin();
  const { data, error } = await sb
    .from("tissue_locations")
    .insert({
      location_code: input.locationCode.trim().toUpperCase(),
      name: input.name ?? "",
      kind: input.kind ?? "shelf",
      parent_location_id: input.parentLocationId ?? null,
      temperature_c: input.temperatureC ?? null,
      humidity_pct: input.humidityPct ?? null,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listScientists() {
  const sb = anon();
  const { data, error } = await sb
    .from("tissue_scientists")
    .select("*")
    .order("full_name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createScientist(input: {
  email: string;
  fullName?: string;
  role?: string;
  orcid?: string | null;
}) {
  const sb = admin();
  const { data, error } = await sb
    .from("tissue_scientists")
    .insert({
      email: input.email.trim().toLowerCase(),
      full_name: input.fullName ?? "",
      role: input.role ?? "viewer",
      orcid: input.orcid ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listExperiments() {
  const sb = anon();
  const { data, error } = await sb
    .from("tissue_experiments")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createExperiment(input: {
  experimentCode: string;
  title?: string;
  hypothesis?: string | null;
  protocol?: string | null;
  status?: string;
  leadScientist?: string | null;
  visibility?: Visibility;
  createdBy?: string | null;
}) {
  const sb = admin();
  const { data, error } = await sb
    .from("tissue_experiments")
    .insert({
      experiment_code: input.experimentCode.trim().toUpperCase(),
      title: input.title ?? "",
      hypothesis: input.hypothesis ?? null,
      protocol: input.protocol ?? null,
      status: input.status ?? "planned",
      lead_scientist: input.leadScientist ?? null,
      visibility: input.visibility ?? "public",
      created_by: input.createdBy ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** One-shot: set internal → public on taxa, strains, accessions, media (never un-hides hidden). */
export async function publishInternalTissueCatalog(): Promise<{
  taxa: number;
  strains: number;
  accessions: number;
  media: number;
}> {
  const sb = admin();
  const counts = { taxa: 0, strains: 0, accessions: 0, media: 0 };
  const { data: taxa, error: e1 } = await sb
    .from("tissue_taxa")
    .update({ visibility: "public" })
    .eq("visibility", "internal")
    .select("id");
  if (e1) throw new Error(e1.message);
  counts.taxa = taxa?.length ?? 0;

  const { data: strains, error: e2 } = await sb
    .from("tissue_strains")
    .update({ visibility: "public" })
    .eq("visibility", "internal")
    .select("id");
  if (e2) throw new Error(e2.message);
  counts.strains = strains?.length ?? 0;

  const { data: accessions, error: e3 } = await sb
    .from("tissue_accessions")
    .update({ visibility: "public" })
    .eq("visibility", "internal")
    .select("id");
  if (e3) throw new Error(e3.message);
  counts.accessions = accessions?.length ?? 0;

  const { data: media, error: e4 } = await sb
    .from("tissue_media")
    .update({ visibility: "public" })
    .eq("visibility", "internal")
    .select("id");
  if (e4) throw new Error(e4.message);
  counts.media = media?.length ?? 0;

  return counts;
}
