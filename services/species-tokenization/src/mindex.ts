/** Server-side MINDEX catalog adapter. Credentials never belong in a browser bundle. */
import { createHash } from 'node:crypto';
import bs58 from 'bs58';
import { z } from 'zod';
import type { Cluster, Species, TokenRecord } from './contracts.js';

const uuid = z.string().uuid().transform(value => value.toLowerCase());
const nonempty = z.string().trim().min(1).max(2_048);
const integer = z.number().int().nonnegative().safe();
const instant = z.string().datetime({ offset: true });
const atomic = z.string().regex(/^(0|[1-9][0-9]*)$/).refine(value => BigInt(value) <= 18_446_744_073_709_551_615n, 'Amount exceeds u64');
const address = z.string().refine(value => {
  try { return bs58.decode(value).length === 32; } catch { return false; }
}, 'Invalid Solana public key');
const signature = z.string().refine(value => {
  try { return bs58.decode(value).length === 64; } catch { return false; }
}, 'Invalid Solana transaction signature');
const sha256 = (value: unknown): string => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const record = z.record(z.unknown());
const taxonSchema = z.object({
  id: uuid, canonical_name: nonempty, common_name: z.string().nullable().optional(),
  kingdom: z.string().nullable(), rank: nonempty,
  external_ids: z.record(z.union([nonempty, z.number().int().nonnegative().safe()])).default({}),
  metadata: record.default({}), created_at: instant, updated_at: instant.nullable().optional(),
}).passthrough();
const pageSchema = z.object({
  data: z.array(taxonSchema),
  pagination: z.object({ limit: integer.positive(), offset: integer, total: integer }),
});

export class MindexImportError extends Error {
  constructor(readonly code: string, message: string) { super(message); this.name = 'MindexImportError'; }
}
export interface MindexOptions {
  /** Trusted operator configuration only; origin or exact /api/mindex root. */
  baseUrl: string;
  apiKey?: string;
  internalToken?: string;
  /** Existing configured grant. The adapter never creates a license entitlement. */
  licenseId: string;
  pageSize?: number;
  maxPages?: number;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
}
const checkpointSchema = z.object({
  version: z.literal(1), binding: z.string().regex(/^[a-f0-9]{64}$/),
  nextOffset: integer, total: integer.nullable(), imported: integer, excluded: integer,
  complete: z.boolean(), lastPageHash: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  seenTaxa: z.record(z.string()), seenNames: z.record(z.string()), seenExternalIds: z.record(z.string()),
}).strict();
export type MindexCheckpoint = z.infer<typeof checkpointSchema>;
export interface MindexExclusion { taxonId: string; reason: string; acceptedTaxonId?: string }
export interface MindexPage {
  species: Species[];
  excluded: MindexExclusion[];
  checkpoint: MindexCheckpoint;
  provenance: {
    endpoint: string; filters: { kingdom: 'Fungi'; rank: 'species' };
    fetchedAt: string; pageHash: string; previousPageHash: string | null;
    total: number; offset: number; received: number;
    consistency: 'offset_scan_without_snapshot';
  };
}

function rootUrl(input: string): URL {
  const url = new URL(input);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new MindexImportError('configuration', 'MINDEX base URL must be an HTTP(S) origin or /api/mindex root without embedded credentials');
  }
  const path = url.pathname.replace(/\/+$/, '');
  if (path !== '' && path !== '/api/mindex') {
    throw new MindexImportError('configuration', 'MINDEX base URL path must be /api/mindex');
  }
  url.pathname = '/api/mindex/';
  return url;
}

