import { createHash, createPublicKey, verify } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js';
import type { Cluster } from './contracts.js';

export interface SigningPolicy {
  jobId: string;
  operation: 'create' | 'reward';
  cluster: Cluster;
  expectedGenesisHash: string;
  payer: string;
  maxLamports: string;
  estimatedLamports: string;
  allowedPrograms: string[];
  mint?: string;
  recipient?: string;
  amount?: string;
}

export interface TransactionSigner {
  readonly publicKey: PublicKey;
  readonly kind: 'local' | 'remote';
  sign(transaction: VersionedTransaction, policy: SigningPolicy): Promise<VersionedTransaction>;
}

export function assertSigningPolicy(transaction: VersionedTransaction, policy: SigningPolicy): void {
  if (transaction.message.staticAccountKeys[0]?.toBase58() !== policy.payer) throw new Error('Signer fee payer mismatch');
  if (!/^\d+$/.test(policy.maxLamports) || !/^\d+$/.test(policy.estimatedLamports)
    || BigInt(policy.estimatedLamports) > BigInt(policy.maxLamports)) throw new Error('Signing budget exceeded');
  if (transaction.message.addressTableLookups.length) throw new Error('Address lookup tables are not permitted by this signer');
  for (const instruction of transaction.message.compiledInstructions) {
    const program = transaction.message.staticAccountKeys[instruction.programIdIndex]?.toBase58();
    if (!program || !policy.allowedPrograms.includes(program)) throw new Error('Transaction contains a non-allowlisted program');
  }
}

/** Verify every required Ed25519 signature without trusting an RPC or signing service. */
export function verifyTransactionSignatures(transaction: VersionedTransaction): void {
  const message = transaction.message.serialize();
  for (let i = 0; i < transaction.message.header.numRequiredSignatures; i++) {
    const signature = transaction.signatures[i];
    const key = transaction.message.staticAccountKeys[i];
    if (!signature || signature.length !== 64 || !key) throw new Error('Transaction signature missing');
    const publicKey = createPublicKey({
      key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), key.toBuffer()]),
      format: 'der', type: 'spki',
    });
    if (!verify(null, message, publicKey, signature)) throw new Error('Invalid transaction signature');
  }
}

export class LocalTransactionSigner implements TransactionSigner {
  readonly kind = 'local' as const;
  readonly publicKey: PublicKey;
  constructor(private readonly keypair: Keypair, private readonly cluster: Cluster) {
    if (cluster === 'mainnet-beta') throw new Error('Local key signing is disabled on mainnet');
    this.publicKey = keypair.publicKey;
  }
  async sign(transaction: VersionedTransaction, policy: SigningPolicy): Promise<VersionedTransaction> {
    if (policy.cluster !== this.cluster || policy.cluster === 'mainnet-beta') throw new Error('Local signer cluster mismatch');
    if (policy.payer !== this.publicKey.toBase58()) throw new Error('Signer public key mismatch');
    assertSigningPolicy(transaction, policy);
    transaction.sign([this.keypair]);
    verifyTransactionSignatures(transaction);
    return transaction;
  }
}

export interface RemoteSignerOptions {
  url: string;
  publicKey: string;
  authToken?: string;
  allowedOrigins?: string[];
  fetch?: typeof globalThis.fetch;
}

/** A policy-enforcing signing service must independently decode and approve the complete message. */
export class RemoteTransactionSigner implements TransactionSigner {
  readonly kind = 'remote' as const;
  readonly publicKey: PublicKey;
  private readonly url: URL;
  private readonly request: typeof globalThis.fetch;
  constructor(private readonly options: RemoteSignerOptions) {
    this.url = new URL(options.url);
    if (this.url.protocol !== 'https:' || this.url.username || this.url.password || this.url.hash)
      throw new Error('Remote signer requires an HTTPS URL without credentials or fragments');
    if (options.allowedOrigins && !options.allowedOrigins.includes(this.url.origin)) throw new Error('Remote signer origin is not allowlisted');
    this.publicKey = new PublicKey(options.publicKey);
    this.request = options.fetch ?? globalThis.fetch;
  }
  async sign(transaction: VersionedTransaction, policy: SigningPolicy): Promise<VersionedTransaction> {
    if (policy.payer !== this.publicKey.toBase58()) throw new Error('Signer public key mismatch');
    assertSigningPolicy(transaction, policy);
    const expectedMessage = Buffer.from(transaction.message.serialize());
    const messageSha256 = createHash('sha256').update(expectedMessage).digest('hex');
    const response = await this.request(this.url, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15_000),
      headers: { 'content-type': 'application/json', ...(this.options.authToken ? { authorization: `Bearer ${this.options.authToken}` } : {}) },
      body: JSON.stringify({ version: 1, messageSha256, transactionBase64: Buffer.from(transaction.serialize()).toString('base64'), policy }),
    });
    if (!response.ok) throw new Error(`Remote signer rejected request (${response.status})`);
    const body = await response.json() as { transactionBase64?: unknown; messageSha256?: unknown };
    if (typeof body.transactionBase64 !== 'string' || body.transactionBase64.length > 4096 || body.messageSha256 !== messageSha256)
      throw new Error('Remote signer returned an invalid response');
    const signed = VersionedTransaction.deserialize(Buffer.from(body.transactionBase64, 'base64'));
    if (!Buffer.from(signed.message.serialize()).equals(expectedMessage)) throw new Error('Remote signer changed the transaction message');
    verifyTransactionSignatures(signed);
    return signed;
  }
}

export async function signerFromEnvironment(cluster: Cluster, env: NodeJS.ProcessEnv = process.env): Promise<TransactionSigner> {
  if (env.TOKENIZATION_SIGNER_URL && env.TOKENIZATION_SIGNER_PUBLIC_KEY) {
    return new RemoteTransactionSigner({
      url: env.TOKENIZATION_SIGNER_URL, publicKey: env.TOKENIZATION_SIGNER_PUBLIC_KEY,
      authToken: env.TOKENIZATION_SIGNER_AUTH_TOKEN,
      allowedOrigins: (env.TOKENIZATION_SIGNER_ALLOWED_ORIGINS?.trim() || new URL(env.TOKENIZATION_SIGNER_URL).origin).split(',').map(x => x.trim()),
    });
  }
  if (cluster === 'mainnet-beta') throw new Error('Mainnet requires a configured external HTTPS policy signer');
  const path = env.TOKENIZATION_LOCAL_KEYPAIR_PATH;
  if (!path) throw new Error('No tokenization signer configured');
  const secret: unknown = JSON.parse(await readFile(path, 'utf8'));
  if (!Array.isArray(secret) || secret.length !== 64 || secret.some(x => !Number.isInteger(x) || x < 0 || x > 255))
    throw new Error('Local keypair must contain exactly 64 byte values');
  return new LocalTransactionSigner(Keypair.fromSecretKey(Uint8Array.from(secret)), cluster);
}
