/**
 * Live MYCO price from public DEX aggregators. DexScreener first; GeckoTerminal fallback when
 * DexScreener returns no pairs (common for thin-liquidity Solana tokens).
 */

export const MYCO_CANONICAL_SOLANA_MINT =
  process.env.MYCO_SOLANA_MINT?.trim() ||
  process.env.NEXT_PUBLIC_MYCO_SOLANA_MINT?.trim() ||
  "EzYEwn4R5tNkNGw4K2a5a58MJFQESdf1r4UJrV7cpUF3";

/** Primary Raydium/Orca pair on DexScreener (not the mint address). */
export const MYCO_CANONICAL_DEX_PAIR =
  process.env.MYCO_DEX_PAIR?.trim() ||
  process.env.NEXT_PUBLIC_MYCO_DEX_PAIR?.trim() ||
  "FgCQoL7tcC1nkNazV5onEgWbm9UJ9nbzqo9rZCYm6Yi4";

export type MycoDexPairQuote = {
  priceUsd: number;
  change24h: number;
  liquidityUsd?: number;
  volume24h?: number;
  fdvUsd?: number;
  pairAddress?: string;
  dexId?: string;
  source: "dexscreener" | "geckoterminal";
  url?: string;
};

type DexPairRaw = {
  chainId?: string;
  dexId?: string;
  pairAddress?: string;
  priceUsd?: string;
  priceChange?: { h24?: number };
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  fdv?: number;
  url?: string;
  baseToken?: { address?: string; symbol?: string };
  quoteToken?: { address?: string; symbol?: string };
};

function parseUsd(value: string | number | undefined | null): number | undefined {
  if (value == null) return undefined;
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) ? n : undefined;
}

function pickBestDexPair(pairs: DexPairRaw[], mint: string, preferredPair?: string): DexPairRaw | null {
  if (preferredPair) {
    const pref = pairs.find(
      (p) => p.pairAddress?.toLowerCase() === preferredPair.toLowerCase()
    );
    if (pref && parseUsd(pref.priceUsd) != null) return pref;
  }
  const relevant = pairs.filter((p) => {
    const price = parseUsd(p.priceUsd);
    if (price == null || price <= 0) return false;
    const base = p.baseToken?.address?.toLowerCase();
    const quote = p.quoteToken?.address?.toLowerCase();
    const m = mint.toLowerCase();
    return base === m || quote === m || p.baseToken?.symbol?.toUpperCase() === "MYCO";
  });
  if (!relevant.length) return null;
  relevant.sort((a, b) => {
    const liqA = a.liquidity?.usd ?? 0;
    const liqB = b.liquidity?.usd ?? 0;
    if (liqB !== liqA) return liqB - liqA;
    const volA = a.volume?.h24 ?? 0;
    const volB = b.volume?.h24 ?? 0;
    return volB - volA;
  });
  return relevant[0];
}

function mapDexPairToQuote(pair: DexPairRaw, mint: string): MycoDexPairQuote | null {
  const priceUsd = parseUsd(pair.priceUsd);
  if (priceUsd == null || priceUsd <= 0) return null;
  const pairAddress = pair.pairAddress;
  return {
    priceUsd,
    change24h: pair.priceChange?.h24 ?? 0,
    liquidityUsd: pair.liquidity?.usd,
    volume24h: pair.volume?.h24,
    fdvUsd: pair.fdv,
    pairAddress,
    dexId: pair.dexId,
    source: "dexscreener",
    url:
      pair.url ||
      (pairAddress
        ? `https://dexscreener.com/solana/${pairAddress}`
        : `https://dexscreener.com/solana/${mint}`),
  };
}

/** Fetch a single pair by address (canonical MYCO/SOL pool). */
export async function fetchDexScreenerPairQuote(
  pairAddress: string
): Promise<MycoDexPairQuote | null> {
  const url = `https://api.dexscreener.com/latest/dex/pairs/solana/${encodeURIComponent(pairAddress)}`;
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { pair?: DexPairRaw | null; pairs?: DexPairRaw[] | null };
    const pair = data.pair ?? (Array.isArray(data.pairs) ? data.pairs[0] : null);
    if (!pair) return null;
    return mapDexPairToQuote(pair, MYCO_CANONICAL_SOLANA_MINT);
  } catch {
    return null;
  }
}

