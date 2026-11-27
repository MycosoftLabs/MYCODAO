> AWS topology correction 2026-11-27: local production servers, LAN addresses and VM/Proxmox/NAS deployment instructions are retired. Use [AWS_INFRA_REFERENCE.md](../AWS_INFRA_REFERENCE.md). Preserve historical evidence and optional device/external connectors.

# Pulse local full-stack env matrix (Apr 14, 2026)

Use this with **`.env.example`** when running Pulse on **port 3004** (`npm run dev`). See also **`docs/DEPLOY_AND_CLEAN_BUILD_APR14_2026.md`**.

## Routing

| Variable | Local typical | Production (root host) |
|----------|---------------|-------------------------|
| `NEXT_PUBLIC_BASE_PATH` | *(empty)* | *(empty)* for `https://pulse.mycodao.com/` |
| `NEXT_PUBLIC_PULSE_SSE` | `1` to test SSE | `1` or omit |

Client API calls use **`origin + NEXT_PUBLIC_BASE_PATH`** (see `lib/pulse-provider.tsx`), matching `MarketChart` and `next.config.mjs`.

## Data plane

| Area | Env vars | Without keys |
|------|----------|----------------|
| Tickers | `FINNHUB_API_KEY`, `MYCO_SOLANA_MINT` | Empty list unless `ALLOW_MOCK_FALLBACK=true` |
| OHLC / chart | `FINNHUB_API_KEY` (best) | Empty/error UI; CoinGecko fallback for some symbols |
| News | `GNEWS_API_KEY` or `NEWS_API_KEY` | `[]` unless mock fallback allowed |
| Podcasts | `PODCAST_RSS_URLS` (comma-separated) | `[]` unless mock fallback |
| Calendar | `FINNHUB_API_KEY`, optional `CALENDAR_JSON_URL` | Empty / per adapter |
| MYCO snapshot | `MYCO_SOLANA_MINT`, optional `MYCO_SNAPSHOT_URL` | Per `lib/adapters/myco.ts` |

## Optional VM backends

| Variable | Used for |
|----------|----------|
| `MAS_API_URL` | MAS integration when wired |
| `MINDEX_API_URL` | MINDEX when wired |
| `NATUREOS_API_URL` | `npm run check:backends` |

## Local verification

1. Terminal A: `npm run dev` or `npm run start` (listens on **3004**). After `npm run start`, wait **~10–15 seconds** before smoke so the standalone server is ready (early requests may return 500).
2. Terminal B: `npm run test:pulse-smoke` (hits `http://localhost:3004` by default).

Optional: `npm run check:backends` when MAS/MINDEX/NatureOS URLs are set.
