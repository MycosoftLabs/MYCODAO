import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import bs58 from 'bs58';
import {
  Connection, Keypair, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction,
  type AccountInfo,
} from '@solana/web3.js';
import {
  AccountLayout, AuthorityType, ExtensionType, MintLayout, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID,
  decodeInitializeMint2Instruction, decodeMintToCheckedInstruction, decodeSetAuthorityInstruction,
  decodeTransferCheckedInstruction, getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { pack } from '@solana/spl-token-metadata';
import { GENESIS_HASHES, SolanaChainDriver } from '../src/solana.js';
import { LocalTransactionSigner, RemoteTransactionSigner, verifyTransactionSignatures, type SigningPolicy } from '../src/signer.js';
import type { ChainPlan, CreateRequest } from '../src/contracts.js';

const key = () => Keypair.generate().publicKey;
const info = (owner: PublicKey, data: Buffer): AccountInfo<Buffer> => ({ owner, data, lamports: 100_000, executable: false, rentEpoch: 0 });
function mintData(mint: PublicKey, program = TOKEN_2022_PROGRAM_ID, extra?: ExtensionType): AccountInfo<Buffer> {
  const base = Buffer.alloc(82);
  MintLayout.encode({ mintAuthorityOption: 0, mintAuthority: PublicKey.default, supply: 1_000_000n,
    decimals: 6, isInitialized: true, freezeAuthorityOption: 0, freezeAuthority: PublicKey.default }, base);
  if (program.equals(TOKEN_PROGRAM_ID)) return info(program, base);
  const metadata = Buffer.from(pack({ mint, name: 'Species', symbol: 'SP', uri: 'ipfs://metadata',
    additionalMetadata: [['metadata_sha256', 'a'.repeat(64)]] }));
  const header = Buffer.alloc(4); header.writeUInt16LE(ExtensionType.TokenMetadata, 0); header.writeUInt16LE(metadata.length, 2);
  const tail = extra === undefined ? Buffer.alloc(0) : Buffer.from([extra, 0, 0, 0]);
  return info(program, Buffer.concat([base, Buffer.alloc(83), Buffer.from([1]), header, metadata, tail]));
}
function accountData(mint: PublicKey, owner: PublicKey, program: PublicKey, amount = 1000n, frozen = false): AccountInfo<Buffer> {
  const data = Buffer.alloc(165);
  AccountLayout.encode({ mint, owner, amount, delegateOption: 0, delegate: PublicKey.default, state: frozen ? 2 : 1,
    isNativeOption: 0, isNative: 0n, delegatedAmount: 0n, closeAuthorityOption: 0, closeAuthority: PublicKey.default }, data);
  return info(program, data);
}
function fixture() {
  const payer = Keypair.generate();
  const accounts = new Map<string, AccountInfo<Buffer>>();
  const calls = { sends: 0, simulations: 0, genesis: 0 };
  const rpc = {
    getGenesisHash: async (): Promise<string> => { calls.genesis++; return GENESIS_HASHES.devnet; },
    getMinimumBalanceForRentExemption: async (bytes: number) => bytes * 100,
    getLatestBlockhash: async () => ({ blockhash: key().toBase58(), lastValidBlockHeight: 100 }),
    getFeeForMessage: async () => ({ value: 10_000 }),
    getBalance: async () => 1_000_000_000,
    simulateTransaction: async () => { calls.simulations++; return { value: { err: null, accounts: [{ lamports: 999_900_000 }] } }; },
    getAccountInfo: async (address: PublicKey) => accounts.get(address.toBase58()) ?? null,
    getBlockHeight: async () => 50,
    sendRawTransaction: async (wire: Buffer) => { calls.sends++; return bs58.encode(VersionedTransaction.deserialize(wire).signatures[0]); },
    getSignatureStatuses: async () => ({ value: [null] }),
    getTransaction: async () => null,
    getParsedTransaction: async () => null,
  };
  const driver = new SolanaChainDriver({ cluster: 'devnet', signer: new LocalTransactionSigner(payer, 'devnet'),
    connection: rpc as unknown as Connection });
  return { payer, accounts, calls, rpc, driver };
}
const creation = (): CreateRequest => ({ jobId: 'creation-1', route: 'spl_reward', name: 'Agaricus campestris', symbol: 'AGARICUS',
  metadataUri: 'ipfs://immutable-metadata', metadataSha256: 'a'.repeat(64), supply: '1000000000000', decimals: 6, maxLamports: '1000000' });

test('capped creation includes on-mint metadata hash, inventory issuance, immutable metadata and revoked mint authority without broadcasting', async () => {
  const { driver, payer, calls } = fixture();
  const plan = await driver.prepareCreate(creation());
  const transaction = VersionedTransaction.deserialize(Buffer.from(plan.wireBase64, 'base64'));
  verifyTransactionSignatures(transaction);
  const instructions = TransactionMessage.decompile(transaction.message).instructions;
  const mint = new PublicKey(plan.mint!);
  const init = instructions.find(ix => ix.programId.equals(TOKEN_2022_PROGRAM_ID) && ix.data[0] === 20)!;
  const decodedInit = decodeInitializeMint2Instruction(init, TOKEN_2022_PROGRAM_ID);
  assert.equal(decodedInit.data.freezeAuthority, null);
  const issuance = instructions.find(ix => ix.programId.equals(TOKEN_2022_PROGRAM_ID) && ix.data[0] === 14 && ix.data.length === 10)!;
  const decodedIssuance = decodeMintToCheckedInstruction(issuance, TOKEN_2022_PROGRAM_ID);
  assert.equal(decodedIssuance.data.amount, 1_000_000_000_000n);
  assert.equal(decodedIssuance.keys.destination.pubkey.toBase58(), getAssociatedTokenAddressSync(mint, payer.publicKey, false, TOKEN_2022_PROGRAM_ID).toBase58());
  const revoke = decodeSetAuthorityInstruction(instructions.find(ix => ix.data[0] === 6 && ix.programId.equals(TOKEN_2022_PROGRAM_ID))!, TOKEN_2022_PROGRAM_ID);
  assert.equal(revoke.data.authorityType, AuthorityType.MintTokens);
  assert.equal(revoke.data.newAuthority, null);
  assert(instructions.some(ix => ix.data.includes(Buffer.from('metadata_sha256')) && ix.data.includes(Buffer.from('a'.repeat(64)))));
  assert.equal(transaction.message.header.numRequiredSignatures, 2);
  assert(Buffer.from(plan.wireBase64, 'base64').length <= 1232);
  assert.equal(calls.simulations, 1);
  assert.equal(calls.sends, 0);
});

test('preparation rejects overspending, failed simulation, and wrong RPC genesis', async () => {
  const f = fixture();
  await assert.rejects(f.driver.prepareCreate({ ...creation(), maxLamports: '1' }), /budget exceeded/);
  f.rpc.simulateTransaction = async () => ({ value: { err: { InstructionError: [0, 'InvalidArgument'] } as any, accounts: [] } });
  await assert.rejects(f.driver.prepareCreate(creation()), /simulation failed/);
  f.rpc.getGenesisHash = async () => 'wrong-genesis';
  await assert.rejects(f.driver.prepareCreate(creation()), /genesis hash/);
  assert.equal(f.calls.sends, 0);
});

test('optional Pump builder constructs only create_v2, never a buy or treasury inventory promise', async () => {
  const f = fixture();
  const request: CreateRequest = { ...creation(), route: 'pump_direct', supply: '1000000000000000' };
  const plan = await f.driver.prepareCreate(request);
  const transaction = VersionedTransaction.deserialize(Buffer.from(plan.wireBase64, 'base64'));
  const instructions = TransactionMessage.decompile(transaction.message).instructions;
  assert.equal(instructions.length, 2); // Compute limit and create-only.
  assert(instructions[1].data.subarray(0, 8).equals(createHash('sha256').update('global:create_v2').digest().subarray(0, 8)));
  assert.equal(f.calls.sends, 0);
  await assert.rejects(f.driver.prepareCreate({ ...request, supply: '123' }), /fixed 1 billion/);
});

test('mint inspection returns on-chain metadata and rejects unrelated account owners', async () => {
  const f = fixture(), mint = key();
  f.accounts.set(mint.toBase58(), mintData(mint));
  const inspected = await f.driver.inspectMint(mint.toBase58());
  assert.equal(inspected.mintAuthority, null);
  assert.equal(inspected.freezeAuthority, null);
  assert.equal((inspected as any).metadataSha256, 'a'.repeat(64));
  assert.equal((inspected as any).metadataUri, 'ipfs://metadata');
  f.accounts.set(mint.toBase58(), info(SystemProgram.programId, Buffer.alloc(82)));
  await assert.rejects(f.driver.inspectMint(mint.toBase58()), /Unsupported token program/);
});

for (const program of [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID]) {
  test(`reward uses actual ${program.equals(TOKEN_PROGRAM_ID) ? 'SPL' : 'Token-2022'} program, checked transfer and recipient ATA`, async () => {
    const f = fixture(), mint = key(), recipient = key();
    f.accounts.set(mint.toBase58(), mintData(mint, program));
    const source = getAssociatedTokenAddressSync(mint, f.payer.publicKey, false, program);
    f.accounts.set(source.toBase58(), accountData(mint, f.payer.publicKey, program));
    const plan = await f.driver.prepareTransfer({ jobId: 'reward-1', mint: mint.toBase58(), recipient: recipient.toBase58(),
      amount: '123', decimals: 6, program: program.toBase58(), maxLamports: '1000000' });
    const tx = VersionedTransaction.deserialize(Buffer.from(plan.wireBase64, 'base64'));
    const instructions = TransactionMessage.decompile(tx.message).instructions;
    assert.equal(instructions.length, 2);
    assert.equal(instructions[0].data[0], 1); // CreateIdempotent ATA.
    const transfer = decodeTransferCheckedInstruction(instructions[1], program);
    assert.equal(transfer.data.amount, 123n);
    assert.equal(transfer.data.decimals, 6);
    assert.equal(transfer.keys.owner.pubkey.toBase58(), f.payer.publicKey.toBase58());
    assert.equal(transfer.keys.destination.pubkey.toBase58(), getAssociatedTokenAddressSync(mint, recipient, false, program).toBase58());
    assert.equal(await f.driver.inventory(mint.toBase58()), '1000');
    assert.equal(f.calls.sends, 0);
  });
}

test('rewards reject unsupported extensions, insufficient inventory, decimal mismatches and frozen accounts', async () => {
  const f = fixture(), mint = key(), recipient = key();
  const source = getAssociatedTokenAddressSync(mint, f.payer.publicKey, false, TOKEN_2022_PROGRAM_ID);
  const request = { jobId: 'reward-1', mint: mint.toBase58(), recipient: recipient.toBase58(), amount: '123', decimals: 6,
    program: TOKEN_2022_PROGRAM_ID.toBase58(), maxLamports: '1000000' };
  f.accounts.set(mint.toBase58(), mintData(mint, TOKEN_2022_PROGRAM_ID, ExtensionType.NonTransferable));
  f.accounts.set(source.toBase58(), accountData(mint, f.payer.publicKey, TOKEN_2022_PROGRAM_ID));
  await assert.rejects(f.driver.prepareTransfer(request), /unsupported/);
  f.accounts.set(mint.toBase58(), mintData(mint));
  await assert.rejects(f.driver.prepareTransfer({ ...request, decimals: 5 }), /decimals/);
  await assert.rejects(f.driver.prepareTransfer({ ...request, amount: '1001' }), /inventory/);
  f.accounts.set(source.toBase58(), accountData(mint, f.payer.publicKey, TOKEN_2022_PROGRAM_ID, 1000n, true));
  await assert.rejects(f.driver.prepareTransfer(request), /inventory/);
  assert.equal(f.calls.sends, 0);
});

test('funding proves finalized, signed direct transfer and retained net credit rather than wallet balance', async () => {
  const f = fixture(), source = key(), signature = 'funding-signature';
  const receipt: any = { meta: { err: null, preBalances: [1000, 0], postBalances: [500, 500] },
    transaction: { signatures: [signature], message: { accountKeys: [{ pubkey: source, signer: true }, { pubkey: f.payer.publicKey, signer: false }],
      instructions: [{ programId: SystemProgram.programId, parsed: { type: 'transfer', info: {
        source: source.toBase58(), destination: f.payer.publicKey.toBase58(), lamports: 500,
      } } }] } } };
  f.rpc.getParsedTransaction = async (_sig?: string, config?: any) => { assert.equal(config.commitment, 'finalized'); return receipt; };
  assert.equal((await f.driver.verifyFunding(signature, source.toBase58())).lamports, '500');
  receipt.meta.postBalances[1] = 1;
  await assert.rejects(f.driver.verifyFunding(signature, source.toBase58()), /net credit/);
  receipt.meta.postBalances[1] = 500;
  receipt.transaction.message.instructions[0].parsed.info.destination = key().toBase58();
  await assert.rejects(f.driver.verifyFunding(signature, source.toBase58()), /No matching funding/);
  receipt.meta.err = { InstructionError: [0, 'failed'] };
  await assert.rejects(f.driver.verifyFunding(signature, source.toBase58()), /failed/);
});

test('launch adoption requires actual initialization for that mint', async () => {
  const f = fixture(), mint = key(), signature = 'launch-signature';
  f.accounts.set(mint.toBase58(), mintData(mint));
  const receipt: any = { meta: { err: null }, transaction: { signatures: [signature], message: { instructions: [{
    programId: TOKEN_2022_PROGRAM_ID, parsed: { type: 'transferChecked', info: { mint: mint.toBase58() } },
  }] } } };
  f.rpc.getParsedTransaction = async () => receipt;
  await assert.rejects(f.driver.verifyLaunch(mint.toBase58(), signature), /does not initialize/);
  receipt.transaction.message.instructions[0].parsed.type = 'initializeMint2';
  await f.driver.verifyLaunch(mint.toBase58(), signature);
});

test('broadcast verifies durable bytes; confirmation distinguishes finality, expiry and ambiguous reward history', async () => {
  const f = fixture();
  const plan = await f.driver.prepareCreate(creation());
  await f.driver.broadcast(plan);
  assert.equal(f.calls.sends, 1);
  await assert.rejects(f.driver.broadcast({ ...plan, signature: 'wrong' }), /binding mismatch/);
  f.rpc.getSignatureStatuses = async () => ({ value: [{ err: null, confirmationStatus: 'confirmed' } as any] });
  assert.equal((await f.driver.reconcile(plan)).state, 'pending');
  f.rpc.getSignatureStatuses = async () => ({ value: [{ err: null, confirmationStatus: 'finalized' } as any] });
  f.rpc.getTransaction = async () => ({ transaction: { signatures: [plan.signature],
    message: VersionedTransaction.deserialize(Buffer.from(plan.wireBase64, 'base64')).message },
    meta: { err: null, preBalances: [1_000_000], postBalances: [900_000] } } as any);
  assert.deepEqual(await f.driver.reconcile(plan), { state: 'finalized', actualLamports: '100000' });
  f.rpc.getSignatureStatuses = async () => ({ value: [null] });
  f.rpc.getBlockHeight = async () => 200;
  assert.equal((await f.driver.reconcile(plan)).state, 'expired');
  const message = new TransactionMessage({ payerKey: f.payer.publicKey, recentBlockhash: key().toBase58(), instructions: [] }).compileToV0Message();
  const reward = new VersionedTransaction(message); reward.sign([f.payer]);
  const rewardPlan: ChainPlan = { ...plan, mint: undefined, signature: bs58.encode(reward.signatures[0]),
    wireBase64: Buffer.from(reward.serialize()).toString('base64'), blockhash: message.recentBlockhash };
  assert.equal((await f.driver.reconcile(rewardPlan)).state, 'unknown');
});

test('failed finalized transactions account actual fees; nonfinalized failures stay pending', async () => {
  const f = fixture(), plan = await f.driver.prepareCreate(creation());
  const failure = { InstructionError: [1, 'Custom'] };
  f.rpc.getSignatureStatuses = async () => ({ value: [{ err: failure, confirmationStatus: 'confirmed' } as any] });
  assert.equal((await f.driver.reconcile(plan)).state, 'pending');
  f.rpc.getSignatureStatuses = async () => ({ value: [{ err: failure, confirmationStatus: 'finalized' } as any] });
  f.rpc.getTransaction = async () => ({ transaction: { signatures: [plan.signature],
    message: VersionedTransaction.deserialize(Buffer.from(plan.wireBase64, 'base64')).message },
    meta: { err: failure, preBalances: [1_000_000], postBalances: [990_000] } } as any);
  assert.deepEqual(await f.driver.reconcile(plan), { state: 'failed', actualLamports: '10000', error: JSON.stringify(failure) });
});

test('disabled mainnet rejects creation and rewards before asking any signer or RPC', async () => {
  let signed = 0;
  const payer = key();
  const driver = new SolanaChainDriver({ cluster: 'mainnet-beta', signer: { publicKey: payer, kind: 'remote',
    sign: async transaction => { signed++; return transaction; } }, connection: {} as Connection });
  await assert.rejects(driver.prepareCreate(creation()), /execution has not been enabled/);
  await assert.rejects(driver.prepareTransfer({ jobId: 'disabled', mint: key().toBase58(), recipient: key().toBase58(),
    amount: '1', decimals: 6, program: TOKEN_PROGRAM_ID.toBase58(), maxLamports: '10000' }), /execution has not been enabled/);
  assert.equal(signed, 0);
});

test('remote signer binds exact message, policy and all signatures; local keys cannot serve mainnet', async () => {
  const payer = Keypair.generate(), blockhash = key().toBase58();
  assert.throws(() => new LocalTransactionSigner(payer, 'mainnet-beta'), /mainnet/);
  const transaction = new VersionedTransaction(new TransactionMessage({ payerKey: payer.publicKey, recentBlockhash: blockhash, instructions: [] }).compileToV0Message());
  const policy: SigningPolicy = { jobId: 'remote-1', operation: 'reward', cluster: 'devnet', expectedGenesisHash: GENESIS_HASHES.devnet,
    payer: payer.publicKey.toBase58(), maxLamports: '10000', estimatedLamports: '5000', allowedPrograms: [] };
  let mutate = false, missingSignature = false;
  const remote = new RemoteTransactionSigner({ url: 'https://signer.example.test/sign', publicKey: payer.publicKey.toBase58(),
    fetch: (async (_url: unknown, init: any) => {
      const body = JSON.parse(init.body);
      assert.equal(body.policy.maxLamports, '10000');
      assert.equal(body.messageSha256, createHash('sha256').update(transaction.message.serialize()).digest('hex'));
      const reply = VersionedTransaction.deserialize(Buffer.from(body.transactionBase64, 'base64'));
      if (mutate) reply.message.recentBlockhash = key().toBase58();
      if (!missingSignature) reply.sign([payer]);
      return new Response(JSON.stringify({ messageSha256: body.messageSha256, transactionBase64: Buffer.from(reply.serialize()).toString('base64') }));
    }) as typeof fetch });
  verifyTransactionSignatures(await remote.sign(transaction, policy));
  mutate = true;
  await assert.rejects(remote.sign(transaction, policy), /changed the transaction/);
  mutate = false; missingSignature = true;
  await assert.rejects(remote.sign(transaction, policy), /signature/);
  await assert.rejects(remote.sign(transaction, { ...policy, estimatedLamports: '10001' }), /budget/);
  assert.throws(() => new RemoteTransactionSigner({ url: 'http://signer.example.test', publicKey: payer.publicKey.toBase58() }), /HTTPS/);
});
