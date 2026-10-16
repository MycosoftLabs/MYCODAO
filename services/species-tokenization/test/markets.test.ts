import assert from 'node:assert/strict';
import test from 'node:test';
import { Keypair } from '@solana/web3.js';
import { DexScreenerMarkets } from '../src/markets.js';

const mint = () => Keypair.generate().publicKey.toBase58();
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
function pair(address: string, extra: Record<string, unknown> = {}) {
  return { chainId: 'solana', pairAddress: mint(), dexId: 'test-dex', url: 'https://dexscreener.com/solana/test',
    baseToken: { address }, quoteToken: { address: mint() }, priceUsd: '0.000125', marketCap: 125000,
    liquidity: { usd: 100 }, volume: { h24: 500 }, ...extra };
}

test('market requests are read-only Solana batches of at most 30 addresses and deduplicate repeated mints', async () => {
  const mints = Array.from({ length: 31 }, mint), batches: string[][] = [];
  const adapter = new DexScreenerMarkets({ sleep: async () => {}, fetch: (async (url, init) => {
    assert.equal(init?.method, 'GET'); assert.equal(init?.redirect, 'error');
    const path = new URL(String(url));
    assert.equal(path.origin, 'https://api.dexscreener.com');
    assert(path.pathname.startsWith('/tokens/v1/solana/'));
    const addresses = path.pathname.split('/').at(-1)!.split(',');
    batches.push(addresses);
    return response(addresses.map(address => pair(address)));
  }) as typeof fetch });
  const rows = await adapter.lookup([...mints, mints[0]]);
  assert.equal(rows.length, 31);
  assert.deepEqual(batches.map(batch => batch.length), [30, 1]);
  assert(rows.every(row => row.state === 'available'));
});

test('ten-minute cache expires, and callers cannot mutate cached snapshots', async () => {
  let now = 1_000_000, calls = 0;
  const address = mint();
  const adapter = new DexScreenerMarkets({ now: () => now, sleep: async () => {},
    fetch: (async () => { calls++; return response([pair(address)]); }) as typeof fetch });
  const [first] = await adapter.lookup([address]);
  first.priceUsd = '999'; first.pairs.length = 0;
  now += 599_999;
  const [cached] = await adapter.lookup([address]);
  assert.equal(cached.priceUsd, '0.000125'); assert.equal(cached.pairs.length, 1); assert.equal(calls, 1);
  assert.equal(Date.parse(cached.expiresAt!) - Date.parse(cached.fetchedAt!), 600_000);
  now++;
  await adapter.lookup([address]); assert.equal(calls, 2);
});

test('missing prices/capitalization remain null, FDV never substitutes for market cap, observed zero stays zero', async () => {
  const one = mint(), two = mint();
  const adapter = new DexScreenerMarkets({ fetch: (async () => response([
    pair(one, { priceUsd: undefined, marketCap: undefined, fdv: 999999, volume: {}, liquidity: null }),
    pair(two, { priceUsd: '0', marketCap: 0, liquidity: { usd: 0 }, volume: { h24: 0 } }),
  ])) as typeof fetch });
  const [missing, zero] = await adapter.lookup([one, two]);
  assert.equal(missing.state, 'available'); assert.equal(missing.priceUsd, null); assert.equal(missing.marketCapUsd, null);
  assert.equal(missing.volume24hUsd, null); assert.equal(missing.liquidityUsd, null);
  assert.equal(zero.priceUsd, '0'); assert.equal(zero.marketCapUsd, 0); assert.equal(zero.volume24hUsd, 0);
});