const taxonomyStatuses = ['taxonomic_status', 'taxonomicStatus', 'taxonomy_status', 'taxon_status', 'status'];
const aliasTargets = ['accepted_taxon_id', 'acceptedTaxonId', 'accepted_name_usage_id', 'acceptedNameUsageID', 'merged_into', 'merged_into_taxon_id', 'synonym_of', 'duplicate_of', 'canonical_taxon_id'];
function exclusionFor(row: z.infer<typeof taxonSchema>): MindexExclusion | null {
  if (row.kingdom !== 'Fungi' || row.rank !== 'species') return { taxonId: row.id, reason: 'outside_fungal_species_filter' };
  const metadata = row.metadata;
  for (const key of aliasTargets) {
    const target = row[key] ?? metadata[key];
    if (target !== undefined && target !== null && target !== '') {
      const parsed = uuid.safeParse(target);
      if (!parsed.success) return { taxonId: row.id, reason: 'unresolved_canonical_identity' };
      if (parsed.data !== row.id) return { taxonId: row.id, reason: 'alias_or_merged_taxon', acceptedTaxonId: parsed.data };
    }
  }
  for (const key of taxonomyStatuses) {
    const value = row[key] ?? metadata[key];
    if (value !== undefined && value !== null && value !== '') {
      const status = String(value).trim().toLowerCase();
      if (!['accepted', 'canonical', 'valid'].includes(status)) return { taxonId: row.id, reason: 'noncanonical_taxonomic_status' };
    }
  }
  for (const key of ['is_synonym', 'is_duplicate', 'is_merged']) {
    const value = row[key] ?? metadata[key];
    if (value !== undefined && value !== null && value !== false && value !== 'false') {
      return { taxonId: row.id, reason: 'noncanonical_taxon_flag' };
    }
  }
  if (Object.keys(row.external_ids).length === 0) return { taxonId: row.id, reason: 'missing_external_identity' };
  return null;
}

/** Every page is provisional until checkpoint.complete; persist it with the imported rows. */
export class MindexClient {
  private readonly root: URL;
  private readonly headers: Headers;
  private readonly pageSize: number;
  private readonly timeoutMs: number;
  private readonly maxPages: number;
  private readonly fetcher: typeof globalThis.fetch;
  private readonly binding: string;
  private readonly licenseId: string;
  constructor(options: MindexOptions) {
    if (typeof window !== 'undefined') throw new MindexImportError('server_only', 'MINDEX credentials are server-only');
    this.root = rootUrl(options.baseUrl);
    this.licenseId = nonempty.parse(options.licenseId);
    const apiKey = options.apiKey?.trim();
    const internalToken = options.internalToken?.trim();
    if (Boolean(apiKey) === Boolean(internalToken)) throw new MindexImportError('configuration', 'Configure exactly one MINDEX server credential');
    this.headers = new Headers({ Accept: 'application/json' });
    this.headers.set(apiKey ? 'X-API-Key' : 'X-Internal-Token', apiKey || internalToken!);
    this.pageSize = z.number().int().min(1).max(1_000).parse(options.pageSize ?? 500);
    this.timeoutMs = z.number().int().min(100).max(120_000).parse(options.timeoutMs ?? 30_000);
    this.maxPages = z.number().int().min(1).max(100_000).parse(options.maxPages ?? 10_000);
    this.fetcher = options.fetch ?? globalThis.fetch;
    this.binding = sha256({ root: this.root.href, licenseId: this.licenseId, pageSize: this.pageSize, maxPages: this.maxPages, kingdom: 'Fungi', rank: 'species', order: 'canonical_name:asc' });
  }

