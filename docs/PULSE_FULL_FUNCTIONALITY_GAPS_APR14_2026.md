> AWS topology correction 2026-11-27: local production servers, LAN addresses and VM/Proxmox/NAS deployment instructions are retired. Use [AWS_INFRA_REFERENCE.md](../AWS_INFRA_REFERENCE.md). Preserve historical evidence and optional device/external connectors.

# Pulse full functionality — gaps to close (Apr 14, 2026)

**Status:** Working checklist (not a commitment date). Pulse runs with **empty states** when keys or backends are missing; this lists what is needed for a **fully wired** product.

**Related:** `docs/PULSE_LIVE_IMPLEMENTATION_COMPLETE_APR16_2026.md` (MAS proxy, config-status, Supabase scaffold), `docs/DEPLOY_AND_CLEAN_BUILD_APR14_2026.md` (stale chunk / `.next` fix), `docs/MYCODAO_SUPABASE_MINDEX_MAS_ORCHESTRATION_FULL_PLAN_APR14_2026.md` (Supabase + MINDEX + MAS), `docs/PULSE_LOCAL_FULL_STACK_ENV_MATRIX_APR14_2026.md` (env matrix).

---

## 1. Build / dev reliability

| Gap | Action |
|-----|--------|
| Stale webpack chunks (`Cannot find module './NNN.js'`) | Run `npm run clean` or `npm run dev:fresh`; never commit `.next`. Documented in `DEPLOY_AND_CLEAN_BUILD_APR14_2026.md`. |
| CI does not verify Pulse | **Done:** `.github/workflows/mycodao-ci.yml` runs `npm ci`, `lint`, `build` on `main` / PRs. |
| Production liveness | **Done:** `GET /api/health` (optional `?deep=1` for MAS/MINDEX/NatureOS pings). **`GET /api/pulse/config-status`** for env presence booleans (no secrets). |

---

## 2. Environment variables (minimum viable Pulse)

| Area | Variables | Gap if unset |
|------|-----------|----------------|
| **US equities / macro quotes + OHLC + calendar** | `FINNHUB_API_KEY` | No Finnhub equities/ETFs; OHLC falls back to CoinGecko for crypto only; economic calendar empty unless `CALENDAR_JSON_URL`. |
| **Crypto spot + 24h change** | (none — CoinGecko public) | Rate limits / occasional empty on API errors. |
| **MYCO token in tickers** | `MYCO_SOLANA_MINT` | No MYCO row in `/api/tickers` from DexScreener. |
| **News** | `GNEWS_API_KEY` or `NEWS_API_KEY` | `/api/news` returns `[]` (no fake headlines). |
| **Podcasts** | `PODCAST_RSS_URLS` | `/api/podcasts` returns `[]`. |
| **Learn** | `LEARN_MODULES_URL` or `data/learn-modules.json` (tracks, `resourceLinks`); optional `LEARN_DEV_FALLBACK=1` for local empty file. | `/api/learn` returns `[]` if file missing/invalid and dev fallback off. |
| **Research (preferred)** | `MINDEX_API_URL` + `MINDEX_INTERNAL_TOKEN` | Falls back to **OpenAlex** only if MINDEX internal research route unavailable. |
| **MYCO snapshot (rich)** | `MYCO_SNAPSHOT_URL` **or** DexScreener via `MYCO_SOLANA_MINT` | **Improved:** no synthetic biobank/governance derived from `researchFunding`; missing blocks default to **zeros** until real API JSON supplies them. |
| **Calendar** | `CALENDAR_JSON_URL` **or** Finnhub | Empty catalyst list if neither works. |
| **Live ticker SSE** | `NEXT_PUBLIC_PULSE_SSE=1` | UI does not open EventSource to `/api/pulse/stream`. |
| **Trading terminal** | `TRADING_BROKER_BASE_URL` + broker implementing `/v1/orders`, `/v1/positions`, optional `/v1/quote` | `/api/trading/*` returns **503** with `broker_not_configured`. |
| **Trading auth** | `PULSE_TRADING_API_KEY` or `PULSE_TRUST_SAME_ORIGIN_TRADING` (LAN only) | Browser cannot POST orders securely. |
| **Subpath deploy** | `NEXT_PUBLIC_BASE_PATH` matching `next.config.mjs` | Wrong asset/API paths if mismatched. |

---

## 3. Backend integrations

