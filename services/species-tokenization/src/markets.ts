import { setTimeout as delay } from 'node:timers/promises';
import { PublicKey } from '@solana/web3.js';
import { z } from 'zod';
import type { Cluster } from './contracts.js';

export type MarketState = 'available' | 'empty' | 'unavailable';
export interface MarketPair {
  pairAddress: string;
  dexId: string | null;
  url: string | null;
  quoteMint: string | null;
  priceUsd: string | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  liquidityUsd: number | null;
}
export interface TokenMarket {
  mint: string;
  cluster: Cluster;
  state: MarketState;
  source: 'dexscreener';
  fetchedAt: string | null;
  expiresAt: string | null;
  priceUsd: string | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  liquidityUsd: number | null;
  selectedPair: string | null;
  pairCount: number | null;
  pairs: MarketPair[];
  reason?: string;
}
export interface MarketOptions {
  fetch?: typeof globalThis.fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<unknown>;
}

const pairSchema = z.object({
  chainId: z.string(), pairAddress: z.string().min(1).max(200),
  dexId: z.string().max(200).optional(), url: z.string().max(1000).optional(),
  baseToken: z.object({ address: z.string().min(1).max(200) }),
  quoteToken: z.object({ address: z.string().nullable().optional() }).optional(),
  priceUsd: z.unknown().optional(), marketCap: z.unknown().optional(),
  volume: z.object({ h24: z.unknown().optional() }).optional(),
  liquidity: z.object({ usd: z.unknown().optional() }).nullable().optional(),
});
const numberOrNull = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
function priceOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length <= 100 && /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value)
    && Number.isFinite(Number(value)) ? value : null;
}
function linkOrNull(value: string | undefined): string | null {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null; }
  catch { return null; }
}
function blank(mint: string, cluster: Cluster, state: MarketState, reason?: string): TokenMarket {
  return { mint, cluster, state, source: 'dexscreener', fetchedAt: null, expiresAt: null,
    priceUsd: null, marketCapUsd: null, volume24hUsd: null, liquidityUsd: null,
    selectedPair: null, pairCount: state === 'empty' ? 0 : null, pairs: [], ...(reason ? { reason } : {}) };
}