test('successful no-pair result is empty; provider failures are unavailable with no numeric defaults or stale prices', async () => {
  const empty = mint(), present = mint(); let now = 1_000_000, failure = false, calls = 0;
  const adapter = new DexScreenerMarkets({ now: () => now, sleep: async () => {}, fetch: (async () => {
    calls++; return failure ? response({ message: 'rate limited' }, 429) : response([pair(present)]);
  }) as typeof fetch });
  let [none, found] = await adapter.lookup([empty, present]);
  assert.equal(none.state, 'empty'); assert.equal(none.pairCount, 0); assert.equal(none.priceUsd, null);
  assert.equal(found.state, 'available');
  failure = true; now += 600_000;
  [none, found] = await adapter.lookup([empty, present]);
  assert.equal(found.state, 'unavailable'); assert.equal(found.reason, 'dexscreener_http_429');
  assert.equal(found.priceUsd, null); assert.equal(found.marketCapUsd, null); assert.equal(found.pairCount, null);
  now += 29_999; await adapter.lookup([present]); assert.equal(calls, 2);
  now++; await adapter.lookup([present]); assert.equal(calls, 3);
});

test('a failed batch does not turn successful batches unavailable or empty', async () => {
  const addresses = Array.from({ length: 31 }, mint);
  let calls = 0;
  const adapter = new DexScreenerMarkets({ sleep: async () => {}, fetch: (async url => {
    calls++;
    if (calls === 2) throw new Error('offline');
    return response(String(url).split('/').at(-1)!.split(',').map(address => pair(address)));
  }) as typeof fetch });
  const rows = await adapter.lookup(addresses);
  assert.equal(rows.filter(row => row.state === 'available').length, 30);
  assert.equal(rows[30].state, 'unavailable');
});

test('quote-only and wrong-chain results cannot misattribute the base token price', async () => {
  const address = mint();
  const adapter = new DexScreenerMarkets({ fetch: (async () => response([
    pair(mint(), { quoteToken: { address }, priceUsd: '999' }),
    pair(address, { chainId: 'ethereum', priceUsd: '888' }),
  ])) as typeof fetch });
  const [row] = await adapter.lookup([address]); assert.equal(row.state, 'empty'); assert.equal(row.priceUsd, null);
});

test('pair selection uses reported liquidity without aggregating volumes or market caps across pools', async () => {
  const address = mint();
  const low = pair(address, { liquidity: { usd: 10 }, priceUsd: '1', marketCap: 100, volume: { h24: 1000 } });
  const high = pair(address, { liquidity: { usd: 100 }, priceUsd: '2', marketCap: 200, volume: { h24: 10 } });
  const adapter = new DexScreenerMarkets({ fetch: (async () => response([low, high])) as typeof fetch });
  const [row] = await adapter.lookup([address]);
  assert.equal(row.selectedPair, high.pairAddress); assert.equal(row.pairCount, 2);
  assert.equal(row.priceUsd, '2'); assert.equal(row.marketCapUsd, 200); assert.equal(row.volume24hUsd, 10);
});

test('devnet/localnet never query public mainnet market data; malformed provider data is unavailable', async () => {
  let calls = 0;
  const adapter = new DexScreenerMarkets({ fetch: (async () => { calls++; return response({ pairs: [] }); }) as typeof fetch });
  const address = mint();
  const [dev] = await adapter.lookup([address], 'devnet');
  assert.equal(dev.state, 'unavailable'); assert.equal(dev.reason, 'dexscreener_mainnet_only'); assert.equal(calls, 0);
  const [invalid] = await adapter.lookup([address]); assert.equal(invalid.state, 'unavailable'); assert.equal(invalid.reason, 'dexscreener_invalid_response');
  await assert.rejects(adapter.lookup(['invalid-address']), /Invalid public key/);
  await assert.rejects(adapter.lookup(Array.from({ length: 301 }, mint)), /at most 300/);
});

test('concurrent overlapping lookups share the same provider request', async () => {
  const address = mint(); let calls = 0;
  const adapter = new DexScreenerMarkets({ fetch: (async () => { calls++; await new Promise(resolve => setImmediate(resolve)); return response([pair(address)]); }) as typeof fetch });
  const [first, second] = await Promise.all([adapter.lookup([address]), adapter.lookup([address])]);
  assert.equal(calls, 1); assert.equal(first[0].priceUsd, second[0].priceUsd);
});
