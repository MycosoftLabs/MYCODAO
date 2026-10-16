# Optional public market snapshots

`DexScreenerMarkets.lookup(mints, cluster)` reads the documented public `GET https://api.dexscreener.com/tokens/v1/solana/{tokenAddresses}` endpoint. The provider documents comma-separated batches of at most 30 addresses and 300 requests/minute. The adapter uses batches of 30, serializes requests with a minimum 250 ms gap per process, coalesces overlapping requests, and caches each successful observation for ten minutes. Input is capped at 300 addresses per call and cache storage at 5,000 mints. There is no API key, paid subscription, write operation, swap, wallet connection, or trading action in this adapter.

Each token has an explicit state:

- `available`: at least one indexed Solana pair has this mint as its **base token**. Individual metrics can still be null.
- `empty`: the successful provider response contains no indexed base-token pair for this mint. This does not mean the token is worthless, absent on-chain, or has zero trading volume.
- `unavailable`: the request failed, the schema was invalid, or the selected cluster is devnet/localnet. Mainnet market data is never attached to another cluster. Failures are cached for 30 seconds, and expired prices are not silently reused as fresh data.

`priceUsd` remains a decimal string. `marketCapUsd`, `volume24hUsd`, and `liquidityUsd` remain null when omitted, invalid, or unavailable. An explicitly reported zero remains zero. FDV is not substituted for market capitalization, and a quote-token match cannot inherit the pair's base-token price. The selected pair has the highest reported USD liquidity, then highest reported 24-hour volume, then lexical pair address as a stable tie-breaker. The returned pair list preserves the underlying observations; this adapter does not aggregate potentially overlapping pools. `fetchedAt` and `expiresAt` describe this service's retrieval/cache window, not an on-chain trade timestamp.

The data is suitable for optional catalog context. It does not prove canonical pool status, liquidity quality, organic volume, fair value, future returns, token ownership, or the amount of a scientific reward. The default capped species token can have no liquidity pool and correctly display `empty`. Reward eligibility, funding allocations, inventory, and payouts never depend on these prices.

For API integration, keep one adapter instance per process, call `lookup` only for the catalog page's canonical mint addresses, and attach each returned observation by exact mint and cluster. Multiple server instances have independent caches/rate limits; coordinate or reduce traffic before scaling out. The module does not install its own scheduler or mutate the catalog database.

Local tests use mocked HTTP responses to verify batching, cache expiry, unknown versus zero metrics, failure boundaries, pair selection, cluster separation, and overlapping request coalescing. They do not establish live provider uptime or deployed market-data operation.

Official source checked October 15, 2026: [DEX Screener API reference](https://docs.dexscreener.com/api/reference).
