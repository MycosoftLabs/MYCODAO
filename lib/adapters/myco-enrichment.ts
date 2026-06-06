/**
 * Enriches MYCO snapshot with: DexScreener pools, optional CoinMarketCap, Solana explorer + RPC supply,
 * and internal DAO treasury JSON. All keys read from env — no hardcoded API secrets.
 */

import { readFile } from "fs/promises";
import path from "path";
import type {
  MycoCoinmarketcap,
  MycoDaoPool,
  MycoDexPool,
  MycoFundingUse,
  MycoSnapshot,
  MycoSolanaOnchain,
  MycoTokenCanonical,
  MycoTreasury,
} from "@/lib/types";

type DexPairRaw = {
  chainId?: string;
  dexId?: string;
  pairAddress?: string;
  baseToken?: { symbol?: string };
  quoteToken?: { symbol?: string };
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  priceUsd?: string;
  priceChange?: { h24?: number };
  url?: string;
};

function explorerBaseUrl(): string {
  const b = process.env.NEXT_PUBLIC_SOLANA_EXPLORER_BASE?.trim().replace(/\/$/, "");
  return b || "https://solscan.io";
}

function mapDexPair(p: DexPairRaw): MycoDexPool | null {
  if (!p.dexId || !p.pairAddress) return null;
  const liquidityUsd = typeof p.liquidity?.usd === "number" ? p.liquidity.usd : undefined;
  const volumeH24 = typeof p.volume?.h24 === "number" ? p.volume.h24 : undefined;
  const priceUsd = p.priceUsd != null ? parseFloat(p.priceUsd) : undefined;
  const pch = p.priceChange?.h24;
  return {
    chainId: p.chainId,
    dexId: p.dexId,
    pairAddress: p.pairAddress,
    baseToken: p.baseToken?.symbol ?? "?",
    quoteToken: p.quoteToken?.symbol ?? "?",
    liquidityUsd,
    volumeH24,
    priceUsd: Number.isFinite(priceUsd) ? priceUsd : undefined,
    priceChangeH24: typeof pch === "number" ? pch : undefined,
    url: p.url,
  };
}

export async function fetchDexPoolsForMint(mint: string): Promise<MycoDexPool[] | undefined> {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(mint)}`;
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
    if (res.ok) {
      const data = (await res.json()) as { pairs?: DexPairRaw[] | null };
      const pairs = Array.isArray(data.pairs) ? data.pairs : [];
      const mapped = pairs.map(mapDexPair).filter((x): x is MycoDexPool => x != null);
      if (mapped.length) {
        mapped.sort((a, b) => (b.liquidityUsd ?? 0) - (a.liquidityUsd ?? 0));
        return mapped.slice(0, 30);
      }
    }
  } catch {
    /* try gecko */
  }

  try {
    const gtUrl = `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${encodeURIComponent(mint)}/pools?page=1`;
    const gtRes = await fetch(gtUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
      headers: { Accept: "application/json" },
    });
    if (!gtRes.ok) return undefined;
    const body = (await gtRes.json()) as {
      data?: Array<{
        attributes?: {
          address?: string;
          name?: string;
          token_price_usd?: string;
          reserve_in_usd?: string;
          volume_usd?: { h24?: string };
          price_change_percentage?: { h24?: string };
        };
      }>;
    };
    const pools = (body.data ?? [])
      .map((p) => {
        const a = p.attributes;
        if (!a?.address) return null;
        const priceUsd = a.token_price_usd != null ? parseFloat(a.token_price_usd) : undefined;
        const liquidityUsd =
          a.reserve_in_usd != null ? parseFloat(a.reserve_in_usd) : undefined;
        const volumeH24 =
          a.volume_usd?.h24 != null ? parseFloat(a.volume_usd.h24) : undefined;
        const pch = a.price_change_percentage?.h24;
        const priceChangeH24 = pch != null ? parseFloat(pch) : undefined;
        return {
          chainId: "solana",
          dexId: "geckoterminal",
          pairAddress: a.address,
          baseToken: a.name?.split("/")[0]?.trim() ?? "MYCO",
          quoteToken: a.name?.split("/")[1]?.trim() ?? "SOL",
          liquidityUsd: Number.isFinite(liquidityUsd) ? liquidityUsd : undefined,
          volumeH24: Number.isFinite(volumeH24) ? volumeH24 : undefined,
          priceUsd: Number.isFinite(priceUsd) ? priceUsd : undefined,
          priceChangeH24: Number.isFinite(priceChangeH24) ? priceChangeH24 : undefined,
          url: `https://www.geckoterminal.com/solana/pools/${a.address}`,
        } as MycoDexPool;
      })
      .filter((x): x is MycoDexPool => x !== null);
    return pools.length ? pools.slice(0, 30) : undefined;
  } catch {
    return undefined;
  }
}

