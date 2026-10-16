/** Offline bridge from an actual MINDEX FungiP index export; never signs or queries a chain. */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { z } from 'zod';
import { parseLegacyManifest, type LegacyManifest } from '../src/mindex.js';
import { address, hash, reference, signature, units, uuid } from '../src/validation.js';
import type { TokenRecord } from '../src/contracts.js';

const ids = Array.from({ length: 40 }, (_, n) => `FG${String(n + 1).padStart(3, '0')}`);
const PROGRAMS = ['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'] as const;
const instant = z.string().datetime({ offset: true });
const associationSchema = z.object({
  species_id: z.string().regex(/^FG\d{3}$/), snapshot_sha256: hash, payload_sha256: hash,
  catalog_sha256: hash, launch_sha256: hash, handoff_sha256: hash, correction_sha256: hash,
  accepted_name: z.string().min(1), mint_address: address.nullable(), launch_tx: signature.nullable(),
  owner_entity: z.literal('MycoDAO'), launch_status: z.literal('verified'),
  canonical_approved: z.literal(true), source_hash_match: z.literal(true), candidate_launch: z.null(),
  verification_basis: z.literal('user_supplied_and_attached_verification'), new_chain_verified: z.literal(false),
  superseded_mints: z.array(address), synonyms: z.array(z.string()), catalog_review_flags: z.array(z.string()),
  gap_flags: z.array(z.string()), token_program: z.enum(PROGRAMS).nullable(),
  decimals: z.number().int().nonnegative().max(255).nullable(), supply_raw: z.string().regex(/^[0-9]+$/).nullable(),
  source_reported_as_of_utc: instant, correction_recorded_at_utc: instant,
}).passthrough();
const sourceSchema = z.object({
  collection: z.literal('FungiP 300'),
  pagination: z.object({ limit: z.number().int().min(1), offset: z.literal(0), total: z.number().int().min(40).max(500) }),
  launch_index: z.object({ state: z.literal('available'), new_chain_verified: z.literal(false) }).passthrough(),
  data: z.array(z.object({
    id: uuid.nullable(), canonical_name: z.string().nullable(), rank: z.literal('species'), kingdom: z.literal('Fungi'),
    fungip: z.object({
      species_id: z.string().regex(/^FG\d{3}$/), canonical_taxon_uuid: uuid.nullable(), mindex_uuid: uuid.nullable(),
      accepted_name: z.string(), identity_state: z.enum(['linked', 'unresolved', 'ambiguous']), resolution_status: z.string(),
      launch_association_state: z.enum(['source_verified', 'invalid_binding', 'not_associated', 'unavailable', 'not_included']),
      first40_launch: associationSchema.nullable(),
    }).passthrough(),
  }).passthrough()).max(500),
}).passthrough();
const factsSchema = z.object({
  schemaVersion: z.literal(1), cluster: z.literal('mainnet-beta'), observedAt: instant, evidenceUri: reference,
  entries: z.array(z.object({
    mint: address, creatorWallet: address, launchSignature: signature,
    decimals: z.number().int().min(0).max(18), program: z.enum(PROGRAMS), supply: units,
    mintAuthority: address.nullable(), freezeAuthority: address.nullable(), extensions: z.array(z.string().min(1)),
  }).strict()).max(40),
}).strict();
export interface PilotHold { speciesId: string; taxonId: string | null; mint: string | null; reason: string }
export interface PilotCreationHold { id: string; kind: 'taxon' | 'name'; value: string; reason: string; evidenceUri: string; active: true }
export interface PilotExport {
  manifest: LegacyManifest | null;
  report: {
    state: 'ready_for_chain_verification' | 'partial_requires_resolution';
    sourceIndexSha256: string; mintFactsSha256: string; sourceProvenance: string;
    sourceReportedOnly: true; newlyChainVerified: false; included: number; held: PilotHold[];
    creationHolds: PilotCreationHold[];
    supersededMints: string[]; sourceBindings: Record<string, string>;
  };
}
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** Facts are evidence inputs, not trusted chain confirmation; adoption rechecks RPC. */
export function buildFungipManifest(indexInput: unknown, factsInput: unknown, provenanceInput: string): PilotExport {
  const source = sourceSchema.parse(indexInput), facts = factsSchema.parse(factsInput), provenance = reference.refine(value => value.length <= 500, 'Use a stable evidence URI of at most 500 characters').parse(provenanceInput);
  if (source.pagination.total !== source.data.length || source.pagination.limit < source.data.length) throw new Error('Incomplete FungiP index export; capture all pages before export');
  const bySpecies = new Map<string, typeof source.data[number]>();
  for (const row of source.data) {
    if (bySpecies.has(row.fungip.species_id)) throw new Error('Duplicate permanent FungiP species ID');
    bySpecies.set(row.fungip.species_id, row);
  }
  if (ids.some(id => !bySpecies.has(id))) throw new Error('Missing FG001 through FG040 source rows');
  const byMint = new Map<string, typeof facts.entries[number]>();
  for (const fact of facts.entries) {
    if (byMint.has(fact.mint)) throw new Error('Duplicate observed mint facts'); byMint.set(fact.mint, fact);
  }
  const held: PilotHold[] = [], entries: TokenRecord[] = [], superseded = new Set<string>(), knownMints = new Set<string>();
  const knownTaxa = new Set<string>(), knownLaunches = new Set<string>();
  let sourceBindings: Record<string, string> | undefined;
  // Collect every excluded mint before examining any candidate, so a later row
  // cannot make a retired mint eligible on an earlier row.
  for (const speciesId of ids) {
    for (const mint of bySpecies.get(speciesId)!.fungip.first40_launch?.superseded_mints ?? []) {
      if (superseded.has(mint)) throw new Error('Repeated superseded mint requires explicit source curation');
      superseded.add(mint);
    }
  }
  for (const speciesId of ids) {
    const row = bySpecies.get(speciesId)!, member = row.fungip, launch = member.first40_launch;
    const hold = (reason: string) => held.push({ speciesId, taxonId: row.id, mint: launch?.mint_address ?? null, reason });
    if (!launch || member.launch_association_state !== 'source_verified') { hold('qualified_source_association_missing'); continue; }
    if (launch.species_id !== speciesId || launch.accepted_name !== member.accepted_name) throw new Error('Launch association parent identity mismatch');
    const bindings = Object.fromEntries(['snapshot_sha256', 'catalog_sha256', 'launch_sha256', 'handoff_sha256', 'correction_sha256'].map(key => [key, launch[key] as string]));
    if (sourceBindings && JSON.stringify(sourceBindings) !== JSON.stringify(bindings)) throw new Error('First40 source batch bindings differ');
    sourceBindings = bindings;
    if (launch.mint_address) {
      if (knownMints.has(launch.mint_address) || superseded.has(launch.mint_address)) throw new Error('Canonical source mint is duplicated or superseded');
      knownMints.add(launch.mint_address);
    }
    if (launch.launch_tx) {
      if (knownLaunches.has(launch.launch_tx)) throw new Error('Canonical source launch signature repeats'); knownLaunches.add(launch.launch_tx);
    }
    if (member.identity_state !== 'linked' || member.resolution_status !== 'resolved' || !row.id || row.id !== member.canonical_taxon_uuid || row.id !== member.mindex_uuid) {
      hold('canonical_mindex_uuid_unresolved'); continue;
    }
    if (knownTaxa.has(row.id)) throw new Error('Multiple FungiP concepts bind the same canonical UUID'); knownTaxa.add(row.id);
    if (row.canonical_name !== launch.accepted_name) { hold('canonical_name_disagreement'); continue; }
    // Do not recover FG026's missing historical fields from another species or mint.
    if (!launch.mint_address || !launch.launch_tx || !launch.token_program || launch.decimals === null || launch.supply_raw === null) {
      hold('source_launch_fields_incomplete_requires_curation'); continue;
    }
    const fact = byMint.get(launch.mint_address);
    if (!fact) { hold('observed_mint_facts_missing'); continue; }
    if (fact.launchSignature !== launch.launch_tx || fact.program !== launch.token_program || fact.decimals !== launch.decimals || fact.supply !== launch.supply_raw) {
      hold('observed_chain_fields_disagree_with_source'); continue;
    }
    entries.push({ taxonId: row.id, cluster: 'mainnet-beta', route: 'legacy_fungip', status: 'canonical',
      ...fact, provenance: `${provenance}#${speciesId};snapshot=${launch.snapshot_sha256};payload=${launch.payload_sha256};facts_sha256=${digest(factsInput)}` });
  }
  for (const mint of byMint.keys()) if (!knownMints.has(mint) || superseded.has(mint)) throw new Error('Observed mint facts are outside the canonical First40 mint set');
  const creationHolds: PilotCreationHold[] = [];
  const heldValues = new Set<string>();
  for (const unresolved of held) {
    const row = bySpecies.get(unresolved.speciesId)!;
    const add = (kind: PilotCreationHold['kind'], value: string) => {
      const key = `${kind}:${value.toLowerCase()}`; if (heldValues.has(key)) return; heldValues.add(key);
      const raw = digest(`fungip-hold:${key}`);
      const id = `${raw.slice(0, 8)}-${raw.slice(8, 12)}-5${raw.slice(13, 16)}-a${raw.slice(17, 20)}-${raw.slice(20, 32)}`;
      creationHolds.push({ id, kind, value, reason: `Legacy FungiP ${unresolved.speciesId}: ${unresolved.reason}`, evidenceUri: provenance, active: true });
    };
    if (unresolved.taxonId) add('taxon', unresolved.taxonId);
    add('name', row.fungip.accepted_name);
    for (const synonym of row.fungip.first40_launch?.synonyms ?? []) if (synonym.trim()) add('name', synonym);
  }
  const manifest = entries.length ? parseLegacyManifest({ schemaVersion: 1, provenance, exportedAt: facts.observedAt, entries }, 'mainnet-beta') : null;
  return { manifest, report: {
    state: held.length ? 'partial_requires_resolution' : 'ready_for_chain_verification',
    sourceIndexSha256: digest(indexInput), mintFactsSha256: digest(factsInput), sourceProvenance: provenance,
    sourceReportedOnly: true, newlyChainVerified: false, included: entries.length, held, creationHolds,
    supersededMints: [...superseded].sort(), sourceBindings: sourceBindings ?? {},
  } };
}