  async *pages(options: { checkpoint?: MindexCheckpoint; signal?: AbortSignal } = {}): AsyncGenerator<MindexPage> {
    let state: MindexCheckpoint = options.checkpoint ? checkpointSchema.parse(structuredClone(options.checkpoint)) : {
      version: 1, binding: this.binding, nextOffset: 0, total: null, imported: 0, excluded: 0,
      complete: false, lastPageHash: null, seenTaxa: {}, seenNames: {}, seenExternalIds: {},
    };
    if (state.binding !== this.binding) throw new MindexImportError('checkpoint_binding', 'Checkpoint belongs to different endpoint, filters, license, or page size');
    if (state.nextOffset !== state.imported + state.excluded || Object.keys(state.seenTaxa).length !== state.nextOffset ||
        Object.keys(state.seenNames).length !== state.imported || (state.total !== null && state.nextOffset > state.total)) {
      throw new MindexImportError('checkpoint_invalid', 'Checkpoint counters do not reconcile');
    }
    if (state.complete) {
      if (state.total !== state.nextOffset) throw new MindexImportError('checkpoint_invalid', 'Completed checkpoint does not reconcile to total');
      return;
    }
    while (true) {
      if (state.nextOffset >= this.pageSize * this.maxPages) throw new MindexImportError('scan_limit', 'Catalog scan reached configured maximum pages');
      const endpoint = new URL('taxa', this.root);
      endpoint.search = new URLSearchParams({ kingdom: 'Fungi', rank: 'species', order_by: 'canonical_name', order: 'asc', limit: String(this.pageSize), offset: String(state.nextOffset) }).toString();
      let response: Response;
      try {
        response = await this.fetcher(endpoint, {
          method: 'GET', headers: new Headers(this.headers), redirect: 'error', cache: 'no-store',
          signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(this.timeoutMs)]) : AbortSignal.timeout(this.timeoutMs),
        });
      } catch {
        throw new MindexImportError('upstream_unavailable', 'MINDEX taxonomy request failed; checkpoint has not advanced');
      }
      if (!response.ok) throw new MindexImportError('upstream_unavailable', `MINDEX taxonomy returned HTTP ${response.status}; checkpoint has not advanced`);
      let parsed: z.infer<typeof pageSchema>;
      try { parsed = pageSchema.parse(await response.json()); } catch {
        throw new MindexImportError('invalid_page', 'MINDEX taxonomy response does not match data/pagination contract');
      }
      const { data, pagination } = parsed;
      if (pagination.total > this.pageSize * this.maxPages) throw new MindexImportError('scan_limit', 'Catalog total exceeds configured maximum pages');
      if (pagination.offset !== state.nextOffset || pagination.limit !== this.pageSize || data.length > this.pageSize) {
        throw new MindexImportError('pagination_mismatch', 'MINDEX returned unexpected page boundaries');
      }
      if (state.total !== null && pagination.total !== state.total) throw new MindexImportError('catalog_changed', 'MINDEX catalog total changed; restart against a stable catalog');
      if (state.nextOffset + data.length > pagination.total || (data.length === 0 && state.nextOffset < pagination.total) ||
          (data.length < this.pageSize && state.nextOffset + data.length < pagination.total)) {
        throw new MindexImportError('incomplete_page', 'MINDEX page is incomplete for its declared total');
      }
      const species: Species[] = [];
      const excluded: MindexExclusion[] = [];
      const next = structuredClone(state);
      for (const row of data) {
        if (Object.hasOwn(next.seenTaxa, row.id)) throw new MindexImportError('duplicate_identity', 'Taxon UUID repeated during catalog scan');
        next.seenTaxa[row.id] = row.updated_at ?? row.created_at;
        const exclusion = exclusionFor(row);
        if (exclusion) { excluded.push(exclusion); continue; }
        const nameKey = sha256(row.canonical_name.trim().normalize('NFKC').replace(/\s+/g, ' ').toLocaleLowerCase('en-US'));
        if (Object.hasOwn(next.seenNames, nameKey)) throw new MindexImportError('ambiguous_name', 'Multiple accepted UUIDs use the same canonical species name');
        next.seenNames[nameKey] = row.id;
        const externalIds: Record<string, string> = {};
        for (const [source, value] of Object.entries(row.external_ids)) {
          if (!/^[a-z][a-z0-9_.-]{0,63}$/i.test(source) || !String(value).trim()) throw new MindexImportError('invalid_crosswalk', 'External ID source/value is invalid');
          if (Object.hasOwn(externalIds, source.toLowerCase()) && externalIds[source.toLowerCase()] !== String(value).trim()) {
            throw new MindexImportError('invalid_crosswalk', 'External ID source repeats with conflicting values');
          }
          const key = `${source.toLowerCase()}:${String(value).trim()}`;
          if (Object.hasOwn(next.seenExternalIds, key) && next.seenExternalIds[key] !== row.id) throw new MindexImportError('ambiguous_crosswalk', 'External source identity maps to more than one accepted taxon');
          next.seenExternalIds[key] = row.id;
          externalIds[source.toLowerCase()] = String(value).trim();
        }
        const mapped: Species = {
          taxonId: row.id, scientificName: row.canonical_name, ...(row.common_name ? { commonName: row.common_name } : {}),
          kingdom: 'Fungi', rank: 'species', sourceRevision: row.updated_at ?? row.created_at,
          sourceUrl: new URL(`taxa/${row.id}`, this.root).href, externalIds, licenseId: this.licenseId,
        };
        const metadataUri = row.metadata.metadata_uri ?? row.metadata.metadataUri;
        const metadataSha256 = row.metadata.metadata_sha256 ?? row.metadata.metadataSha256;
        if (typeof metadataUri === 'string' && typeof metadataSha256 === 'string' &&
            /^[a-fA-F0-9]{64}$/.test(metadataSha256) && safeAssetUri(metadataUri)) {
          mapped.metadataUri = metadataUri;
          mapped.metadataSha256 = metadataSha256.toLowerCase();
        }
        const photo = row.metadata.default_photo;
        if (photo && typeof photo === 'object' && !Array.isArray(photo)) {
          const p = photo as Record<string, unknown>;
          if (typeof p.url === 'string' && safeAssetUri(p.url) &&
              typeof p.license === 'string' && p.license.trim() && typeof p.attribution === 'string' && p.attribution.trim()) {
            mapped.image = { url: p.url, license: p.license, attribution: p.attribution };
          }
        }
        species.push(mapped);
      }
      const pageHash = sha256(parsed);
      next.total = pagination.total;
      next.nextOffset += data.length;
      next.imported += species.length;
      next.excluded += excluded.length;
      next.complete = next.nextOffset === pagination.total;
      next.lastPageHash = sha256({ previous: state.lastPageHash, pageHash, offset: pagination.offset });
      const provenance: MindexPage['provenance'] = {
        endpoint: endpoint.href, filters: { kingdom: 'Fungi', rank: 'species' }, fetchedAt: new Date().toISOString(),
        pageHash, previousPageHash: state.lastPageHash, total: pagination.total, offset: pagination.offset, received: data.length,
        consistency: 'offset_scan_without_snapshot',
      };
      state = next;
      yield { species, excluded, checkpoint: structuredClone(state), provenance };
      if (state.complete) return;
    }
  }
}

