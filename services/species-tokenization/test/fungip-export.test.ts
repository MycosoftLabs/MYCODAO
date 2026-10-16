import { test } from 'node:test';
import assert from 'node:assert/strict';
import bs58 from 'bs58';
import { buildFungipManifest } from '../scripts/export-fungip.js';
import { parseLegacyManifest } from '../src/mindex.js';

const pk = (n: number) => bs58.encode(new Uint8Array(32).fill(n));
const tx = (n: number) => bs58.encode(new Uint8Array(64).fill(n));
const TOKEN_2022 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
function inputs() {
  const rows = Array.from({ length: 40 }, (_, i) => {
    const n = i + 1, sid = `FG${String(n).padStart(3, '0')}`, id = `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
    const name = n === 33 ? 'Ganoderma lucidum' : n === 34 ? 'Ganoderma sichuanense' : `Fixture fungus ${n}`;
    return { id, canonical_name: name, kingdom: 'Fungi', rank: 'species', fungip: {
      species_id: sid, canonical_taxon_uuid: id, mindex_uuid: id, accepted_name: name,
      identity_state: 'linked', resolution_status: 'resolved', launch_association_state: 'source_verified',
      first40_launch: {
        species_id: sid, snapshot_sha256: 'a'.repeat(64), payload_sha256: n.toString(16).padStart(64, '0'), catalog_sha256: 'b'.repeat(64), launch_sha256: 'c'.repeat(64), handoff_sha256: 'd'.repeat(64), correction_sha256: 'e'.repeat(64),
        accepted_name: name, mint_address: pk(n), launch_tx: n === 26 ? null : tx(n), owner_entity: 'MycoDAO', launch_status: 'verified',
        canonical_approved: true, source_hash_match: true, candidate_launch: null,
        verification_basis: 'user_supplied_and_attached_verification', new_chain_verified: false,
        superseded_mints: n === 26 ? [pk(80)] : [], synonyms: n === 34 ? ['Ganoderma lingzhi'] : [], catalog_review_flags: ['source_reported_not_new_chain_verification'], gap_flags: n === 26 ? ['blank_launch_tx', 'blank_token_program'] : [],
        token_program: n === 26 ? null : TOKEN_2022, decimals: 6, supply_raw: '1000000000000000',
        source_reported_as_of_utc: '2026-10-01T00:00:00Z', correction_recorded_at_utc: '2026-10-02T00:00:00Z',
      },
    } };
  });
  return {
    index: { collection: 'FungiP 300', pagination: { limit: 300, offset: 0, total: 40 }, launch_index: { state: 'available', new_chain_verified: false }, data: rows },
    facts: { schemaVersion: 1, cluster: 'mainnet-beta', observedAt: '2026-10-15T00:00:00Z', evidenceUri: 'https://evidence.example/mint-facts', entries: rows.filter(row => row.fungip.species_id !== 'FG026').map(row => ({
      mint: row.fungip.first40_launch.mint_address, creatorWallet: pk(90), launchSignature: row.fungip.first40_launch.launch_tx!, decimals: 6, program: TOKEN_2022, supply: '1000000000000000', mintAuthority: null, freezeAuthority: null, extensions: ['TokenMetadata'],
    })) },
  };
}
test('pilot exporter preserves 39 complete source bindings and holds FG026 without inventing missing receipt', () => {
  const { index, facts } = inputs();
  const result = buildFungipManifest(index, facts, 'https://evidence.example/source-export');
  assert.equal(result.report.included, 39); assert.equal(result.report.state, 'partial_requires_resolution');
  assert.equal(result.report.newlyChainVerified, false); assert.equal(result.report.sourceReportedOnly, true);
  assert.deepEqual(result.report.held, [{ speciesId: 'FG026', taxonId: index.data[25].id, mint: pk(26), reason: 'source_launch_fields_incomplete_requires_curation' }]);
  assert.deepEqual(result.report.supersededMints, [pk(80)]);
  assert.ok(result.report.creationHolds.some(h => h.kind === 'taxon' && h.value === index.data[25].id));
  assert.ok(result.report.creationHolds.some(h => h.kind === 'name' && h.value === index.data[25].canonical_name));
  assert.deepEqual(result.report.creationHolds, buildFungipManifest(index, facts, 'https://evidence.example/source-export').report.creationHolds);
  assert.equal(result.manifest?.entries.find(e => e.taxonId === index.data[33].id)?.mint, pk(34));
  assert.ok(result.manifest); parseLegacyManifest(result.manifest, 'mainnet-beta');
});
test('pilot exporter rejects incomplete indexes and canonical/superseded collisions', () => {
  let { index, facts } = inputs(); index.pagination.total = 41;
  assert.throws(() => buildFungipManifest(index, facts, 'https://evidence.example/source'), /Incomplete/);
  ({ index, facts } = inputs()); index.data[39].fungip.species_id = 'FG041';
  assert.throws(() => buildFungipManifest(index, facts, 'https://evidence.example/source'), /Missing FG001/);
  ({ index, facts } = inputs()); index.data[39].fungip.first40_launch.superseded_mints = [pk(1)];
  assert.throws(() => buildFungipManifest(index, facts, 'https://evidence.example/source'), /superseded/);
});
test('pilot exporter withholds ambiguous UUID and disagreed observed chain fields', () => {
  const { index, facts } = inputs(); index.data[0].fungip.identity_state = 'ambiguous'; facts.entries[1].supply = '100000';
  const result = buildFungipManifest(index, facts, 'https://evidence.example/source');
  assert.equal(result.report.included, 37);
  assert.ok(result.report.held.some(h => h.speciesId === 'FG001' && h.reason === 'canonical_mindex_uuid_unresolved'));
  assert.ok(result.report.held.some(h => h.speciesId === 'FG002' && h.reason === 'observed_chain_fields_disagree_with_source'));
});
test('pilot exporter refuses facts for retired/unknown mints and source batch substitution', () => {
  let { index, facts } = inputs(); facts.entries[0].mint = pk(80);
  assert.throws(() => buildFungipManifest(index, facts, 'https://evidence.example/source'), /outside the canonical/);
  ({ index, facts } = inputs()); index.data[0].fungip.first40_launch.snapshot_sha256 = 'f'.repeat(64);
  assert.throws(() => buildFungipManifest(index, facts, 'https://evidence.example/source'), /batch bindings differ/);
});
