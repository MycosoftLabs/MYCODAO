# BLOCKS Scheduler Integrations Phase 2 — Local Build Complete

**Date:** June 9, 2026  
**Status:** Complete (local only — **not deployed**)  
**Related:** `docs/SCHEDULER_STREAMLABS_GCAL_COMPLETE_JUN10_2026.md`, `docs/BLOCKS_NEWS_24_7_CHANNEL_PLAN_JUN04_2026.md`

## Scope

Built all proposed scheduler integrations **except Asana**, for local dev and test on port **3004**. No VM deploy, no Cloudflare purge, no production push until Morgan approves.

## Delivered

### Types & config (`lib/server/blocks-scheduler-types.ts`)

Extended `SchedulerIntegrations` with:

| Block | Purpose |
|-------|---------|
| `notifications` | Slack / Discord / generic webhooks |
| `youtube` | Live channel status + priority boost config |
| `obs` | OBS WebSocket 5 scene switch |
| `multistream` | Restream read-only status |
| `nasIngest` | Scan NAS → propose/apply schedule slots |
| `mas` | Outbound events to MAS webhook |
| `finnhub` | US market-hours priority boost for Markets Now |
| `cloudflare` | Optional purge on schedule save |
| `supabaseAudit` | Schedule change audit rows |
| `webhookOut` | Signed outbound webhooks on slot/schedule events |
| `streamingOrigin` | Cloudflare Stream / Mux config stub (Phase 3) |
| `CommercialLibraryEntry` | Ad library JSON schema |

### Server modules (`lib/server/integrations/`)

- `integration-notify.ts` — Slack/Discord/generic POST
- `integration-webhook-out.ts` — HMAC-signed outbound webhooks
- `integration-youtube.ts` — YouTube Data API or `/live` page fallback
- `obs-websocket-client.ts` — OBS WebSocket 5 (uses `ws` package)
- `integration-epg.ts` — Now / Next / upcoming
- `nas-ingest.ts` — NAS scan → slot proposals
- `commercial-library.ts` — CRUD in `data/commercial-library.json`
- `multistream-status.ts` — Restream API status
- `mas-notify.ts` — MAS webhook POST
- `finnhub-scheduler.ts` — Market-hours priority boost
- `cloudflare-purge.ts` — Purge Everything (env-gated)
- `supabase-audit.ts` — Audit insert
- `streaming-origin.ts` — Origin health stub
- `integration-events.ts` — Hooks on schedule save + slot change
- `integration-hub-status.ts` — Aggregated health for Producer UI

### Event wiring

- `writeNewsChannelSchedule()` → notifications, webhooks, Supabase audit, optional CF purge
- Active slot change → OBS scene, notifications, webhook-out, MAS
- `resolveScheduleProgramNow()` → Finnhub priority boost on slot sort

### API routes

| Route | Auth | Notes |
|-------|------|-------|
| `GET /api/news/epg` | Public | Now / Next EPG |
| `GET/POST /api/news/producer/integrations/hub` | Producer | Status + test actions |
| `GET/POST /api/news/producer/commercials` | Producer | Ad library |

Hub POST actions: `save_integrations`, `test_notifications`, `test_obs`, `obs_switch_scene`, `test_mas`, `test_webhook_out`, `nas_ingest_preview`, `nas_ingest_apply`.

### Producer UI

- `SchedulerIntegrationsHub.tsx` — extended settings panel (notifications, OBS, YouTube, NAS, MAS/webhooks, Finnhub/CF/audit)
- `SchedulerIntegrationsSection.tsx` — draft types extended
- `useSchedulerIntegrations.ts` — hub status + actions
- `ProducerDashboard.tsx` — hub panel under “Show Streamlabs & automation”

### n8n template

- `workflows/n8n/blocks-scheduler-slot-reminder.json` — EPG poll + generic notify webhook (import to MAS n8n when ready)

### Local test

```powershell
cd D:\Users\admin2\Desktop\MYCOSOFT\CODE\MYCODAO
npm install
npm run dev          # external terminal, port 3004
npm run test:scheduler-integrations
# Optional auth tests:
# $env:PRODUCER_ACCESS_TOKEN = "<supabase session token>"
# npm run test:scheduler-integrations
```

## Env vars (optional, `.env.local`)

| Variable | Use |
|----------|-----|
| `BLOCKS_SLACK_WEBHOOK_URL` | Slack notifications |
| `BLOCKS_DISCORD_WEBHOOK_URL` | Discord notifications |
| `BLOCKS_NOTIFY_WEBHOOK_URL` | Generic / n8n notify |
| `YOUTUBE_API_KEY` | YouTube live API (optional) |
| `BLOCKS_YOUTUBE_CHANNEL_ID` | Primary channel |
| `OBS_WEBSOCKET_HOST` / `PORT` / `PASSWORD` | OBS |
| `RESTREAM_API_TOKEN` | Multistream status |
| `MAS_SCHEDULER_WEBHOOK_URL` | MAS events |
| `CLOUDFLARE_ZONE_ID` + `CLOUDFLARE_API_TOKEN` | Purge on save |
| `BLOCKS_NAS_DEV_MIRROR` | Local NAS mirror for ingest tests |

## Explicitly excluded

- **Asana** — not implemented per Morgan
- **Production deploy** — blocked until explicit approval

## Verify locally

1. Open `http://localhost:3004/blocks/#producer` → Schedule tab
2. Toggle **Show Streamlabs & automation** — calendar + Streamlabs + **Integrations hub** visible
3. `curl http://localhost:3004/api/news/epg` — JSON with `now` / `next`
4. Save integration settings → `data/news-channel-schedule.json` updated (no VM)

### Smoke test results (June 11, 2026 — local only)

| Check | Result | Notes |
|-------|--------|-------|
| `npm run build` | Pass | Next.js + pulse Vite |
| `GET /api/news/epg` | Pass | Public now/next |
| `GET .../integrations/calendar` | Degraded OK | 503 when iCal URL 404; route + UI still valid |
| `GET .../integrations/streamlabs` | Pass | |
| Hub + commercials | Skip without token | Set `PRODUCER_ACCESS_TOKEN` (Supabase session JWT) |
| Deploy VM 198 | **Not run** | Blocked until Morgan approves |

```powershell
cd D:\Users\admin2\Desktop\MYCOSOFT\CODE\MYCODAO
npm run build
npm run dev   # external terminal, port 3004
npm run test:scheduler-integrations
# Optional:
# $env:PRODUCER_ACCESS_TOKEN = "<supabase access_token>"
# npm run test:scheduler-integrations
```

## Follow-up (when deploy approved)

1. Commit + push MYCODAO
2. SSH VM 198, pull, rebuild, blue-green deploy
3. Import n8n reminder workflow to MAS VM 188
4. Purge Cloudflare for blocks.mycodao.com

## Lessons learned

- Keep integration surface behind one **hub** route for status/tests; avoids route sprawl.
- OBS WebSocket needs `ws` on Node; do not assume global WebSocket in Next API routes.
- NAS ingest and CF purge should stay **opt-in** locally to avoid accidental slot creation or cache purge without credentials.
