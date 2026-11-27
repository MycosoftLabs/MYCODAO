> AWS topology correction 2026-11-27: local production servers, LAN addresses and VM/Proxmox/NAS deployment instructions are retired. Use [AWS_INFRA_REFERENCE.md](../AWS_INFRA_REFERENCE.md). Preserve historical evidence and optional device/external connectors.

# Pulse live integration — implementation summary (Apr 16 2026)

**Status:** Partial automated delivery in-repo; VM secrets and Supabase project remain operator-owned.

## Delivered in this change set

| Area | What |
|------|------|
| **MAS proxy** | `POST /api/pulse/mas-task` forwards JSON to `{MAS_API_URL}/api/tasks/submit`. Auth via `x-pulse-internal-key` = `PULSE_MAS_PROXY_SECRET`, or dev-only `PULSE_ALLOW_OPEN_MAS_PROXY=1`. `GET` documents capability (no secrets). |
| **Ops visibility** | `GET /api/pulse/config-status` — booleans only for which env vars are set. |
| **Deep health** | `GET /api/health?deep=1` now probes **NatureOS** (`/health` or `/api/health`) in addition to MAS and MINDEX. |
| **Supabase (optional)** | `lib/supabase/server.ts` + `supabase/migrations/001_mycodao_pulse_agent_runs.sql`. `GET /api/pulse/agent-runs` lists recent rows (requires same internal key as MAS proxy). |
| **Smoke** | `scripts/pulse-smoke-local.mjs` also hits `health?deep=1`, `config-status`, `mas-task` GET. |

## Environment checklist (VM: `/opt/mycodao/.env.production`)

Set these **outside git** (never commit `.env.production`):

- **MAS:** `MAS_API_URL`, `PULSE_MAS_PROXY_SECRET` (and/or LAN-only `PULSE_ALLOW_OPEN_MAS_PROXY=1`).
- **Backends:** `MINDEX_API_URL`, `NATUREOS_API_URL`, optional `MINDEX_INTERNAL_TOKEN`.
- **Feeds:** `FINNHUB_API_KEY`, `GNEWS_API_KEY` / `NEWS_API_KEY`, `PODCAST_RSS_URLS`, `MYCO_SOLANA_MINT` as applicable.
- **Trading:** `TRADING_BROKER_BASE_URL`, `PULSE_TRADING_API_KEY`, etc. (see `.env.example`).
- **Pulse UX:** `NEXT_PUBLIC_BASE_PATH`, `NEXT_PUBLIC_PULSE_SSE=1` when SSE should run.
- **Supabase (optional):** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` for future client auth.

## MCP / “agentic” scope

Browser MCP is for **development**. In-product automation uses **server-side** calls: Pulse Next routes → MAS APIs (this proxy). Do not expose service keys to the browser.

## Verification

```bash
cd MYCODAO
npm install
npm run dev   # port 3004
# other terminal:
npm run test:pulse-smoke
npm run check:backends
```

Production smoke:

```bash
npm run test:pulse-smoke:prod
```

## Related docs

- `docs/PULSE_FULL_FUNCTIONALITY_GAPS_APR14_2026.md`
- `docs/MYCODAO_SUPABASE_MINDEX_MAS_ORCHESTRATION_FULL_PLAN_APR14_2026.md`

## Follow-ups (not automated here)

- Wire UI actions to **Server Actions** calling `POST /api/pulse/mas-task` with secret only on server, or add Supabase JWT gate.
- Insert into `pulse_agent_runs` from the MAS proxy on successful submit (optional).
- Sentry, Playwright, full auth — per product plan.