/** Public, read-only mainnet market observations. Never used to value rewards or authorize spending. */
export class DexScreenerMarkets {
  private readonly cache = new Map<string, { value: TokenMarket; expires: number }>();
  private readonly pending = new Map<string, Promise<void>>();
  private readonly request: typeof globalThis.fetch;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<unknown>;
  private queue: Promise<void> = Promise.resolve();
  private nextRequestAt = 0;
  constructor(options: MarketOptions = {}) {
    this.request = options.fetch ?? globalThis.fetch;
    this.now = options.now ?? Date.now;
    this.sleep = options.sleep ?? delay;
  }
  async lookup(addresses: string[], cluster: Cluster = 'mainnet-beta'): Promise<TokenMarket[]> {
    if (!Array.isArray(addresses) || addresses.length > 300) throw new Error('Market lookup accepts at most 300 token addresses');
    const mints = [...new Set(addresses.map(address => {
      try {
        if (typeof address !== 'string' || address.length > 44) throw new Error();
        return new PublicKey(address).toBase58();
      } catch { throw new Error('Invalid public key in market lookup'); }
    }))];
    if (cluster !== 'mainnet-beta') return mints.map(mint => blank(mint, cluster, 'unavailable', 'dexscreener_mainnet_only'));
    const missing = mints.filter(mint => !this.pending.has(mint) && (this.cache.get(mint)?.expires ?? 0) <= this.now());
    for (let start = 0; start < missing.length; start += 30) {
      const batch = missing.slice(start, start + 30);
      const task = this.enqueue(() => this.refresh(batch));
      for (const mint of batch) this.pending.set(mint, task);
      const cleanup = () => { for (const mint of batch) if (this.pending.get(mint) === task) this.pending.delete(mint); };
      void task.then(cleanup, cleanup);
    }
    await Promise.all([...new Set(mints.map(mint => this.pending.get(mint)).filter((task): task is Promise<void> => Boolean(task)))]);
    return mints.map(mint => structuredClone(this.cache.get(mint)?.value ?? blank(mint, cluster, 'unavailable', 'market_cache_unavailable')));
  }
  private enqueue(task: () => Promise<void>): Promise<void> {
    const next = this.queue.then(async () => {
      const wait = this.nextRequestAt - this.now();
      if (wait > 0) await this.sleep(wait);
      this.nextRequestAt = this.now() + 250; // At most 240/minute for this process.
      await task();
    });
    this.queue = next.catch(() => {});
    return next;
  }
  private put(value: TokenMarket, expires: number): void {
    this.cache.delete(value.mint);
    this.cache.set(value.mint, { value, expires });
    while (this.cache.size > 5000) this.cache.delete(this.cache.keys().next().value!);
  }
  private async refresh(mints: string[]): Promise<void> {
    const fetched = this.now();
    try {
      const response = await this.request(`https://api.dexscreener.com/tokens/v1/solana/${mints.join(',')}`, {
        method: 'GET', redirect: 'error', signal: AbortSignal.timeout(10_000), headers: { accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`dexscreener_http_${response.status}`);
      const length = response.headers.get('content-length');
      if (length && Number(length) > 2_000_000) throw new Error('dexscreener_response_too_large');
      const text = await response.text();
      if (text.length > 2_000_000) throw new Error('dexscreener_response_too_large');
      const raw: unknown = JSON.parse(text);
      const rows = z.array(pairSchema).max(10_000).safeParse(raw);
      if (!rows.success) throw new Error('dexscreener_invalid_response');
      const expires = fetched + 600_000;
      for (const mint of mints) {
        // Prices and capitalization describe the base token. A quote-token match cannot
        // safely inherit those fields or be inverted without additional evidence.
        const pairs: MarketPair[] = rows.data.filter(row => row.chainId === 'solana' && row.baseToken.address === mint).map(row => ({
          pairAddress: row.pairAddress, dexId: row.dexId ?? null, url: linkOrNull(row.url), quoteMint: row.quoteToken?.address ?? null,
          priceUsd: priceOrNull(row.priceUsd), marketCapUsd: numberOrNull(row.marketCap),
          volume24hUsd: numberOrNull(row.volume?.h24), liquidityUsd: numberOrNull(row.liquidity?.usd),
        })).sort((a, b) => (b.liquidityUsd ?? -1) - (a.liquidityUsd ?? -1)
          || (b.volume24hUsd ?? -1) - (a.volume24hUsd ?? -1) || a.pairAddress.localeCompare(b.pairAddress));
        const selected = pairs[0];
        this.put({ ...blank(mint, 'mainnet-beta', selected ? 'available' : 'empty', selected ? undefined : 'no_indexed_base_token_pair'),
          fetchedAt: new Date(fetched).toISOString(), expiresAt: new Date(expires).toISOString(),
          priceUsd: selected?.priceUsd ?? null, marketCapUsd: selected?.marketCapUsd ?? null,
          volume24hUsd: selected?.volume24hUsd ?? null, liquidityUsd: selected?.liquidityUsd ?? null,
          selectedPair: selected?.pairAddress ?? null, pairCount: pairs.length, pairs }, expires);
      }
    } catch (error) {
      const expires = fetched + 30_000;
      const reason = error instanceof Error && /^dexscreener_/.test(error.message) ? error.message : 'dexscreener_request_failed';
      for (const mint of mints) this.put({ ...blank(mint, 'mainnet-beta', 'unavailable', reason),
        fetchedAt: new Date(fetched).toISOString(), expiresAt: new Date(expires).toISOString() }, expires);
    }
  }
}