async function fetchCoinmarketcap(): Promise<MycoCoinmarketcap | undefined> {
  const key = process.env.COINMARKETCAP_API_KEY?.trim();
  const id = process.env.MYCO_CMC_ID?.trim();
  if (!key || !id) return undefined;
  const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?id=${encodeURIComponent(id)}`;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json", "X-CMC_PRO_API_KEY": key },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return undefined;
    const body = (await res.json()) as {
      data?: Record<
        string,
        {
          cmc_rank?: number;
          circulating_supply?: number;
          quote?: { USD?: Record<string, number | string> };
        }
      >;
    };
    const row = body.data?.[id];
    const usd = row?.quote?.USD;
    if (!usd || typeof usd !== "object") return undefined;
    const marketCap = usd.market_cap as number | undefined;
    const volume24h = usd.volume_24h as number | undefined;
    const pct = usd.percent_change_24h as number | undefined;
    const lastUpdated = typeof usd.last_updated === "string" ? usd.last_updated : undefined;
    const slug = process.env.MYCO_CMC_SLUG?.trim();
    const cmcUrl =
      slug != null && slug.length > 0
        ? `https://coinmarketcap.com/currencies/${encodeURIComponent(slug)}/`
        : `https://coinmarketcap.com/currencies/myco/`;
    return {
      cmcRank: row.cmc_rank,
      marketCapUsd: marketCap,
      volume24hUsd: volume24h,
      percentChange24h: pct,
      circulatingSupply: row.circulating_supply,
      lastUpdated,
      url: cmcUrl,
    };
  } catch {
    return undefined;
  }
}

async function fetchTokenSupplyRpc(mint: string): Promise<{ raw?: string; decimals?: number }> {
  const rpcUrl = process.env.SOLANA_RPC_URL?.trim() || "https://api.mainnet-beta.solana.com";
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "getTokenSupply",
    params: [mint],
  };
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return {};
    const j = (await res.json()) as {
      result?: { value?: { amount?: string; decimals?: number; uiAmount?: number } };
    };
    const v = j.result?.value;
    if (!v?.amount) return {};
    return { raw: v.amount, decimals: v.decimals };
  } catch {
    return {};
  }
}

function supplyNumberFromRaw(raw: string, decimals: number): number {
  try {
    const bi = BigInt(raw);
    let div = BigInt(1);
    const d = Math.min(Math.max(0, decimals), 78);
    const ten = BigInt(10);
    for (let i = 0; i < d; i++) div *= ten;
    return Number(bi) / Number(div);
  } catch {
    return 0;
  }
}

export async function buildSolanaLayer(mint: string): Promise<MycoSolanaOnchain> {
  const base = explorerBaseUrl();
  const tokenExplorerUrl = `${base}/token/${mint}`;
  const mintExplorerUrl = `${base}/address/${mint}`;
  const { raw, decimals } = await fetchTokenSupplyRpc(mint);
  return {
    mint,
    rawSupply: raw,
    decimals,
    tokenExplorerUrl,
    mintExplorerUrl,
  };
}

async function loadTreasuryFile(): Promise<MycoTreasury | undefined> {
  const override = process.env.MYCO_DAO_TREASURY_PATH?.trim();
  const filePath = override || path.join(process.cwd(), "data", "myco-dao-treasury.json");
  try {
    const raw = await readFile(filePath, "utf8");
    const data = JSON.parse(raw) as { pools?: MycoDaoPool[]; fundingUses?: MycoFundingUse[] };
    if (!Array.isArray(data.pools) || !Array.isArray(data.fundingUses)) return undefined;
    if (data.pools.length === 0 && data.fundingUses.length === 0) return undefined;
    return { pools: data.pools, fundingUses: data.fundingUses };
  } catch {
    return undefined;
  }
}

async function loadCanonicalToken(): Promise<MycoTokenCanonical | undefined> {
  const override = process.env.MYCO_TOKEN_CANONICAL_PATH?.trim();
  const filePath = override || path.join(process.cwd(), "data", "myco-token-canonical.json");
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as MycoTokenCanonical;
  } catch {
    return undefined;
  }
}

/**
 * Merges live DEX / CMC / Solana / treasury data into a snapshot. Does not remove upstream fields from MYCO_SNAPSHOT_URL.
 * Always merges `data/myco-token-canonical.json` when present (facts from https://www.mycodao.com/token).
 */
export async function enrichMycoSnapshot(base: MycoSnapshot): Promise<MycoSnapshot> {
  const mint = process.env.MYCO_SOLANA_MINT?.trim();
  const [dexPools, coinmarketcap, solanaLayer, treasury, canonical] = await Promise.all([
    mint ? fetchDexPoolsForMint(mint) : Promise.resolve(undefined),
    fetchCoinmarketcap(),
    mint ? buildSolanaLayer(mint) : Promise.resolve(undefined),
    loadTreasuryFile(),
    loadCanonicalToken(),
  ]);

  let supply = base.supply;
  if (canonical && (!Number.isFinite(supply) || supply <= 0)) {
    supply = canonical.totalSupplyAmount;
  }
  if (solanaLayer?.rawSupply != null && solanaLayer.decimals != null) {
    const n = supplyNumberFromRaw(solanaLayer.rawSupply, solanaLayer.decimals);
    if (Number.isFinite(n) && n > 0) supply = n;
  }

  const publicTokenPage =
    process.env.NEXT_PUBLIC_MYCO_TOKEN_PAGE?.trim() ||
    canonical?.sourceUrl ||
    "https://www.mycodao.com/token";
  const tokenPage =
    base.links.tokenPage?.startsWith("http") ? base.links.tokenPage : publicTokenPage;

  return {
    ...base,
    supply,
    links: { ...base.links, tokenPage },
    canonical: canonical ?? base.canonical,
    dexPools: dexPools && dexPools.length > 0 ? dexPools : base.dexPools,
    coinmarketcap: coinmarketcap ?? base.coinmarketcap,
    solana: solanaLayer ?? base.solana,
    treasury: treasury ?? base.treasury,
    updatedAt: new Date().toISOString(),
  };
}
