import { STUDIO_WHALE_LEDGER, type StudioWhaleRow } from "../data/studioPresets";

const JUP_QUOTE_API = "https://quote-api.jup.ag/v6/quote";

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

export const MATRIX_MINT = "EzYEwn4R5tNkNGw4K2a5a58MJFQESdf1r4UJrV7cpUF3";
export const SOL_MINT = "So11111111111111111111111111111111111111112";

/** Live whale index when API exists; studio ledger rows until Codex wires MAS/MINDEX. */
export const getWhaleActivity = async (): Promise<StudioWhaleRow[]> => STUDIO_WHALE_LEDGER;