export async function fetchDexScreenerMycoQuote(mint: string): Promise<MycoDexPairQuote | null> {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(mint)}`;
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { pairs?: DexPairRaw[] | null };
    const pairs = Array.isArray(data.pairs) ? data.pairs : [];
    const pair = pickBestDexPair(pairs, mint, MYCO_CANONICAL_DEX_PAIR);
    if (!pair) return null;
    return mapDexPairToQuote(pair, mint);
  } catch {
    return null;
  }
}

export async function fetchGeckoTerminalMycoQuote(mint: string): Promise<MycoDexPairQuote | null> {
  const poolsUrl = `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${encodeURIComponent(mint)}/pools?page=1`;
  try {
    const res = await fetch(poolsUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data?: Array<{
        id?: string;
        attributes?: {
          address?: string;
          name?: string;
          token_price_usd?: string;
          fdv_usd?: string;
          reserve_in_usd?: string;
          volume_usd?: { h24?: string };
          price_change_percentage?: { h24?: string };
        };
      }>;
    };
    const pools = body.data ?? [];
    if (!pools.length) return null;

    const sorted = [...pools].sort((a, b) => {
      const rA = parseUsd(a.attributes?.reserve_in_usd) ?? 0;
      const rB = parseUsd(b.attributes?.reserve_in_usd) ?? 0;
      return rB - rA;
    });
    const top = sorted[0]?.attributes;
    const priceUsd = parseUsd(top?.token_price_usd);
    if (priceUsd == null || priceUsd <= 0) return null;

    const changeRaw = top?.price_change_percentage?.h24;
    const change24h = changeRaw != null ? parseFloat(changeRaw) : 0;

    return {
      priceUsd,
      change24h: Number.isFinite(change24h) ? change24h : 0,
      liquidityUsd: parseUsd(top?.reserve_in_usd),
      volume24h: parseUsd(top?.volume_usd?.h24),
      fdvUsd: parseUsd(top?.fdv_usd),
      pairAddress: top?.address,
      dexId: "geckoterminal",
      source: "geckoterminal",
      url: top?.address
        ? `https://www.geckoterminal.com/solana/pools/${top.address}`
        : `https://www.geckoterminal.com/solana/tokens/${mint}`,
    };
  } catch {
    return null;
  }
}

/** Canonical pair first, then mint-wide DexScreener, then GeckoTerminal. */
export async function fetchLiveMycoQuote(mint = MYCO_CANONICAL_SOLANA_MINT): Promise<MycoDexPairQuote | null> {
  if (MYCO_CANONICAL_DEX_PAIR) {
    const byPair = await fetchDexScreenerPairQuote(MYCO_CANONICAL_DEX_PAIR);
    if (byPair) return byPair;
  }
  const dex = await fetchDexScreenerMycoQuote(mint);
  if (dex) return dex;
  return fetchGeckoTerminalMycoQuote(mint);
}

export function mycoExternalLinks(mint = MYCO_CANONICAL_SOLANA_MINT) {
  const pair = MYCO_CANONICAL_DEX_PAIR;
  const explorerBase =
    process.env.NEXT_PUBLIC_SOLANA_EXPLORER_BASE?.trim().replace(/\/$/, "") ||
    "https://solscan.io";
  return {
    dexscreener: pair
      ? `https://dexscreener.com/solana/${pair}`
      : `https://dexscreener.com/solana/${mint}`,
    solscan: `${explorerBase}/token/${mint}`,
    solflare: `https://www.solflare.com/prices/myco/${mint}/`,
    coinswitch: `https://coinswitch.co/web3/myco-${mint}`,
    geckoterminal: `https://www.geckoterminal.com/solana/tokens/${mint}`,
    jupiter: `https://jup.ag/swap/SOL-${mint}`,
    raydium: pair
      ? `https://raydium.io/swap/?inputMint=sol&outputMint=${mint}`
      : undefined,
  };
}
