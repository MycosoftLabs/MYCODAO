import { test } from 'node:test';
import assert from 'node:assert/strict';
import bs58 from 'bs58';
import { MindexClient, MindexImportError, parseLegacyManifest, type MindexCheckpoint } from '../src/mindex.js';

const ids = [1, 2, 3, 4, 5].map(n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`);
const taxon = (index: number, extra: Record<string, unknown> = {}) => ({
  id: ids[index], canonical_name: `Agaricus example${index}`, kingdom: 'Fungi', rank: 'species',
  external_ids: { gbif: String(100 + index) }, created_at: '2026-10-15T00:00:00Z',
  updated_at: '2026-10-15T00:01:00Z', metadata: {}, ...extra,
});
const reply = (data: unknown[], total = data.length, offset = 0, limit = 2) => Response.json({ data, pagination: { limit, offset, total } });
const collect = async (client: MindexClient, checkpoint?: MindexCheckpoint) => {
  const pages = [];
  for await (const page of client.pages({ checkpoint })) pages.push(page);
  return pages;
};
const client = (fetcher: typeof fetch, extra: Record<string, unknown> = {}) => new MindexClient({
  baseUrl: 'https://mindex.example/api/mindex', apiKey: 'fixture-server-key', licenseId: 'configured-grant',
  pageSize: 2, fetch: fetcher, ...extra,
});
const code = (expected: string) => (error: unknown) => error instanceof MindexImportError && error.code === expected;

test('fixed filtered /taxa pagination, credential headers, provenance and exact source identity', async () => {
  const calls: URL[] = [];
  const c = client(async (input, init) => {
    const url = new URL(String(input)); calls.push(url);
    assert.equal(init?.method, 'GET'); assert.equal(init?.redirect, 'error');
    assert.equal(new Headers(init?.headers).get('X-API-Key'), 'fixture-server-key');
    assert.equal(new Headers(init?.headers).has('X-Internal-Token'), false);
    assert.equal(url.pathname, '/api/mindex/taxa');
    assert.equal(url.searchParams.get('kingdom'), 'Fungi');
    assert.equal(url.searchParams.get('rank'), 'species');
    assert.equal(url.searchParams.get('order_by'), 'canonical_name');
    const offset = Number(url.searchParams.get('offset'));
    return offset === 0 ? reply([taxon(0), taxon(1)], 3) : reply([taxon(2)], 3, 2);
  });
  const pages = await collect(c);
  assert.equal(calls.length, 2); assert.equal(pages[0].checkpoint.complete, false); assert.equal(pages[1].checkpoint.complete, true);
  assert.equal(pages[1].checkpoint.nextOffset, 3); assert.equal(pages[1].checkpoint.imported, 3);
  assert.deepEqual(pages[0].species[0].externalIds, { gbif: '100' });
  assert.equal(pages[0].species[0].licenseId, 'configured-grant');
  assert.equal(pages[0].species[0].sourceUrl, `https://mindex.example/api/mindex/taxa/${ids[0]}`);
  assert.equal(pages[0].species[0].sourceRevision, '2026-10-15T00:01:00Z');
  assert.equal(pages[1].provenance.previousPageHash, pages[0].checkpoint.lastPageHash);
  assert.equal(pages[1].provenance.consistency, 'offset_scan_without_snapshot');
});

test('checkpoint resumes next page without duplicating prior pages and binds server config', async () => {
  const c = client(async input => Number(new URL(String(input)).searchParams.get('offset')) === 0
    ? reply([taxon(0), taxon(1)], 3) : reply([taxon(2)], 3, 2));
  const first = (await c.pages().next()).value!;
  const restored = JSON.parse(JSON.stringify(first.checkpoint));
  const pages = await collect(c, restored);
  assert.equal(pages.length, 1); assert.equal(pages[0].species[0].taxonId, ids[2]);
  assert.equal((await collect(c, pages[0].checkpoint)).length, 0);
  await assert.rejects(() => collect(client(async () => reply([]), { licenseId: 'different-grant' }), restored), code('checkpoint_binding'));
  await assert.rejects(() => collect(c, { ...restored, nextOffset: 1 }), code('checkpoint_invalid'));
});

test('failure never silently turns into an empty catalog; error bodies and credentials are not exposed', async () => {
  for (const [fetcher, expected] of [
    [async () => new Response('secret upstream body', { status: 503 }), 'upstream_unavailable'],
    [async () => { throw new Error('secret credential'); }, 'upstream_unavailable'],
    [async () => Response.json({ data: [], pagination: {} }), 'invalid_page'],
    [async () => new Response('not-json'), 'invalid_page'],
  ] as const) {
    await assert.rejects(() => collect(client(fetcher as typeof fetch)), (error: unknown) => {
      assert.equal(code(expected)(error), true); assert.doesNotMatch(String(error), /secret/); return true;
    });
  }
  assert.equal((await collect(client(async () => reply([], 0))))[0].checkpoint.complete, true);
});

test('invalid UUID or missing pagination total rejects entire source page', async () => {
  await assert.rejects(() => collect(client(async () => reply([taxon(0, { id: 'inat:123' })]))), code('invalid_page'));
  await assert.rejects(() => collect(client(async () => Response.json({ data: [], pagination: { limit: 2, offset: 0 } }))), code('invalid_page'));
});

