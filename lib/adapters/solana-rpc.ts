/**
 * Minimal Solana JSON-RPC for treasury token balances (server-side only).
 */

const DEFAULT_RPC = "https://api.mainnet-beta.solana.com";
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

export type SolanaTokenBalance = {
  mint: string;
  amount: string;
  decimals: number;
  uiAmount: number | null;
};

function rpcUrl(): string {
  return (
    process.env.SOLANA_RPC_URL?.trim() ||
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() ||
    DEFAULT_RPC
  );
}

async function solanaRpc<T>(method: string, params: unknown[]): Promise<T | null> {
  try {
    const res = await fetch(rpcUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { result?: T; error?: { message?: string } };
    if (body.error) {
      console.error("solana rpc:", method, body.error.message);
      return null;
    }
    return body.result ?? null;
  } catch (e) {
    console.error("solana rpc:", method, e);
    return null;
  }
}

/** SPL token accounts owned by a treasury wallet (parsed). */
export async function fetchOwnerSplBalances(owner: string): Promise<SolanaTokenBalance[]> {
  const pk = owner.trim();
  if (!pk) return [];

  const result = await solanaRpc<{
    value?: Array<{
      account?: {
        data?: {
          parsed?: {
            info?: {
              mint?: string;
              tokenAmount?: {
                amount?: string;
                decimals?: number;
                uiAmount?: number | null;
              };
            };
          };
        };
      };
    }>;
  }>("getTokenAccountsByOwner", [
    pk,
    { programId: TOKEN_PROGRAM },
    { encoding: "jsonParsed" },
  ]);

  if (!result?.value?.length) return [];

  const rows: SolanaTokenBalance[] = [];
  for (const row of result.value) {
    const info = row.account?.data?.parsed?.info;
    const mint = info?.mint?.trim();
    const tokenAmount = info?.tokenAmount;
    if (!mint || !tokenAmount?.amount) continue;
    const ui = tokenAmount.uiAmount;
    if (ui === 0 || ui === null) {
      const raw = BigInt(tokenAmount.amount);
      if (raw === 0n) continue;
    }
    rows.push({
      mint,
      amount: tokenAmount.amount,
      decimals: tokenAmount.decimals ?? 0,
      uiAmount: tokenAmount.uiAmount ?? null,
    });
  }

  return rows.sort((a, b) => (b.uiAmount ?? 0) - (a.uiAmount ?? 0));
}
