import type { Connection } from "@solana/web3.js";
import { VersionedTransaction } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import type { StudioWhaleRow } from "../data/studioPresets";

const JUP_QUOTE_API = "https://quote-api.jup.ag/v6/quote";
const JUP_SWAP_API = "https://quote-api.jup.ag/v6/swap";

export interface SwapQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: string;
  marketInfos: unknown[];
}

export const getJupiterQuote = async (
  inputMint: string,
  outputMint: string,
  amount: number,
  slippage: number = 0.5
) => {
  try {
    const params = new URLSearchParams({
      inputMint,
      outputMint,
      amount: String(amount * 1e9),
      slippageBps: String(slippage * 100),
    });
    const res = await fetch(`${JUP_QUOTE_API}?${params}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("Jupiter Quote Error", e);
    return null;
  }
};

export const MATRIX_MINT =
  (import.meta.env.VITE_MYCO_SOLANA_MINT as string | undefined)?.trim() ||
  (import.meta.env.NEXT_PUBLIC_MYCO_SOLANA_MINT as string | undefined)?.trim() ||
  "EzYEwn4R5tNkNGw4K2a5a58MJFQESdf1r4UJrV7cpUF3";
export const SOL_MINT = "So11111111111111111111111111111111111111112";

/** MYCO SPL decimals (on-chain); used for display of Jupiter outAmount. */
export const MYCO_DECIMALS = 9;

export function formatTokenAmount(raw: string | number, decimals: number): string {
  const n = typeof raw === "string" ? Number(raw) : raw;
  if (!Number.isFinite(n)) return "—";
  const v = n / 10 ** decimals;
  if (v >= 1_000_000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (v >= 1) return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return v.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

export async function buildJupiterSwapTransaction(
  quote: SwapQuote,
  userPublicKey: string
): Promise<string | null> {
  try {
    const res = await fetch(JUP_SWAP_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: "auto",
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { swapTransaction?: string };
    return body.swapTransaction ?? null;
  } catch (e) {
    console.error("Jupiter swap build error", e);
    return null;
  }
}

/** Sign and send a Jupiter market swap (SOL → MYCO by default). */
export async function executeJupiterSwap(
  connection: Connection,
  wallet: WalletContextState,
  inputMint: string,
  outputMint: string,
  amountSol: number
): Promise<{ signature: string; quote: SwapQuote }> {
  if (!wallet.publicKey) throw new Error("Connect Phantom or Solflare to swap.");
  if (!wallet.signTransaction) throw new Error("Wallet cannot sign transactions.");

  const quote = await getJupiterQuote(inputMint, outputMint, amountSol);
  if (!quote) throw new Error("No Jupiter quote — try a smaller amount or retry.");

  const swapTxB64 = await buildJupiterSwapTransaction(quote, wallet.publicKey.toBase58());
  if (!swapTxB64) throw new Error("Jupiter could not build the swap transaction.");

  const tx = VersionedTransaction.deserialize(Buffer.from(swapTxB64, "base64"));
  const signed = await wallet.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
    maxRetries: 2,
  });

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed"
  );

  return { signature, quote };
}

/** On-chain whale ledger — empty until MAS/MINDEX whale index is wired. */
export const getWhaleActivity = async (): Promise<StudioWhaleRow[]> => [];