test('rejects drifting totals, empty partial pages, cap overflow and mismatched offsets', async () => {
  const c = client(async input => Number(new URL(String(input)).searchParams.get('offset')) === 0
    ? reply([taxon(0), taxon(1)], 3) : reply([taxon(2)], 4, 2));
  await assert.rejects(() => collect(c), code('catalog_changed'));
  await assert.rejects(() => collect(client(async () => reply([], 4))), code('incomplete_page'));
  await assert.rejects(() => collect(client(async () => reply([taxon(0)], 4))), code('incomplete_page'));
  await assert.rejects(() => collect(client(async () => reply([taxon(0)], 1, 9))), code('pagination_mismatch'));
  await assert.rejects(() => collect(client(async () => reply([taxon(0), taxon(1)], 3), { maxPages: 1 })), code('scan_limit'));
});

test('filters, unresolved identity, synonyms and explicit taxon merges cannot create extra species', async () => {
  const pages = await collect(client(async () => reply([
    taxon(0, { kingdom: 'Plantae' }), taxon(1, { metadata: { accepted_taxon_id: ids[2], taxonomic_status: 'synonym' } }),
  ])));
  assert.equal(pages[0].species.length, 0);
  assert.deepEqual(pages[0].excluded, [
    { taxonId: ids[0], reason: 'outside_fungal_species_filter' },
    { taxonId: ids[1], reason: 'alias_or_merged_taxon', acceptedTaxonId: ids[2] },
  ]);
  const missing = await collect(client(async () => reply([taxon(0, { external_ids: {} }), taxon(1, { metadata: { is_duplicate: true } })])));
  assert.equal(missing[0].species.length, 0); assert.equal(missing[0].checkpoint.excluded, 2);
  const accepted = await collect(client(async () => reply([taxon(0, { metadata: { accepted_taxon_id: ids[0], taxonomic_status: 'accepted' } })])));
  assert.equal(accepted[0].species.length, 1);
});

test('duplicate UUID/name/crosswalk aborts scan, including across persisted checkpoint', async () => {
  await assert.rejects(() => collect(client(async () => reply([taxon(0), taxon(0)]))), code('duplicate_identity'));
  await assert.rejects(() => collect(client(async () => reply([taxon(0), taxon(1, { canonical_name: 'AGARICUS   EXAMPLE0' })]))), code('ambiguous_name'));
  const c = client(async input => Number(new URL(String(input)).searchParams.get('offset')) === 0
    ? reply([taxon(0), taxon(1)], 3) : reply([taxon(2, { external_ids: { GBIF: '100' } })], 3, 2));
  const first = (await c.pages().next()).value!;
  await assert.rejects(() => collect(c, JSON.parse(JSON.stringify(first.checkpoint))), code('ambiguous_crosswalk'));
});

test('copies only actual validated metadata digest and attributed image', async () => {
  const pages = await collect(client(async () => reply([taxon(0, { metadata: {
    metadata_uri: 'ipfs://bafy-fixture-metadata', metadata_sha256: 'a'.repeat(64),
    default_photo: { url: 'https://images.example/fungus.jpg', license: 'CC-BY-4.0', attribution: 'Fixture photographer' },
  } }), taxon(1, { metadata: { metadata_uri: 'javascript:alert(1)', metadata_sha256: 'a'.repeat(64), default_photo: { url: 'https://images.example/x.jpg' } } })])));
  assert.equal(pages[0].species[0].metadataUri, 'ipfs://bafy-fixture-metadata');
  assert.equal(pages[0].species[0].image?.attribution, 'Fixture photographer');
  assert.equal(pages[0].species[1].metadataUri, undefined); assert.equal(pages[0].species[1].image, undefined);
});

test('configuration rejects arbitrary paths, embedded credentials, missing license and credential ambiguity', () => {
  const noop = async () => reply([]);
  for (const bad of ['https://mindex.example/redirect', 'https://user:pass@mindex.example', 'https://mindex.example?token=x']) {
    assert.throws(() => client(noop, { baseUrl: bad }), code('configuration'));
  }
  assert.throws(() => client(noop, { apiKey: '' }), code('configuration'));
  assert.throws(() => client(noop, { internalToken: 'another-credential' }), code('configuration'));
  assert.throws(() => client(noop, { licenseId: '' }));
});

const pubkey = (n: number) => bs58.encode(new Uint8Array(32).fill(n));
const legacy = () => ({ schemaVersion: 1, provenance: 'urn:fixture:legacy-export', exportedAt: '2026-10-15T00:00:00Z', entries: [{
  taxonId: ids[0], mint: pubkey(2), cluster: 'devnet', route: 'legacy_fungip',
  launchSignature: bs58.encode(new Uint8Array(64).fill(3)), creatorWallet: pubkey(4), status: 'canonical',
  provenance: 'urn:fixture:launch-proof', decimals: 6, supply: '1000000000',
  program: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', mintAuthority: null, freezeAuthority: null, extensions: [],
}] });
test('strict legacy manifest maps real-format entries and rejects placeholders, duplicates and wrong cluster', () => {
  const valid = legacy(); assert.equal(parseLegacyManifest(valid, 'devnet').entries[0].mint, pubkey(2));
  const duplicate = legacy(); duplicate.entries.push({ ...duplicate.entries[0] });
  assert.throws(() => parseLegacyManifest(duplicate), code('duplicate_legacy_binding'));
  assert.throws(() => parseLegacyManifest(valid, 'mainnet-beta'), code('cluster_mismatch'));
  for (const change of [ { mint: 'placeholder' }, { launchSignature: 'solana:binding:123' }, { taxonId: 'GBIF:1' }, { supply: '-1' }, { decimals: 19 }, { unknown: true }, { route: 'pump_direct' } ]) {
    const invalid = legacy(); Object.assign(invalid.entries[0], change); assert.throws(() => parseLegacyManifest(invalid));
  }
  assert.throws(() => parseLegacyManifest({ schemaVersion: 1, provenance: 'empty', exportedAt: '2026-10-15T00:00:00Z', entries: [] }));
});
