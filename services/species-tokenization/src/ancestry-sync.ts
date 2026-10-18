/**
 * Import known fungal species from the public Ancestry/FungiP BFF into the engine DB.
 * Taxon UUIDs match the Blocks /species-tokens library so observations can submit.
 */
import { randomUUID } from 'node:crypto';
import type { Species } from './contracts.js';
import { Engine } from './engine.js';
import { publishMetadata } from './metadata.js';
import { requireThat } from './validation.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AncestrySyncOptions {
  baseUrl: string;
  licenseId: string;
  /** Max pages to pull (each page ≈ limit rows). Default 5 for local bootstrap. */
  maxPages?: number;
  pageSize?: number;
  metadataPublicBase?: string;
  fetch?: typeof globalThis.fetch;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function httpsUrl(value: unknown): string | null {
  const url = text(value);
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function mapRow(row: Record<string, unknown>, licenseId: string, revision: string): Species | null {
  const taxonId = (text(row.uuid) || text(row.id) || '').toLowerCase();
  const scientificName = text(row.scientific_name);
  if (!taxonId || !UUID.test(taxonId) || !scientificName || scientificName.length < 3) return null;
  const rank = (text(row.rank) || 'species').toLowerCase();
  if (rank !== 'species') return null;
  const kingdom = text(row.kingdom) || 'Fungi';
  if (kingdom !== 'Fungi') return null;
  const imageUrl = httpsUrl(row.image_url);
  const commonName = text(row.common_name) || undefined;
  const fungip = row.fungip && typeof row.fungip === 'object' ? (row.fungip as Record<string, unknown>) : null;
  const externalIds: Record<string, string> = {};
  const gbif = text(row.gbif_id) || text(row.gbifId);
  if (gbif) externalIds.gbif = gbif;
  const collectionId = text(fungip?.species_id);
  if (collectionId) externalIds.fungip = collectionId;
  return {
    taxonId,
    scientificName,
    commonName,
    kingdom: 'Fungi',
    rank: 'species',
    sourceRevision: revision,
    sourceUrl: `https://mycosoft.com/ancestry?taxon=${encodeURIComponent(taxonId)}`,
    externalIds,
    licenseId,
    image: imageUrl
      ? {
          url: imageUrl,
          license: text(row.photo_license) || 'MINDEX',
          attribution: text(row.photo_attribution) || 'MINDEX reference image',
        }
      : undefined,
  };
}

/** Pull known FungiP/Ancestry species into the engine; returns honest import counts. */
export async function syncAncestryFungip(engine: Engine, options: AncestrySyncOptions, actor = 'ancestry-sync') {
  const base = options.baseUrl.replace(/\/$/, '');
  const pageSize = Math.min(48, Math.max(1, options.pageSize ?? 24));
  const maxPages = Math.min(200, Math.max(1, options.maxPages ?? 5));
  const fetchFn = options.fetch ?? globalThis.fetch;
  const revision = `ancestry-fungip:${new Date().toISOString().slice(0, 10)}`;
  const imported: Species[] = [];
  let totalReported: number | null = null;
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= maxPages) {
    const params = new URLSearchParams({
      kingdom: 'Fungi',
      collection: 'fungip',
      limit: String(pageSize),
      page: String(page),
      sort: 'alphabetical',
      rank: 'species',
    });
    const upstream = await fetchFn(`${base}/api/ancestry?${params}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'MycoDAO-SpeciesTokenization/1.0' },
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    });
    requireThat(upstream.ok, `ancestry_http_${upstream.status}`);
    const payload = (await upstream.json()) as {
      species?: unknown[];
      total?: number;
      has_more?: boolean;
    };
    if (typeof payload.total === 'number' && payload.total >= 0) totalReported = payload.total;
    const rows = Array.isArray(payload.species) ? payload.species : [];
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const species = mapRow(row as Record<string, unknown>, options.licenseId, revision);
      if (species) imported.push(species);
    }
    hasMore = Boolean(payload.has_more) && rows.length > 0;
    page += 1;
  }

  // Deduplicate by taxonId (last write wins).
  const byId = new Map<string, Species>();
  for (const s of imported) byId.set(s.taxonId, s);
  const batch = [...byId.values()];
  if (batch.length) engine.importSpecies(batch, actor);

  let metadataPublished = 0;
  if (options.metadataPublicBase) {
    for (const s of batch) {
      if (!s.image) continue;
      try {
        publishMetadata(engine, s.taxonId, options.metadataPublicBase, actor);
        metadataPublished += 1;
      } catch {
        // Image rights or base URL may block; keep species row without mint readiness.
      }
    }
  }

  engine.store.audit('ancestry_fungip_synced', actor, {
    imported: batch.length,
    pages: page - 1,
    totalReported,
    metadataPublished,
    completeCatalog: false,
    note: totalReported != null && batch.length < totalReported
      ? `Partial sync: ${batch.length} of ~${totalReported} known fungi. Re-run with higher maxPages to continue.`
      : undefined,
  });

  return {
    scanId: randomUUID(),
    state: 'partial' as const,
    imported: batch.length,
    pages: page - 1,
    totalReported,
    metadataPublished,
  };
}
