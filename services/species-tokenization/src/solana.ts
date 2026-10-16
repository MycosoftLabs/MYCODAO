import { createHash } from 'node:crypto';
import bs58 from 'bs58';
import {
  ComputeBudgetProgram, Connection, Keypair, PublicKey, SystemInstruction, SystemProgram,
  TransactionInstruction, TransactionMessage, VersionedTransaction,
} from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID, AuthorityType, ExtensionType, LENGTH_SIZE, TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID, TYPE_SIZE, createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMetadataPointerInstruction, createInitializeMint2Instruction,
  createMintToCheckedInstruction, createSetAuthorityInstruction, createTransferCheckedInstruction,
  getAccountLen, getAssociatedTokenAddressSync, getExtensionData, getExtensionTypes, getMintLen,
  unpackAccount, unpackMint,
} from '@solana/spl-token';
import {
  createInitializeInstruction, createUpdateAuthorityInstruction, createUpdateFieldInstruction,
  pack, unpack as unpackMetadata,
} from '@solana/spl-token-metadata';
import type {
  ChainDriver, ChainOutcome, ChainPlan, Cluster, CreateRequest, FundingReceipt, MintInfo, TransferRequest,
} from './contracts.js';
import { assertSigningPolicy, verifyTransactionSignatures, type SigningPolicy, type TransactionSigner } from './signer.js';

export const GENESIS_HASHES = {
  devnet: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
  'mainnet-beta': '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
} as const;
export const PUMP_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
const SAFE_MINT_EXTENSIONS = new Set<ExtensionType>([ExtensionType.MetadataPointer, ExtensionType.TokenMetadata]);
const SAFE_ACCOUNT_EXTENSIONS = new Set<ExtensionType>([ExtensionType.ImmutableOwner]);
const MAX_U64 = (1n << 64n) - 1n;