function safeAssetUri(value: string): boolean {
  try {
    const url = new URL(value);
    return ['https:', 'ipfs:', 'ar:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

const legacyEntrySchema = z.object({
  taxonId: uuid, mint: address, cluster: z.enum(['devnet', 'mainnet-beta', 'localnet']), route: z.literal('legacy_fungip'),
  launchSignature: signature, creatorWallet: address, status: z.literal('canonical'),
  provenance: nonempty, decimals: z.number().int().min(0).max(18), supply: atomic,
  program: z.enum(['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb']),
  mintAuthority: address.nullable(), freezeAuthority: address.nullable(), extensions: z.array(nonempty).max(64),
}).strict();
const legacyManifestSchema = z.object({
  schemaVersion: z.literal(1), provenance: nonempty, exportedAt: instant,
  entries: z.array(legacyEntrySchema).min(1).max(100_000),
}).strict();
export interface LegacyManifest { schemaVersion: 1; provenance: string; exportedAt: string; entries: TokenRecord[] }

/** Structural validation only. Engine must verify every mint and launch on its configured cluster. */
export function parseLegacyManifest(input: unknown, expectedCluster?: Cluster): LegacyManifest {
  const manifest = legacyManifestSchema.parse(input);
  const taxa = new Set<string>(); const mints = new Set<string>();
  for (const entry of manifest.entries) {
    if (expectedCluster && entry.cluster !== expectedCluster) throw new MindexImportError('cluster_mismatch', 'Legacy manifest cluster differs from configured chain');
    const taxon = `${entry.cluster}:${entry.taxonId}`; const mint = `${entry.cluster}:${entry.mint}`;
    if (taxa.has(taxon) || mints.has(mint)) throw new MindexImportError('duplicate_legacy_binding', 'Legacy manifest repeats a taxon or mint on the same cluster');
    taxa.add(taxon); mints.add(mint);
  }
  return manifest;
}