| Gap | Detail |
|-----|--------|
| **MAS orchestrator** | **`POST /api/pulse/mas-task`** proxies to `{MAS_API_URL}/api/tasks/submit` with `x-pulse-internal-key` / `PULSE_MAS_PROXY_SECRET` (see completion doc). UI still needs Server Actions / auth gate — do not expose the secret to the browser. |
| **MINDEX** | Research uses `/api/mindex/research` with internal token; other MINDEX datasets (species, compounds) not surfaced in Pulse UI. |
| **NatureOS** | Optional health check only; no live SignalR/NatureOS features in Pulse. |
| **Supabase** | **Partial:** migration `supabase/migrations/001_mycodao_pulse_agent_runs.sql` + optional `GET /api/pulse/agent-runs`. Full **auth, profiles, watchlists, saved layouts** still per orchestration doc. |
| **Broker service** | Contract documented in `.env.example`; execution stack (Jupiter/CCXT/MAS) must be deployed separately. |

---

## 4. Product / UX gaps

| Gap | Detail |
|-----|--------|
| **Empty markets** | When both CoinGecko and Finnhub fail, dashboards show **no rows** — need clear “data unavailable” copy and optional retry. |
| **News terminal embeds** | `NEXT_PUBLIC_PULSE_NEWS_*` in `.env.example` — optional live video/tape; unset = no embed. |
| **Podcast studio** | Live embed, stream deck JSON, `data/podcast-chat.json` — single-instance file; not multi-tenant. |
| **Learn curriculum** | **Improved:** `data/learn-modules.json` includes **track** filters, **resource links**, hub + detail UX, and `getMockLearnModules` dev fallback when `LEARN_DEV_FALLBACK=1`. |
| **Trade UI** | Depends on broker; fast-path tuning via `PULSE_TRADE_FAST_PATH`, `PULSE_TICKER_CACHE_MS`, SSE interval envs. |

---

## 5. Data integrity / policy

| Gap | Detail |
|-----|--------|
| **No mock policy** | Mock adapters removed; ensure **no** UI implies “demo” data when arrays are empty. |
| **Derived MYCO governance/biobank** | `lib/adapters/myco.ts` `ensurePhase3Fields` — replace with **real** on-chain or API-sourced governance/biobank when available. |
| **OpenAlex fallback** | Public metadata only; not a substitute for MINDEX-curated research. |

---

## 6. Observability & ops

| Gap | Detail |
|-----|--------|
| **Runtime logging** | API routes `console.error` on failure — no centralized APM (Sentry/OpenTelemetry) in project. |
| **Smoke tests** | `npm run test:pulse-smoke` — now includes `health?deep=1`, `config-status`, `mas-task` GET; requires running server; no Playwright E2E in repo for Pulse. |
| **Production deploy** | **Script:** `scripts/deploy-pulse-vm.ps1` (plink → `/opt/mycodao`, tunnel profile). **Doc:** `docs/PULSE_VM_CLOUDFLARE_TUNNEL_DEPLOY_APR14_2026.md`. |

---

## 7. Security

| Gap | Detail |
|-----|--------|
| **Trading keys** | Must stay server-side / headers; rotate `PULSE_TRADING_API_KEY` if exposed. |
| **MINDEX internal token** | LAN/VPN only; scope minimal on MINDEX. |
| **CORS / same-origin** | `PULSE_TRUST_SAME_ORIGIN_TRADING` is **dangerous** on public hosts — document “LAN only”. |

---

## 8. Suggested priority order

1. **Reliable data:** `FINNHUB_API_KEY`, `GNEWS_API_KEY` or `NEWS_API_KEY`, `MYCO_SOLANA_MINT`, `PODCAST_RSS_URLS`.  
2. **Clean builds:** `npm run dev:fresh` after branch switches or chunk errors.  
3. **MINDEX research:** `MINDEX_API_URL` + `MINDEX_INTERNAL_TOKEN` for curated papers.  
4. **Trading:** Deploy broker + `TRADING_BROKER_BASE_URL` + auth.  
5. **Orchestration:** Supabase + MAS agent flows per `MYCODAO_SUPABASE_MINDEX_MAS_ORCHESTRATION_FULL_PLAN_APR14_2026.md`.  
6. **Replace derived MYCO fields** with real DAO/biobank sources.  
7. **CI + E2E smoke** for regressions.

---

*Last updated: Apr 14, 2026*