function integer(value: string, label: string, positive = false): bigint {
  if (!/^\d+$/.test(value)) throw new Error(`${label} must be integer base units`);
  const result = BigInt(value);
  if (result > MAX_U64 || (positive && result === 0n)) throw new Error(`${label} is outside the permitted range`);
  return result;
}
function safeNumber(value: number, label: string): bigint {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} is not a safe integer`);
  return BigInt(value);
}
function tokenProgram(address: string): PublicKey {
  const key = new PublicKey(address);
  if (!key.equals(TOKEN_PROGRAM_ID) && !key.equals(TOKEN_2022_PROGRAM_ID)) throw new Error('Unsupported token program');
  return key;
}
function mintExtensions(info: ReturnType<typeof unpackMint>): ExtensionType[] {
  const extensions = getExtensionTypes(info.tlvData);
  if (extensions.some(type => !SAFE_MINT_EXTENSIONS.has(type)))
    throw new Error('Mint has unsupported transfer, fee, delegate, confidential, or mutable-balance extensions');
  return extensions;
}

export interface SolanaDriverOptions {
  cluster: Cluster;
  rpcUrl?: string;
  expectedGenesisHash?: string;
  signer: TransactionSigner;
  distributionWallet?: string;
  /** Off by default. Enabling does not replace the external signer's independent spending policy. */
  allowMainnetBroadcast?: boolean;
  connection?: Connection;
}

/** No RPC send occurs during construction, funding checks, inspection, or prepare. */
export class SolanaChainDriver implements ChainDriver {
  readonly cluster: Cluster;
  readonly payer: string;
  readonly treasury: string;
  private readonly connection: Connection;
  private readonly payerKey: PublicKey;
  private readonly treasuryKey: PublicKey;
  private readonly genesisHash: string;
  constructor(private readonly options: SolanaDriverOptions) {
    this.cluster = options.cluster;
    this.payerKey = options.signer.publicKey;
    this.payer = this.payerKey.toBase58();
    this.treasuryKey = new PublicKey(options.distributionWallet ?? this.payer);
    this.treasury = this.treasuryKey.toBase58();
    if (!this.treasuryKey.equals(this.payerKey)) throw new Error('Distribution wallet must be controlled by the configured signer; keep the treasury multisig separate');
    if (this.cluster === 'mainnet-beta' && options.signer.kind !== 'remote') throw new Error('Mainnet requires an external signer');
    this.genesisHash = options.expectedGenesisHash ?? (this.cluster === 'localnet' ? '' : GENESIS_HASHES[this.cluster]);
    if (!this.genesisHash) throw new Error('Localnet requires an explicit expected genesis hash');
    if (this.cluster !== 'localnet' && this.genesisHash !== GENESIS_HASHES[this.cluster]) throw new Error('Expected genesis hash conflicts with the selected cluster');
    this.connection = options.connection ?? new Connection(options.rpcUrl ?? (this.cluster === 'localnet' ? 'http://127.0.0.1:8899' : `https://api.${this.cluster}.solana.com`), 'confirmed');
  }
  private async checkCluster(): Promise<void> {
    if (await this.connection.getGenesisHash() !== this.genesisHash) throw new Error('RPC genesis hash does not match configured cluster');
  }
  private checkExecutionEnabled(): void {
    if (this.cluster === 'mainnet-beta' && !this.options.allowMainnetBroadcast) throw new Error('Mainnet execution has not been enabled');
  }
  private programs(route?: string): string[] {
    return [SystemProgram.programId, ComputeBudgetProgram.programId, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
      ...(route === 'pump_direct' ? [PUMP_PROGRAM_ID] : [])].map(key => key.toBase58());
  }
  private policy(jobId: string, operation: SigningPolicy['operation'], maxLamports: string, estimatedLamports: string, extra: Partial<SigningPolicy> = {}): SigningPolicy {
    return { jobId, operation, cluster: this.cluster, expectedGenesisHash: this.genesisHash,
      payer: this.payer, maxLamports, estimatedLamports, allowedPrograms: this.programs(), ...extra };
  }
  async verifyFunding(signature: string, from: string): Promise<FundingReceipt> {
    await this.checkCluster();
    const source = new PublicKey(from).toBase58();
    if (source === this.payer) throw new Error('Funding source and destination must differ');
    const transaction = await this.connection.getParsedTransaction(signature, { commitment: 'finalized', maxSupportedTransactionVersion: 0 });
    if (!transaction || !transaction.meta || transaction.meta.err) throw new Error('Funding transaction is unavailable, not finalized, or failed');
    if (transaction.transaction.signatures[0] !== signature) throw new Error('Funding transaction signature mismatch');
    const accounts = transaction.transaction.message.accountKeys;
    if (!accounts.some(key => key.pubkey.toBase58() === source && key.signer)) throw new Error('Funding source did not sign');
    // Only directly signed SystemProgram transfers are accepted. CPI transfers, swaps, balance
    // changes, and unrelated token receipts cannot authorize a new issuance allocation.
    let lamports = 0n;
    for (const instruction of transaction.transaction.message.instructions) {
      if (!('parsed' in instruction) || !instruction.programId.equals(SystemProgram.programId)) continue;
      const parsed = instruction.parsed;
      if (parsed.type !== 'transfer' || parsed.info.source !== source || parsed.info.destination !== this.payer) continue;
      const amount: unknown = parsed.info.lamports;
      lamports += typeof amount === 'number' ? safeNumber(amount, 'Funding lamports') : integer(String(amount), 'Funding lamports');
    }
    if (lamports === 0n) throw new Error('No matching funding transfer to the launch wallet');
    const targetIndex = accounts.findIndex(key => key.pubkey.equals(this.payerKey));
    if (targetIndex < 0 || safeNumber(transaction.meta.postBalances[targetIndex], 'Funding post balance')
      - safeNumber(transaction.meta.preBalances[targetIndex], 'Funding pre balance') < lamports)
      throw new Error('Funding transaction does not retain the claimed net credit');
    return { signature, cluster: this.cluster, from: source, to: this.payer, lamports: lamports.toString() };
  }
  async inspectMint(address: string): Promise<MintInfo> {
    await this.checkCluster();
    const mint = new PublicKey(address);
    const account = await this.connection.getAccountInfo(mint, 'finalized');
    if (!account || account.executable) throw new Error('Mint account unavailable');
    const program = tokenProgram(account.owner.toBase58());
    const decoded = unpackMint(mint, account, program);
    if (!decoded.isInitialized) throw new Error('Mint is not initialized');
    const extensions = getExtensionTypes(decoded.tlvData);
    const data = getExtensionData(ExtensionType.TokenMetadata, decoded.tlvData);
    const metadata = data ? unpackMetadata(data) : null;
    return {
      mint: address, decimals: decoded.decimals, program: program.toBase58(), supply: decoded.supply.toString(),
      mintAuthority: decoded.mintAuthority?.toBase58() ?? null, freezeAuthority: decoded.freezeAuthority?.toBase58() ?? null,
      extensions: extensions.map(type => ExtensionType[type] ?? `Unknown_${type}`),
      ...(metadata ? { metadataUri: metadata.uri, metadataSha256: metadata.additionalMetadata.find(([key]) => key === 'metadata_sha256')?.[1] } : {}),
    };
  }
  async verifyLaunch(mint: string, signature: string): Promise<void> {
    await this.checkCluster();
    const key = new PublicKey(mint);
    const transaction = await this.connection.getParsedTransaction(signature, { commitment: 'finalized', maxSupportedTransactionVersion: 0 });
    if (!transaction || !transaction.meta || transaction.meta.err || transaction.transaction.signatures[0] !== signature)
      throw new Error('Launch transaction is unavailable, not finalized, or failed');
    const instructions = [...transaction.transaction.message.instructions,
      ...(transaction.meta.innerInstructions ?? []).flatMap(group => group.instructions)];
    const matchingInstruction = instructions.some(instruction => {
      if ('parsed' in instruction) {
        return (instruction.programId.equals(TOKEN_PROGRAM_ID) || instruction.programId.equals(TOKEN_2022_PROGRAM_ID))
          && ['initializeMint', 'initializeMint2'].includes(instruction.parsed.type) && instruction.parsed.info.mint === mint;
      }
      const create = createHash('sha256').update('global:create').digest().subarray(0, 8);
      const createV2 = createHash('sha256').update('global:create_v2').digest().subarray(0, 8);
      const data = Buffer.from(bs58.decode(instruction.data));
      return instruction.programId.equals(PUMP_PROGRAM_ID) && instruction.accounts[0]?.equals(key)
        && (data.subarray(0, 8).equals(create) || data.subarray(0, 8).equals(createV2));
    });
    if (!matchingInstruction) throw new Error('Launch transaction does not initialize the specified mint');
    await this.inspectMint(mint);
  }
  async inventory(address: string): Promise<string> {
    await this.checkCluster();
    const mint = new PublicKey(address);
    const info = await this.inspectMint(address);
    const program = tokenProgram(info.program);
    const ata = getAssociatedTokenAddressSync(mint, this.treasuryKey, false, program);
    const account = await this.connection.getAccountInfo(ata, 'finalized');
    if (!account) return '0';
    const decoded = unpackAccount(ata, account, program);
    if (!decoded.owner.equals(this.treasuryKey) || !decoded.mint.equals(mint) || !decoded.isInitialized || decoded.isFrozen)
      throw new Error('Reward inventory account is not spendable by the distribution signer');
    return decoded.amount.toString();
  }
  async prepareCreate(input: CreateRequest): Promise<ChainPlan> {
    this.checkExecutionEnabled();
    await this.checkCluster();
    const supply = integer(input.supply, 'Supply', true);
    integer(input.maxLamports, 'Creation budget', true);
    if (!Number.isInteger(input.decimals) || input.decimals < 0 || input.decimals > 9) throw new Error('Decimals must be an integer from 0 to 9');
    if (!/^[a-f0-9]{64}$/.test(input.metadataSha256) || !/^(https:\/\/|ipfs:\/\/|ar:\/\/)/.test(input.metadataUri)) throw new Error('Creation requires a metadata URI and SHA-256 hash');
    if (!input.name.trim() || !input.symbol.trim() || input.name.length > 100 || input.symbol.length > 13 || input.metadataUri.length > 200)
      throw new Error('Token name, symbol, or metadata URI is invalid');
    const mint = Keypair.generate();
    let instructions: TransactionInstruction[];
    let rent: bigint | null;
    if (input.route === 'pump_direct') {
      if (input.decimals !== 6 || supply !== 1_000_000_000_000_000n || input.name.length > 32)
        throw new Error('Pump uses a fixed 1 billion supply, 6 decimals, and names up to 32 characters');
      const { PUMP_SDK } = await import('@pump-fun/pump-sdk');
      instructions = [ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }), await PUMP_SDK.createV2Instruction({
        mint: mint.publicKey, name: input.name, symbol: input.symbol, uri: input.metadataUri,
        creator: this.treasuryKey, user: this.payerKey, mayhemMode: false, holderReward: false,
      })];
      // Pump account rent is owned by the protocol and varies with its deployed layout.
      // The simulation's payer debit is checked below; this route never includes a buy.
      rent = null;
    } else if (input.route === 'spl_reward') {
      const metadata = { mint: mint.publicKey, updateAuthority: this.payerKey, name: input.name, symbol: input.symbol,
        uri: input.metadataUri, additionalMetadata: [['metadata_sha256', input.metadataSha256] as const] };
      const mintSize = getMintLen([ExtensionType.MetadataPointer]);
      const finalSize = mintSize + TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;
      const mintRent = await this.connection.getMinimumBalanceForRentExemption(finalSize, 'confirmed');
      const ataRent = await this.connection.getMinimumBalanceForRentExemption(getAccountLen([ExtensionType.ImmutableOwner]), 'confirmed');
      rent = safeNumber(mintRent, 'Mint rent') + safeNumber(ataRent, 'ATA rent');
      const destination = getAssociatedTokenAddressSync(mint.publicKey, this.treasuryKey, false, TOKEN_2022_PROGRAM_ID);
      instructions = [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
        SystemProgram.createAccount({ fromPubkey: this.payerKey, newAccountPubkey: mint.publicKey, space: mintSize, lamports: mintRent, programId: TOKEN_2022_PROGRAM_ID }),
        createInitializeMetadataPointerInstruction(mint.publicKey, null, mint.publicKey, TOKEN_2022_PROGRAM_ID),
        createInitializeMint2Instruction(mint.publicKey, input.decimals, this.payerKey, null, TOKEN_2022_PROGRAM_ID),
        createInitializeInstruction({ programId: TOKEN_2022_PROGRAM_ID, mint: mint.publicKey, metadata: mint.publicKey,
          mintAuthority: this.payerKey, updateAuthority: this.payerKey, name: input.name, symbol: input.symbol, uri: input.metadataUri }),
        createUpdateFieldInstruction({ programId: TOKEN_2022_PROGRAM_ID, metadata: mint.publicKey,
          updateAuthority: this.payerKey, field: 'metadata_sha256', value: input.metadataSha256 }),
        createUpdateAuthorityInstruction({ programId: TOKEN_2022_PROGRAM_ID, metadata: mint.publicKey,
          oldAuthority: this.payerKey, newAuthority: null }),
        createAssociatedTokenAccountIdempotentInstruction(this.payerKey, destination, this.treasuryKey, mint.publicKey, TOKEN_2022_PROGRAM_ID),
        createMintToCheckedInstruction(mint.publicKey, destination, this.payerKey, supply, input.decimals, [], TOKEN_2022_PROGRAM_ID),
        createSetAuthorityInstruction(mint.publicKey, this.payerKey, AuthorityType.MintTokens, null, [], TOKEN_2022_PROGRAM_ID),
      ];
    } else throw new Error('Unsupported creation route');
    return this.prepare(instructions, [mint], this.policy(input.jobId, 'create', input.maxLamports, '0', {
      mint: mint.publicKey.toBase58(), amount: input.supply, allowedPrograms: this.programs(input.route),
    }), rent);
  }
  async prepareTransfer(input: TransferRequest): Promise<ChainPlan> {
    this.checkExecutionEnabled();
    await this.checkCluster();
    const amount = integer(input.amount, 'Reward amount', true);
    integer(input.maxLamports, 'Reward transaction budget', true);
    const mint = new PublicKey(input.mint);
    const recipient = new PublicKey(input.recipient);
    if (!PublicKey.isOnCurve(recipient.toBytes())) throw new Error('Reward recipient must be a wallet public key');
    if (recipient.equals(this.treasuryKey)) throw new Error('Reward recipient cannot be the distribution wallet');
    const program = tokenProgram(input.program);
    const mintAccount = await this.connection.getAccountInfo(mint, 'confirmed');
    const decodedMint = unpackMint(mint, mintAccount, program);
    if (!decodedMint.isInitialized || input.decimals !== decodedMint.decimals) throw new Error('Reward mint decimals or initialization mismatch');
    mintExtensions(decodedMint);
    const source = getAssociatedTokenAddressSync(mint, this.treasuryKey, false, program);
    const destination = getAssociatedTokenAddressSync(mint, recipient, false, program);
    const sourceAccount = unpackAccount(source, await this.connection.getAccountInfo(source, 'confirmed'), program);
    if (!sourceAccount.mint.equals(mint) || !sourceAccount.owner.equals(this.treasuryKey) || !sourceAccount.isInitialized || sourceAccount.isFrozen
      || sourceAccount.amount < amount || getExtensionTypes(sourceAccount.tlvData).some(type => !SAFE_ACCOUNT_EXTENSIONS.has(type)))
      throw new Error('Insufficient or unsupported reward inventory');
    const destinationInfo = await this.connection.getAccountInfo(destination, 'confirmed');
    if (destinationInfo) {
      const account = unpackAccount(destination, destinationInfo, program);
      if (!account.mint.equals(mint) || !account.owner.equals(recipient) || !account.isInitialized || account.isFrozen
        || getExtensionTypes(account.tlvData).some(type => !SAFE_ACCOUNT_EXTENSIONS.has(type))) throw new Error('Recipient token account is unsupported or frozen');
    }
    const rent = destinationInfo ? 0n : safeNumber(await this.connection.getMinimumBalanceForRentExemption(
      program.equals(TOKEN_2022_PROGRAM_ID) ? getAccountLen([ExtensionType.ImmutableOwner]) : 165, 'confirmed'), 'Recipient ATA rent');
    return this.prepare([
      createAssociatedTokenAccountIdempotentInstruction(this.payerKey, destination, recipient, mint, program),
      createTransferCheckedInstruction(source, mint, destination, this.treasuryKey, amount, input.decimals, [], program),
    ], [], this.policy(input.jobId, 'reward', input.maxLamports, '0', { mint: input.mint, recipient: input.recipient, amount: input.amount }), rent);
  }
  private async prepare(instructions: TransactionInstruction[], mintSigners: Keypair[], policy: SigningPolicy, rent: bigint | null): Promise<ChainPlan> {
    const lifetime = await this.connection.getLatestBlockhash('confirmed');
    const message = new TransactionMessage({ payerKey: this.payerKey, recentBlockhash: lifetime.blockhash, instructions }).compileToV0Message();
    const transaction = new VersionedTransaction(message);
    transaction.sign(mintSigners);
    const fee = await this.connection.getFeeForMessage(message, 'confirmed');
    if (fee.value === null) throw new Error('Transaction fee estimate unavailable');
    const estimatedFee = safeNumber(fee.value, 'Transaction fee');
    const payerBefore = rent === null ? safeNumber(await this.connection.getBalance(this.payerKey, 'confirmed'), 'Payer balance') : null;
    const simulation = await this.connection.simulateTransaction(transaction, { commitment: 'confirmed', sigVerify: false,
      accounts: { encoding: 'base64', addresses: [this.payer] } });
    if (simulation.value.err) throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
    let estimated: bigint;
    if (rent === null) {
      const payerAfter = simulation.value.accounts?.[0];
      if (payerBefore === null || !payerAfter) throw new Error('Pump simulation did not report payer account');
      const debit = payerBefore - safeNumber(payerAfter.lamports, 'Simulated payer balance');
      if (debit < 0n) throw new Error('Payer balance changed during Pump simulation; retry preparation');
      // Simulation normally includes the transaction fee. Add it conservatively because RPC
      // implementations may return account balances before fee charging.
      estimated = debit + estimatedFee;
    } else estimated = rent + estimatedFee;
    const boundPolicy = { ...policy, estimatedLamports: estimated.toString() };
    assertSigningPolicy(transaction, boundPolicy);
    const signed = await this.options.signer.sign(transaction, boundPolicy);
    if (!Buffer.from(signed.message.serialize()).equals(Buffer.from(message.serialize()))) throw new Error('Signer changed the planned transaction');
    verifyTransactionSignatures(signed);
    const wire = signed.serialize();
    if (wire.length > 1232) throw new Error('Transaction exceeds the Solana packet limit; shorten name or URI');
    return { wireBase64: Buffer.from(wire).toString('base64'), signature: bs58.encode(signed.signatures[0]),
      blockhash: lifetime.blockhash, lastValidBlockHeight: lifetime.lastValidBlockHeight,
      mint: policy.mint, estimatedLamports: estimated.toString() };
  }
  private decodePlan(plan: ChainPlan): VersionedTransaction {
    const bytes = Buffer.from(plan.wireBase64, 'base64');
    if (bytes.length > 1232) throw new Error('Transaction exceeds packet limit');
    const transaction = VersionedTransaction.deserialize(bytes);
    if (transaction.message.recentBlockhash !== plan.blockhash || transaction.message.staticAccountKeys[0]?.toBase58() !== this.payer
      || bs58.encode(transaction.signatures[0]) !== plan.signature) throw new Error('Stored plan transaction binding mismatch');
    verifyTransactionSignatures(transaction);
    assertSigningPolicy(transaction, this.policy('stored-plan', 'reward', plan.estimatedLamports, plan.estimatedLamports,
      { allowedPrograms: this.programs('pump_direct') }));
    return transaction;
  }
  async broadcast(plan: ChainPlan): Promise<void> {
    await this.checkCluster();
    if (this.cluster === 'mainnet-beta' && !this.options.allowMainnetBroadcast) throw new Error('Mainnet broadcast has not been enabled');
    this.decodePlan(plan);
    if (await this.connection.getBlockHeight('confirmed') > plan.lastValidBlockHeight) throw new Error('Prepared transaction has expired; reconcile before rebuilding');
    const signature = await this.connection.sendRawTransaction(Buffer.from(plan.wireBase64, 'base64'), { skipPreflight: false, preflightCommitment: 'confirmed', maxRetries: 0 });
    if (signature !== plan.signature) throw new Error('RPC returned an unexpected transaction signature');
  }
  async reconcile(plan: ChainPlan): Promise<ChainOutcome> {
    try {
      await this.checkCluster();
      const plannedTransaction = this.decodePlan(plan);
      const statuses = await this.connection.getSignatureStatuses([plan.signature], { searchTransactionHistory: true });
      const status = statuses.value[0];
      if (status?.confirmationStatus === 'finalized') {
        const receipt = await this.connection.getTransaction(plan.signature, { commitment: 'finalized', maxSupportedTransactionVersion: 0 });
        if (!receipt?.meta || receipt.transaction.signatures[0] !== plan.signature
          || !Buffer.from(receipt.transaction.message.serialize()).equals(Buffer.from(plannedTransaction.message.serialize())))
          return { state: 'unknown', error: 'Finalized transaction receipt unavailable or inconsistent' };
        if (Boolean(receipt.meta.err) !== Boolean(status.err)) return { state: 'unknown', error: 'Finalized status and receipt disagree' };
        const payerBefore = safeNumber(receipt.meta.preBalances[0], 'Receipt payer pre balance');
        const payerAfter = safeNumber(receipt.meta.postBalances[0], 'Receipt payer post balance');
        if (payerAfter > payerBefore) return { state: 'unknown', error: 'Unexpected net credit in tokenization transaction' };
        const actualLamports = (payerBefore - payerAfter).toString();
        return receipt.meta.err ? { state: 'failed', actualLamports, error: JSON.stringify(receipt.meta.err) }
          : { state: 'finalized', actualLamports };
      }
      if (status) return { state: 'pending' };
      if (await this.connection.getBlockHeight('finalized') > plan.lastValidBlockHeight) {
        // A null RPC history result can also mean a pruned or temporarily unavailable receipt.
        // Creation can prove non-execution from the mint's absence after the lifetime ends;
        // a transfer has no such unique account, so do not authorize a replacement payout.
        const decoded = this.decodePlan(plan);
        const creation = decoded.message.compiledInstructions.some(instruction => {
          const program = decoded.message.staticAccountKeys[instruction.programIdIndex];
          if (!program.equals(SystemProgram.programId)) return false;
          const expanded = TransactionMessage.decompile(decoded.message).instructions.find(ix =>
            ix.programId.equals(SystemProgram.programId) && Buffer.from(ix.data).equals(Buffer.from(instruction.data)));
          return expanded && SystemInstruction.decodeInstructionType(expanded) === 'Create';
        }) || decoded.message.compiledInstructions.some(instruction =>
          decoded.message.staticAccountKeys[instruction.programIdIndex].equals(PUMP_PROGRAM_ID));
        if (creation && plan.mint && !(await this.connection.getAccountInfo(new PublicKey(plan.mint), 'finalized')))
          return { state: 'expired' };
        return { state: 'unknown', error: 'Transaction lifetime expired without a receipt; reconcile historical execution before replacing it' };
      }
      return { state: 'pending' };
    } catch (error) { return { state: 'unknown', error: error instanceof Error ? error.message : 'RPC reconciliation unavailable' }; }
  }
}
