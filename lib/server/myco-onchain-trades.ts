import "server-only";
import { solanaRpc } from "@/lib/adapters/solana-rpc";

const WSOL_MINT = "So11111111111111111111111111111111111111112";
/** Kept low so the public mainnet RPC (fallback when no paid RPC is configured) does not rate-limit us. */
const TX_CONCURRENCY = 4;

export interface OnchainSwap {
  tx_hash: string;
  at: string;
  side: "buy" | "sell";
  myco_amount: number;
  sol_amount: number;
  price_sol: number;
  wallet: string | null;
}

interface TokenBalance {
  mint?: string;
  owner?: string;
  uiTokenAmount?: { uiAmount?: number | null; amount?: string; decimals?: number };
}

interface ParsedTx {
  blockTime?: number | null;
  meta?: { err?: unknown; preTokenBalances?: TokenBalance[]; postTokenBalances?: TokenBalance[] } | null;
  transaction?: { message?: { accountKeys?: Array<{ pubkey?: string; signer?: boolean } | string> } };
}

function ui(b?: TokenBalance): number {
  const t = b?.uiTokenAmount;
  if (!t) return 0;
  if (typeof t.uiAmount === "number") return t.uiAmount;
  return t.amount && t.decimals != null ? Number(t.amount) / 10 ** t.decimals : 0;
}

/** Net change of the pool's vault balance for one mint, from the pool's point of view. */
function poolDelta(tx: ParsedTx, pool: string, mint: string): number {
  const sum = (list?: TokenBalance[]) =>
    (list ?? []).filter((b) => b.mint === mint && b.owner === pool).reduce((acc, b) => acc + ui(b), 0);
  return sum(tx.meta?.postTokenBalances) - sum(tx.meta?.preTokenBalances);
}

function feePayer(tx: ParsedTx): string | null {
  const first = tx.transaction?.message?.accountKeys?.[0];
  if (!first) return null;
  return typeof first === "string" ? first : first.pubkey ?? null;
}

function toSwap(signature: string, tx: ParsedTx | null, pool: string, mycoMint: string): OnchainSwap | null {
  if (!tx || tx.meta?.err || !tx.blockTime) return null;
  const myco = poolDelta(tx, pool, mycoMint);
  const sol = poolDelta(tx, pool, WSOL_MINT);
  if (!myco || !sol || Math.sign(myco) === Math.sign(sol)) return null;
  const mycoAmount = Math.abs(myco);
  const solAmount = Math.abs(sol);
  return {
    tx_hash: signature,
    at: new Date(tx.blockTime * 1000).toISOString(),
    side: myco < 0 ? "buy" : "sell",
    myco_amount: mycoAmount,
    sol_amount: solAmount,
    price_sol: solAmount / mycoAmount,
    wallet: feePayer(tx),
  };
}

async function mapLimited<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    })
  );
  return out;
}

/**
 * Real MYCO / SOL swaps read from the pool account's on-chain history, newest first.
 * Liquidity adds and removals are skipped because both vaults move the same way.
 */
export async function fetchOnchainMycoSwaps(
  pool: string,
  mycoMint: string,
  limit = 60,
  maxSignatures = 400
): Promise<OnchainSwap[]> {
  const signatures: Array<{ signature: string; err: unknown }> = [];
  let before: string | undefined;
  while (signatures.length < maxSignatures) {
    const page =
      (await solanaRpc<Array<{ signature: string; err: unknown }>>("getSignaturesForAddress", [
        pool,
        { limit: Math.min(100, maxSignatures - signatures.length), ...(before ? { before } : {}) },
      ])) ?? [];
    signatures.push(...page);
    if (page.length < 100) break;
    before = page[page.length - 1].signature;
  }
  const ok = signatures.filter((s) => !s.err).map((s) => s.signature);
  const txs = await mapLimited(ok, TX_CONCURRENCY, (sig) =>
    solanaRpc<ParsedTx>("getTransaction", [
      sig,
      { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "confirmed" },
    ])
  );
  return ok
    .map((sig, i) => toSwap(sig, txs[i], pool, mycoMint))
    .filter((s): s is OnchainSwap => Boolean(s))
    .slice(0, limit);
}