async function main() {
  const args = new Map(process.argv.slice(2).map(value => { const split = value.indexOf('='); return [value.slice(0, split), value.slice(split + 1)]; }));
  for (const arg of ['--index', '--mint-facts', '--output', '--provenance']) if (!args.get(arg)) throw new Error('Usage: tsx scripts/export-fungip.ts --index=actual-index.json --mint-facts=observed-mints.json --output=export.json --provenance=https://retained-evidence.example/export');
  const indexBytes = await readFile(resolve(args.get('--index')!));
  const factsBytes = await readFile(resolve(args.get('--mint-facts')!));
  if (indexBytes.length > 10_000_000 || factsBytes.length > 2_000_000) throw new Error('Export input file exceeds configured byte bound');
  const result = buildFungipManifest(JSON.parse(indexBytes.toString('utf8')), JSON.parse(factsBytes.toString('utf8')), args.get('--provenance')!);
  await writeFile(resolve(args.get('--output')!), `${JSON.stringify({ ...result, inputRawSha256: {
    index: createHash('sha256').update(indexBytes).digest('hex'), mintFacts: createHash('sha256').update(factsBytes).digest('hex'),
  } }, null, 2)}\n`, { flag: 'wx' });
  process.stdout.write(JSON.stringify({ included: result.report.included, held: result.report.held.length, state: result.report.state }) + '\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(`${error instanceof Error ? error.message : 'FungiP export failed'}\n`); process.exitCode = 1; });
}
