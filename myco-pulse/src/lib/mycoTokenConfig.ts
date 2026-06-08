/** Client-side MYCO token identifiers — mirrors server env (MYCO_DEX_PAIR / MYCO_SOLANA_MINT). */

export const MYCO_SOLANA_MINT =
  (import.meta.env.VITE_MYCO_SOLANA_MINT as string | undefined)?.trim() ||
  (import.meta.env.NEXT_PUBLIC_MYCO_SOLANA_MINT as string | undefined)?.trim() ||
  "EzYEwn4R5tNkNGw4K2a5a58MJFQESdf1r4UJrV7cpUF3";

export const MYCO_DEX_PAIR =
  (import.meta.env.VITE_MYCO_DEX_PAIR as string | undefined)?.trim() ||
  (import.meta.env.NEXT_PUBLIC_MYCO_DEX_PAIR as string | undefined)?.trim() ||
  "FgCQoL7tcC1nkNazV5onEgWbm9UJ9nbzqo9rZCYm6Yi4";

const SOLSCAN_BASE =
  (import.meta.env.VITE_SOLANA_EXPLORER_BASE as string | undefined)?.trim() ||
  (import.meta.env.NEXT_PUBLIC_SOLANA_EXPLORER_BASE as string | undefined)?.trim() ||
  "https://solscan.io";

export function dexScreenerPairUrl(pair = MYCO_DEX_PAIR) {
  return `https://dexscreener.com/solana/${pair}`;
}

export function dexScreenerEmbedUrl(pair = MYCO_DEX_PAIR) {
  const params = new URLSearchParams({
    embed: "1",
    theme: "dark",
    chartTheme: "dark",
    chartType: "usd",
    interval: "15",
    trades: "1",
    chat: "1",
    tabs: "0",
    info: "0",
    chartLeftToolbar: "0",
    loadChartSettings: "0",
  });
  return `${dexScreenerPairUrl(pair)}?${params.toString()}`;
}

export function solscanTokenUrl(mint = MYCO_SOLANA_MINT) {
  return `${SOLSCAN_BASE.replace(/\/$/, "")}/token/${mint}`;
}

export function solscanPairUrl(pair = MYCO_DEX_PAIR) {
  return `${SOLSCAN_BASE.replace(/\/$/, "")}/account/${pair}`;
}

export function jupiterSwapUrl(mint = MYCO_SOLANA_MINT) {
  return `https://jup.ag/swap/SOL-${mint}`;
}
