/** Independent real-SQLite engine/worker review controls; chain interactions are fixtures. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import bs58 from 'bs58';
import { Engine } from '../src/engine.js';
import { Store } from '../src/store.js';
import { Worker } from '../src/worker.js';
import { publishMetadata } from '../src/metadata.js';
import type { ChainDriver, ChainOutcome, ChainPlan, CreateRequest, FundingReceipt, LicenseGrant, MintInfo, TransferRequest } from '../src/contracts.js';

const pk = (n: number) => bs58.encode(new Uint8Array(32).fill(n));
const tx = (n: number) => bs58.encode(new Uint8Array(64).fill(n));
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
class FixtureChain implements ChainDriver {
  readonly cluster = 'devnet' as const;
  readonly payer = pk(2);
  readonly treasury = pk(3);
  fundingAmount = '100000';
  createCount = 0;
  transferCount = 0;
  broadcasts: ChainPlan[] = [];
  outcomes = new Map<string, ChainOutcome>();
  infos = new Map<string, MintInfo>();
  prepareCreateHook?: (input: CreateRequest, plan: ChainPlan) => Promise<ChainPlan>;
  reconcileHook?: (plan: ChainPlan) => Promise<ChainOutcome>;
  inspectHook?: (mint: string) => Promise<void>;
  broadcastHook?: (plan: ChainPlan) => Promise<void>;
  async verifyFunding(signature: string, from: string): Promise<FundingReceipt> {
    return { signature, cluster: this.cluster, from, to: this.payer, lamports: this.fundingAmount };
  }
  async inspectMint(mint: string): Promise<MintInfo> {
    await this.inspectHook?.(mint);
    return this.infos.get(mint) ?? { mint, decimals: 6, program: TOKEN_PROGRAM, supply: '1000000', mintAuthority: null, freezeAuthority: null, extensions: [] };
  }
  async verifyLaunch(): Promise<void> {}
  async inventory(): Promise<string> { return '1000000000'; }
  async prepareCreate(input: CreateRequest): Promise<ChainPlan> {
    const n = ++this.createCount;
    const mint = pk(50 + n);
    const plan = { wireBase64: Buffer.from(`fixture-create-${n}`).toString('base64'), signature: tx(50 + n), blockhash: pk(8), lastValidBlockHeight: 1000, mint, estimatedLamports: '100' };
    this.infos.set(mint, { mint, decimals: input.decimals, program: TOKEN_PROGRAM, supply: input.supply, mintAuthority: null, freezeAuthority: null, extensions: [], metadataUri: input.metadataUri, metadataSha256: input.metadataSha256 });
    return this.prepareCreateHook ? this.prepareCreateHook(input, plan) : plan;
  }
  async prepareTransfer(): Promise<ChainPlan> {
    const n = ++this.transferCount;
    return { wireBase64: Buffer.from(`fixture-transfer-${n}`).toString('base64'), signature: tx(100 + n), blockhash: pk(8), lastValidBlockHeight: 1000, estimatedLamports: '100' };
  }
  async broadcast(plan: ChainPlan): Promise<void> { this.broadcasts.push(structuredClone(plan)); await this.broadcastHook?.(plan); }
  async reconcile(plan: ChainPlan): Promise<ChainOutcome> {
    return this.reconcileHook ? this.reconcileHook(plan) : this.outcomes.get(plan.signature) ?? { state: 'pending' };
  }
}
async function fixture() {
  const store = new Store(':memory:');
  const chain = new FixtureChain();
  const engine = new Engine(store, chain);
  const grant: LicenseGrant = { id: randomUUID(), licensee: 'MycoDAO', licensor: 'Fixture data rights holder', rights: ['display', 'token_metadata', 'reward'], taxonIds: null, validFrom: '2000-01-01T00:00:00Z', validUntil: '2099-01-01T00:00:00Z', evidenceUri: 'https://rights.example/fixture', status: 'active' };
  engine.grant(grant, 'fixture-operator');
  const taxonId = randomUUID();
  engine.importSpecies([{ taxonId, scientificName: 'Agaricus fixtureensis', kingdom: 'Fungi', rank: 'species', sourceRevision: 'fixture:1', sourceUrl: `https://mindex.example/api/mindex/taxa/${taxonId}`, externalIds: { gbif: '100' }, licenseId: grant.id, image: { url: 'https://images.example/fixture.png', license: 'CC-BY-4.0', attribution: 'Fixture photographer' } }], 'fixture-operator');
  publishMetadata(engine, taxonId, 'https://metadata.example', 'fixture-operator');
  await engine.funding({ signature: tx(10), from: pk(11) }, 'fixture-operator');
  const allocate = (purpose: 'creation' | 'rewards' = 'creation', extra: Record<string, unknown> = {}) => engine.allocate({ id: randomUUID(), fundingSignature: tx(10), budgetLamports: '5000', jobMaxLamports: '1000', route: 'spl_reward', supply: '1000000', decimals: 6, batchSize: 1, purpose, ...extra }, 'fixture-operator');
  const adopt = () => engine.adoptToken({ taxonId, cluster: 'devnet', mint: pk(20), route: 'legacy_fungip', launchSignature: tx(21), creatorWallet: pk(22), status: 'canonical', provenance: 'https://proof.example/legacy' }, 'fixture-operator');
  return { store, chain, engine, grant, taxonId, allocate, adopt };
}
async function rewardFixture(dailyUserLimit = 1) {
  const f = await fixture(); await f.adopt();
  const a = f.allocate('rewards');
  f.engine.setPolicy({ id: randomUUID(), version: 1, existingSpeciesUnits: '5', rareMycoUnits: '10', newMycoUnits: '20', mycoMint: pk(30), dailyUserLimit }, 'fixture-operator');
  const userId = randomUUID();
  const keys = generateKeyPairSync('ed25519');
  const publicBytes = keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
  const wallet = bs58.encode(publicBytes);
  const challenge = f.engine.challenge(userId, wallet);
  const signatureBase64 = sign(null, Buffer.from(challenge.message), keys.privateKey).toString('base64');
  const walletInput = { wallet, nonce: challenge.nonce, signatureBase64 };
  f.engine.verifyWallet(userId, walletInput);
  const submit = (sourceRecordId: string) => f.engine.submitFinding(userId, { taxonId: f.taxonId, source: 'specimen', sourceRecordId, evidenceUri: `https://evidence.example/${sourceRecordId}`, evidenceSha256: digest(sourceRecordId) });
  const review = (findingId: string) => ({ findingId, decision: 'approved', classification: 'existing', reviewerId: 'independent-fixture-reviewer', evidenceUri: 'https://review.example/evidence', notes: 'Reviewed fixture occurrence ownership and identification.', allocationId: a.id });
  return { ...f, userId, wallet, walletInput, submit, review };
}

test('review: duplicate funding replay and allocation replay cannot duplicate spendable budget', async t => {
  const f = await fixture(); t.after(() => f.store.close());
  await Promise.all([f.engine.funding({ signature: tx(10), from: pk(11) }, 'fixture'), f.engine.funding({ signature: tx(10), from: pk(11) }, 'fixture')]);
  assert.equal(f.store.get('SELECT COUNT(*) n FROM funding').n, 1);
  const a = f.allocate(); f.engine.allocate(a, 'fixture');
  assert.equal(f.store.get('SELECT COUNT(*) n FROM allocations').n, 1);
  assert.throws(() => f.engine.allocate({ ...a, budgetLamports: '4000' }, 'fixture'), /allocation_replay_mismatch/);
  assert.throws(() => f.allocate('creation', { budgetLamports: '96000' }), /funding_already_allocated/);
  f.chain.fundingAmount = '100001';
  await assert.rejects(() => f.engine.funding({ signature: tx(10), from: pk(11) }, 'fixture'), /funding_replay_mismatch/);
});

test('review: schedule and simultaneous claims reserve one creation once', async t => {
  const f = await fixture(); t.after(() => f.store.close()); f.allocate();
  assert.equal(f.engine.schedule().queued, 1); assert.equal(f.engine.schedule().queued, 0);
  const [a, b] = await Promise.all([Promise.resolve().then(() => f.engine.claimJob()), Promise.resolve().then(() => f.engine.claimJob())]);
  assert.equal([a, b].filter(Boolean).length, 1);
  assert.equal(f.store.get('SELECT reserved FROM allocations').reserved, 1000);
});

test('review: signed wallet challenge and occurrence/review replays are consumed once; daily cap counts review date', async t => {
  const f = await rewardFixture(); t.after(() => f.store.close());
  assert.throws(() => f.engine.verifyWallet(f.userId, f.walletInput), /invalid_or_expired_challenge/);
  const finding = f.submit('first');
  assert.equal(f.submit('first').id, finding.id);
  const review = f.review(finding.id);
  await f.engine.reviewFinding(review, 'fixture-reviewer');
  await f.engine.reviewFinding(review, 'fixture-reviewer');
  assert.equal(f.store.get('SELECT COUNT(*) n FROM rewards').n, 1);
  assert.equal(f.store.get('SELECT COUNT(*) n FROM jobs').n, 1);
  const next = f.submit('second');
  await assert.rejects(() => f.engine.reviewFinding(f.review(next.id), 'fixture-reviewer'), /daily_reward_limit/);
  assert.equal(f.store.get('SELECT status FROM discoveries WHERE id=?', next.id).status, 'pending');
  // A finding submitted yesterday and reviewed today still consumes today's cap.
  f.store.run("UPDATE discoveries SET created_at='2000-01-01T00:00:00Z' WHERE id=?", finding.id);
  await assert.rejects(() => f.engine.reviewFinding(f.review(next.id), 'fixture-reviewer'), /daily_reward_limit/);
});

test('review: concurrent approvals cannot bypass daily user cap', async t => {
  const f = await rewardFixture(); t.after(() => f.store.close());
  const a = f.submit('simultaneous-a'), b = f.submit('simultaneous-b');
  const results = await Promise.allSettled([f.engine.reviewFinding(f.review(a.id), 'fixture-reviewer'), f.engine.reviewFinding(f.review(b.id), 'fixture-reviewer')]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(f.store.get("SELECT COUNT(*) n FROM discoveries WHERE status='approved'").n, 1);
  assert.equal(f.store.get('SELECT COUNT(*) n FROM rewards').n, 1);
});

test('review: revoked license blocks unsent create and catalog display', async t => {
  const f = await fixture(); t.after(() => f.store.close()); f.allocate(); f.engine.schedule();
  f.engine.grant({ ...f.grant, status: 'revoked' }, 'fixture-operator');
  await new Worker(f.engine).tick();
  assert.equal(f.chain.createCount, 0); assert.equal(f.chain.broadcasts.length, 0);
  assert.equal(f.engine.catalog().total, 0);
  assert.equal(f.store.get('SELECT state FROM jobs').state, 'blocked');
});

test('review: license revoked during asynchronous reward evidence checks cannot authorize a new reward', async t => {
  const f = await rewardFixture(); t.after(() => f.store.close());
  const finding = f.submit('license-race'); const started = deferred<void>(), resume = deferred<void>();
  f.chain.inspectHook = async () => { started.resolve(); await resume.promise; };
  const reviewing = f.engine.reviewFinding(f.review(finding.id), 'fixture-reviewer');
  await started.promise;
  f.engine.grant({ ...f.grant, status: 'revoked' }, 'fixture-operator'); resume.resolve();
  await assert.rejects(() => reviewing, /license|entitle/i);
  assert.equal(f.store.get('SELECT COUNT(*) n FROM rewards').n, 0);
});

test('review: worker reconciles persisted bytes after broadcast timeout without another preparation or spend', async t => {
  const f = await fixture(); t.after(() => f.store.close()); const a = f.allocate();
  f.chain.broadcastHook = async plan => {
    f.chain.outcomes.set(plan.signature, { state: 'finalized', actualLamports: '100' });
    throw new Error('fixture RPC timeout after network accepted bytes');
  };
  await new Worker(f.engine).tick();
  const first = f.store.get('SELECT * FROM jobs'); assert.equal(first.state, 'submitted'); assert.ok(first.plan);
  f.store.run('UPDATE jobs SET lease_until=0');
  await new Worker(f.engine).tick();
  assert.equal(f.chain.createCount, 1); assert.equal(f.chain.broadcasts.length, 1);
  assert.equal(f.store.get('SELECT state FROM jobs').state, 'finalized');
  assert.equal(f.store.get('SELECT plan FROM jobs').plan, first.plan);
  assert.equal(f.store.get('SELECT reserved FROM allocations WHERE id=?', a.id).reserved, 0);
  assert.equal(f.store.get('SELECT spent FROM allocations WHERE id=?', a.id).spent, 100);
  await new Worker(f.engine).tick(); assert.equal(f.chain.createCount, 1);
});

test('review: accepted broadcast is reconciled after revocation without rebroadcasting', async t => {
  const f = await fixture(); t.after(() => f.store.close()); f.allocate();
  await new Worker(f.engine).tick();
  const signed = JSON.parse(f.store.get('SELECT plan FROM jobs').plan) as ChainPlan;
  f.engine.grant({ ...f.grant, status: 'revoked' }, 'fixture-operator');
  f.store.run('UPDATE jobs SET lease_until=0'); await new Worker(f.engine).tick();
  assert.equal(f.chain.broadcasts.length, 1);
  f.chain.outcomes.set(signed.signature, { state: 'finalized', actualLamports: '100' });
  f.store.run('UPDATE jobs SET lease_until=0'); await new Worker(f.engine).tick();
  assert.equal(f.store.get('SELECT state FROM jobs').state, 'finalized'); assert.equal(f.chain.broadcasts.length, 1);
});

test('review: adopting a genuine legacy mint after scheduling cannot launch a duplicate species mint', async t => {
  const f = await fixture(); t.after(() => f.store.close()); f.allocate(); f.engine.schedule();
  await f.adopt(); await new Worker(f.engine).tick();
  assert.equal(f.chain.createCount, 0, 'existing canonical mint must prevent creation before any signing');
  assert.equal(f.chain.broadcasts.length, 0);
});

test('review: an expired worker cannot overwrite a successor lease after losing prepare CAS', async t => {
  const f = await fixture(); t.after(() => f.store.close()); f.allocate();
  const originalNow = Date.now, frozenNow = originalNow();
  Date.now = () => frozenNow; t.after(() => { Date.now = originalNow; });
  const firstStarted = deferred<void>(), firstFinish = deferred<void>(), secondStarted = deferred<void>(), secondFinish = deferred<void>();
  let calls = 0;
  f.chain.prepareCreateHook = async (_input, plan) => {
    if (++calls === 1) { firstStarted.resolve(); await firstFinish.promise; }
    return plan;
  };
  f.chain.reconcileHook = async () => { secondStarted.resolve(); await secondFinish.promise; return { state: 'pending' }; };
  const first = new Worker(f.engine).tick(); await firstStarted.promise;
  // Model a reclaimed lease with the same wall-clock timestamp. Ownership must
  // use a distinct token even when clocks move or claims share a millisecond.
  f.store.run('UPDATE jobs SET lease_until=0');
  const second = new Worker(f.engine).tick(); await secondStarted.promise;
  const successor = f.store.get('SELECT plan,lease_until,state FROM jobs');
  firstFinish.resolve(); await first;
  const after = f.store.get('SELECT plan,lease_until,state FROM jobs');
  // Release the successor before assertions so the test cannot leave work pending.
  secondFinish.resolve(); await second;
  assert.equal(after.plan, successor.plan);
  assert.equal(after.lease_until, successor.lease_until, 'stale worker must preserve successor lease');
  assert.equal(after.state, 'prepared', 'stale catch must not block successor transaction');
  assert.equal(f.chain.broadcasts.length, 1);
});

test('review: stale expired receipt cannot turn a finalized job back into blocked', async t => {
  const f = await fixture(); t.after(() => f.store.close()); f.allocate();
  await new Worker(f.engine).tick(); f.store.run('UPDATE jobs SET lease_until=0');
  const staleStarted = deferred<void>(), staleFinish = deferred<void>(); let calls = 0;
  f.chain.reconcileHook = async () => {
    if (++calls === 1) { staleStarted.resolve(); await staleFinish.promise; return { state: 'expired' }; }
    return { state: 'finalized', actualLamports: '100' };
  };
  const stale = new Worker(f.engine).tick(); await staleStarted.promise;
  f.store.run('UPDATE jobs SET lease_until=0'); await new Worker(f.engine).tick();
  staleFinish.resolve(); await stale;
  assert.equal(f.store.get('SELECT state FROM jobs').state, 'finalized');
  assert.equal(f.store.get('SELECT spent FROM allocations').spent, 100);
});

test('review: pausing during asynchronous reconciliation prevents the first broadcast', async t => {
  const f = await fixture(); t.after(() => f.store.close()); f.allocate();
  const started = deferred<void>(), resume = deferred<void>();
  f.chain.reconcileHook = async () => { started.resolve(); await resume.promise; return { state: 'pending' }; };
  const ticking = new Worker(f.engine).tick(); await started.promise;
  f.store.run("INSERT INTO config(key,value) VALUES ('paused','true') ON CONFLICT(key) DO UPDATE SET value='true'");
  resume.resolve(); await ticking;
  assert.equal(f.chain.broadcasts.length, 0, 'a pause acknowledged before broadcast must stop unsigned submission');
  assert.ok(f.store.get('SELECT plan FROM jobs').plan, 'preserve prepared bytes for later reconciliation');
});

test('review: replacing a revoked grant cannot authorize an existing job bound to the original license', async t => {
  const f = await fixture(); t.after(() => f.store.close()); f.allocate();
  const started = deferred<void>(), resume = deferred<void>();
  f.chain.reconcileHook = async () => { started.resolve(); await resume.promise; return { state: 'pending' }; };
  const ticking = new Worker(f.engine).tick(); await started.promise;
  const replacement = { ...f.grant, id: randomUUID() };
  f.engine.grant(replacement, 'fixture-operator');
  f.engine.importSpecies([{ ...f.engine.species(f.taxonId), licenseId: replacement.id }], 'fixture-operator');
  f.engine.grant({ ...f.grant, status: 'revoked' }, 'fixture-operator');
  resume.resolve(); await ticking;
  assert.equal(f.chain.broadcasts.length, 0, 'immutable A-bound metadata cannot be submitted under replacement grant B');
  assert.equal(f.store.get('SELECT COUNT(*) n FROM tokens').n, 0);
});

test('review: prepared estimate above per-job cap blocks all broadcasts and retains reservation for review', async t => {
  const f = await fixture(); t.after(() => f.store.close()); const allocation = f.allocate();
  f.chain.prepareCreateHook = async (_input, plan) => ({ ...plan, estimatedLamports: '1001' });
  await new Worker(f.engine).tick();
  assert.equal(f.chain.broadcasts.length, 0);
  assert.equal(f.store.get('SELECT state FROM jobs').state, 'blocked');
  assert.equal(f.store.get('SELECT reserved FROM allocations WHERE id=?', allocation.id).reserved, 1000);
  assert.equal(f.store.get('SELECT spent FROM allocations WHERE id=?', allocation.id).spent, 0);
  assert.equal(f.engine.schedule().queued, 0);
});

test('review: known untokenized taxon queues create then first-observer reward after mint', async t => {
  const f = await fixture(); t.after(() => f.store.close());
  f.allocate('creation');
  const rewards = f.allocate('rewards');
  f.engine.setPolicy({
    id: randomUUID(), version: 1, existingSpeciesUnits: '5', firstObserverUnits: '500000',
    rareMycoUnits: '10', newMycoUnits: '20', mycoMint: pk(30), dailyUserLimit: 3,
  }, 'fixture-operator');
  const userId = randomUUID();
  const keys = generateKeyPairSync('ed25519');
  const publicBytes = keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
  const wallet = bs58.encode(publicBytes);
  const challenge = f.engine.challenge(userId, wallet);
  f.engine.verifyWallet(userId, {
    wallet, nonce: challenge.nonce,
    signatureBase64: sign(null, Buffer.from(challenge.message), keys.privateKey).toString('base64'),
  });
  const finding = f.engine.submitFinding(userId, {
    taxonId: f.taxonId, source: 'specimen', sourceRecordId: 'FO-1',
    evidenceUri: 'https://evidence.example/fo', evidenceSha256: digest('fo-evidence'),
  });
  const reviewed = await f.engine.reviewFinding({
    findingId: finding.id, decision: 'approved', classification: 'existing',
    reviewerId: 'independent-reviewer', evidenceUri: 'https://evidence.example/review',
    notes: 'Known taxon without a mint; first-observer path.', allocationId: rewards.id,
  }, 'reviewer');
  assert.equal(reviewed.status, 'approved_pending_mint');
  assert.equal(f.store.get("SELECT status FROM discoveries WHERE id=?", finding.id).status, 'approved_pending_mint');
  assert.ok(f.store.get("SELECT 1 FROM jobs WHERE kind='create' AND taxon_id=?", f.taxonId));
  f.chain.reconcileHook = async (plan) => ({ state: 'finalized', actualLamports: '100' });
  for (let i = 0; i < 8; i++) {
    f.store.run('UPDATE jobs SET lease_until=0');
    await new Worker(f.engine).tick();
  }
  assert.ok(f.store.get('SELECT 1 FROM tokens WHERE taxon_id=?', f.taxonId), 'mint must finalize');
  assert.equal(f.store.get("SELECT status FROM discoveries WHERE id=?", finding.id).status, 'approved');
  assert.ok(f.store.get("SELECT 1 FROM rewards WHERE discovery_id=? AND kind='species'", finding.id), 'first-observer reward queued');
});
