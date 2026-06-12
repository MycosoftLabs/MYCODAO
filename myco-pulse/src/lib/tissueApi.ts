import { pulseApiUrl } from "./apiOrigin";
import { getValidProducerAccessToken } from "./producerSession";

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
}

export interface TissueMediaItem {
  id: string;
  nasPath: string;
  kind: TissueMediaKind;
  liveStreamUrl: string | null;
  isCover: boolean;
  sortOrder: number;
  visibility: TissueVisibility;
  serveUrl: string;
}

export interface TissueSample {
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
  media: TissueMediaItem[];
}

export interface TissueNasAsset {
  id: string;
  relPath: string;
  fileName: string;
  kind: "video" | "graphic";
  serveUrl: string;
}

async function curatorHeaders(): Promise<HeadersInit> {
  const token = await getValidProducerAccessToken();
  if (!token) throw new Error("not_signed_in");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function fetchPublicTissueCatalog(opts?: {
  category?: TissueCategory | "all";
  search?: string;
}): Promise<TissueSample[]> {
  const params = new URLSearchParams();
  if (opts?.category && opts.category !== "all") {
    params.set("category", opts.category);
  }
  if (opts?.search?.trim()) params.set("search", opts.search.trim());
  const qs = params.toString();
  const res = await fetch(pulseApiUrl(`/api/tissue${qs ? `?${qs}` : ""}`), {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`tissue ${res.status}`);
  const data = (await res.json()) as { samples?: TissueSample[] };
  return data.samples ?? [];
}

export async function fetchCuratorTissueCatalog(opts?: {
  category?: TissueCategory | "all";
  search?: string;
}): Promise<TissueSample[]> {
  const params = new URLSearchParams();
  if (opts?.category && opts.category !== "all") {
    params.set("category", opts.category);
  }
  if (opts?.search?.trim()) params.set("search", opts.search.trim());
  const qs = params.toString();
  const res = await fetch(
    pulseApiUrl(`/api/tissue/admin${qs ? `?${qs}` : ""}`),
    { headers: await curatorHeaders(), cache: "no-store" },
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `admin tissue ${res.status}`);
  }
  const data = (await res.json()) as { samples?: TissueSample[] };
  return data.samples ?? [];
}

export async function createTissueSample(input: {
  sampleId: string;
  commonName: string;
  scientificName: string;
  category: TissueCategory;
  taxonomy?: TissueTaxonomy;
  massValue?: number | null;
  massUnit?: "g" | "mg" | null;
  storageLocation?: string | null;
  collectedAt?: string | null;
  description?: string | null;
  visibility?: TissueVisibility;
  enrichFromMindex?: boolean;
}): Promise<TissueSample> {
  const res = await fetch(pulseApiUrl("/api/tissue/admin"), {
    method: "POST",
    headers: await curatorHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `create ${res.status}`);
  }
  const data = (await res.json()) as { sample: TissueSample };
  return data.sample;
}

export async function updateTissueSample(
  id: string,
  patch: Record<string, unknown>,
): Promise<TissueSample> {
  const res = await fetch(pulseApiUrl(`/api/tissue/admin/${id}`), {
    method: "PATCH",
    headers: await curatorHeaders(),
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `update ${res.status}`);
  }
  const data = (await res.json()) as { sample: TissueSample };
  return data.sample;
}

export async function attachTissueMedia(
  sampleUuid: string,
  input: {
    nasPath: string;
    kind: TissueMediaKind;
    isCover?: boolean;
    sortOrder?: number;
    visibility?: TissueVisibility;
    liveStreamUrl?: string | null;
  },
): Promise<TissueMediaItem> {
  const res = await fetch(pulseApiUrl(`/api/tissue/admin/${sampleUuid}/media`), {
    method: "POST",
    headers: await curatorHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `attach media ${res.status}`);
  }
  const data = (await res.json()) as { media: TissueMediaItem };
  return data.media;
}

export async function patchTissueMedia(input: {
  mediaId: string;
  visibility?: TissueVisibility;
  isCover?: boolean;
  sortOrder?: number;
}): Promise<TissueMediaItem> {
  const res = await fetch(pulseApiUrl("/api/tissue/admin/media"), {
    method: "PATCH",
    headers: await curatorHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `patch media ${res.status}`);
  }
  const data = (await res.json()) as { media: TissueMediaItem };
  return data.media;
}

export async function deleteTissueMedia(mediaId: string): Promise<void> {
  const res = await fetch(pulseApiUrl("/api/tissue/admin/media"), {
    method: "DELETE",
    headers: await curatorHeaders(),
    body: JSON.stringify({ mediaId }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `delete media ${res.status}`);
  }
}

export async function fetchTissueNasAssets(
  sampleId?: string,
): Promise<TissueNasAsset[]> {
  const params = sampleId ? `?sampleId=${encodeURIComponent(sampleId)}` : "";
  const res = await fetch(
    pulseApiUrl(`/api/tissue/admin/media-browser${params}`),
    { headers: await curatorHeaders(), cache: "no-store" },
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `nas browser ${res.status}`);
  }
  const data = (await res.json()) as {
    assets?: Array<{
      id: string;
      relPath: string;
      fileName: string;
      kind: "video" | "graphic";
      serveUrl: string;
    }>;
  };
  return (data.assets ?? []).map((a) => ({
    id: a.id,
    relPath: a.relPath,
    fileName: a.fileName,
    kind: a.kind,
    serveUrl: a.serveUrl,
  }));
}

// ===========================================================================
// Biobank Digital Twin (3-tier: taxon -> strain -> accession)
// Raw Supabase rows are snake_case; keep them as-is.
// ===========================================================================

export type BiobankForm =
  | "jar"
  | "petri"
  | "slant"
  | "plate"
  | "liquid_culture"
  | "grain_spawn"
  | "agar_block"
  | "fruiting_block"
  | "pod_hydroponic"
  | "pod_aquaponic"
  | "pod_fungal"
  | "specimen"
  | "spore_print"
  | "syringe"
  | "other";

export type BiobankStatus =
  | "active"
  | "stored"
  | "incubating"
  | "colonizing"
  | "fruiting"
  | "contaminated"
  | "consumed"
  | "recycled"
  | "discarded"
  | "reserved"
  | "archived";

export type BiobankHealth =
  | "healthy"
  | "watch"
  | "contaminated"
  | "dead"
  | "unknown";

export type LabelLayout = "jar" | "dish" | "roll";

export interface BiobankAccession {
  id: string;
  accession_code: string;
  strain_id: string | null;
  taxon_id: string | null;
  form: string;
  container: string | null;
  agar_medium: string | null;
  substrate: string | null;
  status: string;
  health: string;
  viable: boolean;
  quantity: number;
  passage_number: number;
  location_note: string | null;
  date_in: string | null;
  date_out: string | null;
  last_touched_at: string | null;
  replate_due_at: string | null;
  replate_interval_days: number | null;
  qr_url: string | null;
  visibility: TissueVisibility;
  description: string | null;
  notes: string | null;
  cover_media_id: string | null;
  coverServeUrl?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BiobankStrain {
  id: string;
  taxon_id: string | null;
  strain_code: string;
  strain_label: string;
  variant_key: string;
  parent_strain_id: string | null;
  origin: string | null;
  origin_location: string | null;
  genetics: Record<string, unknown>;
  chemistry: Record<string, unknown>;
  phenotype: Record<string, unknown>;
  preferred_medium: string | null;
  notes: string | null;
  visibility: TissueVisibility;
}

export interface BiobankTaxon {
  id: string;
  taxon_code: string;
  scientific_name: string;
  common_name: string;
  category: string;
  kingdom: string;
  taxonomy: Record<string, unknown>;
  mindex_taxon_id: string | null;
  visibility: TissueVisibility;
}

export interface BiobankMedia {
  id: string;
  accession_id: string | null;
  nas_path: string;
  kind: TissueMediaKind;
  live_stream_url: string | null;
  stream_protocol: string | null;
  caption: string | null;
  is_cover: boolean;
  sort_order: number;
  visibility: TissueVisibility;
  serveUrl: string | null;
}

export interface BiobankEvent {
  id: string;
  event_type: string;
  summary: string;
  detail: Record<string, unknown>;
  performed_by: string | null;
  occurred_at: string;
}

export interface BiobankTransfer {
  id: string;
  source_accession_id: string | null;
  target_accession_id: string | null;
  transfer_type: string;
  medium: string | null;
  performed_by: string | null;
  performed_at: string;
  due_at: string | null;
  eta_days: number | null;
  success: boolean | null;
  notes: string | null;
}

export interface BiobankContamination {
  id: string;
  contaminant: string;
  severity: string;
  detected_at: string;
  detected_by: string | null;
  resolution: string | null;
  resolved_at: string | null;
  notes: string | null;
}

export interface AccessionDetail {
  accession: BiobankAccession;
  strain: BiobankStrain | null;
  events: BiobankEvent[];
  transfers: BiobankTransfer[];
  contaminations: BiobankContamination[];
  media: BiobankMedia[];
}

export interface ProvisionResult {
  taxon: BiobankTaxon;
  strain: BiobankStrain;
  accessions: BiobankAccession[];
  labelSheetUrl: string;
}

export interface ProvisionInput {
  scientificName: string;
  commonName?: string;
  category?: string;
  kingdom?: string;
  variantKey?: string;
  strainLabel?: string;
  origin?: string;
  form?: BiobankForm | string;
  container?: string;
  agarMedium?: string;
  substrate?: string;
  replateIntervalDays?: number;
  visibility?: TissueVisibility;
  quantity?: number;
  enrichFromMindex?: boolean;
  description?: string;
}

/** Origin for public /t/<code> scan links (works in Vite dev and prod). */
export function scanPageUrl(code: string): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/t/${encodeURIComponent(code.toUpperCase())}`;
}

export function biobankLabelSheetUrl(
  codes: string[],
  layout: LabelLayout = "jar",
): string {
  return pulseApiUrl(
    `/api/tissue/admin/labels?codes=${encodeURIComponent(
      codes.join(","),
    )}&layout=${layout}`,
  );
}

export async function provisionBiobankAccessions(
  input: ProvisionInput,
): Promise<ProvisionResult> {
  const res = await fetch(pulseApiUrl("/api/tissue/admin/accessions"), {
    method: "POST",
    headers: await curatorHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as {
      error?: string;
      detail?: string;
    };
    throw new Error(b.detail ?? b.error ?? `provision ${res.status}`);
  }
  return (await res.json()) as ProvisionResult;
}

export async function fetchBiobankAccessions(opts?: {
  status?: string;
  search?: string;
}): Promise<BiobankAccession[]> {
  const p = new URLSearchParams();
  if (opts?.status) p.set("status", opts.status);
  if (opts?.search?.trim()) p.set("search", opts.search.trim());
  const qs = p.toString();
  const res = await fetch(
    pulseApiUrl(`/api/tissue/accessions${qs ? `?${qs}` : ""}`),
    { cache: "no-store" },
  );
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(b.error ?? `accessions ${res.status}`);
  }
  const data = (await res.json()) as { accessions?: BiobankAccession[] };
  return data.accessions ?? [];
}

export async function fetchAccessionDetail(
  code: string,
): Promise<AccessionDetail> {
  const res = await fetch(
    pulseApiUrl(`/api/tissue/accessions/${encodeURIComponent(code)}`),
    { cache: "no-store" },
  );
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(b.error ?? `accession ${res.status}`);
  }
  return (await res.json()) as AccessionDetail;
}

/** True when the signed-in user may edit tissue catalog (curator allowlist). */
export async function verifyTissueCurator(): Promise<boolean> {
  const res = await fetch(pulseApiUrl("/api/tissue/admin/verify"), {
    method: "POST",
    headers: await curatorHeaders(),
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { ok?: boolean };
  return data.ok === true;
}

export async function patchAccession(
  code: string,
  patch: Record<string, unknown>,
): Promise<BiobankAccession> {
  const res = await fetch(
    pulseApiUrl(`/api/tissue/admin/accessions/${encodeURIComponent(code)}`),
    {
      method: "PATCH",
      headers: await curatorHeaders(),
      body: JSON.stringify(patch),
    },
  );
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
    throw new Error(b.detail ?? b.error ?? `patch ${res.status}`);
  }
  const data = (await res.json()) as { accession: BiobankAccession };
  return data.accession;
}

export async function attachAccessionMedia(
  code: string,
  input: {
    nasPath?: string;
    kind: TissueMediaKind;
    caption?: string | null;
    liveStreamUrl?: string | null;
    streamProtocol?: string | null;
    isCover?: boolean;
    sortOrder?: number;
    visibility?: TissueVisibility;
  },
): Promise<BiobankMedia> {
  const res = await fetch(
    pulseApiUrl(
      `/api/tissue/admin/accessions/${encodeURIComponent(code)}/media`,
    ),
    {
      method: "POST",
      headers: await curatorHeaders(),
      body: JSON.stringify(input),
    },
  );
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
    throw new Error(b.detail ?? b.error ?? `attach ${res.status}`);
  }
  const data = (await res.json()) as { media: BiobankMedia };
  return data.media;
}

export async function setAccessionCover(
  code: string,
  mediaId: string,
): Promise<void> {
  const res = await fetch(
    pulseApiUrl(
      `/api/tissue/admin/accessions/${encodeURIComponent(code)}/media`,
    ),
    {
      method: "PATCH",
      headers: await curatorHeaders(),
      body: JSON.stringify({ mediaId }),
    },
  );
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(b.error ?? `cover ${res.status}`);
  }
}

export async function deleteAccessionMedia(
  code: string,
  mediaId: string,
): Promise<void> {
  const res = await fetch(
    pulseApiUrl(
      `/api/tissue/admin/accessions/${encodeURIComponent(code)}/media`,
    ),
    {
      method: "DELETE",
      headers: await curatorHeaders(),
      body: JSON.stringify({ mediaId }),
    },
  );
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(b.error ?? `delete ${res.status}`);
  }
}

export async function logAccessionEvent(input: {
  accessionCode: string;
  eventType: string;
  summary?: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  const res = await fetch(pulseApiUrl("/api/tissue/admin/events"), {
    method: "POST",
    headers: await curatorHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(b.error ?? `event ${res.status}`);
  }
}

export async function recordTransfer(input: {
  sourceCode: string;
  transferType: string;
  medium?: string;
  etaDays?: number;
  success?: boolean;
  notes?: string;
}): Promise<BiobankTransfer> {
  const res = await fetch(pulseApiUrl("/api/tissue/admin/transfers"), {
    method: "POST",
    headers: await curatorHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
    throw new Error(b.detail ?? b.error ?? `transfer ${res.status}`);
  }
  const data = (await res.json()) as { transfer: BiobankTransfer };
  return data.transfer;
}

export async function recordContamination(input: {
  accessionCode: string;
  contaminant: string;
  severity?: string;
  resolution?: string;
  notes?: string;
}): Promise<BiobankContamination> {
  const res = await fetch(pulseApiUrl("/api/tissue/admin/contaminations"), {
    method: "POST",
    headers: await curatorHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
    throw new Error(b.detail ?? b.error ?? `contamination ${res.status}`);
  }
  const data = (await res.json()) as { contamination: BiobankContamination };
  return data.contamination;
}

export async function fetchReplatesDue(
  withinDays = 7,
): Promise<BiobankAccession[]> {
  const res = await fetch(
    pulseApiUrl(`/api/tissue/replates?withinDays=${withinDays}`),
    { cache: "no-store" },
  );
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(b.error ?? `replates ${res.status}`);
  }
  const data = (await res.json()) as { accessions?: BiobankAccession[] };
  return data.accessions ?? [];
}

export interface PublicBiobankItem {
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

/** Public biobank catalog (real species/units). No auth required. */
export async function fetchPublicBiobankCatalog(): Promise<PublicBiobankItem[]> {
  const res = await fetch(pulseApiUrl("/api/tissue/biobank"), {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`biobank ${res.status}`);
  const data = (await res.json()) as { items?: PublicBiobankItem[] };
  return data.items ?? [];
}

/** Browse a NAS folder (e.g. an accession code) for media to attach. */
export async function fetchTissueNasFolder(
  folder: string,
): Promise<TissueNasAsset[]> {
  const res = await fetch(
    pulseApiUrl(
      `/api/tissue/admin/media-browser?folder=${encodeURIComponent(folder)}`,
    ),
    { headers: await curatorHeaders(), cache: "no-store" },
  );
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(b.error ?? `nas browser ${res.status}`);
  }
  const data = (await res.json()) as { assets?: TissueNasAsset[] };
  return data.assets ?? [];
}
