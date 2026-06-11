# BLOCKS Scheduler Integrations — Production Deploy Complete

**Date:** June 11, 2026  
**Status:** Complete  
**Related:** `docs/BLOCKS_SCHEDULER_INTEGRATIONS_PHASE2_LOCAL_JUN09_2026.md`, commit `1fefb75` (MYCODAO)

## Summary

Phase 2 scheduler integrations (except Asana) are **live** on `https://blocks.mycodao.com` via **blue-green cutover** on VM **192.168.0.198**. Google Calendar **hourly auto-import** is enabled through **n8n** on MAS VM **192.168.0.188**.

## Deploy steps executed

| Step | Result |
|------|--------|
| Push MYCODAO `main` → GitHub (`1fefb75`) | Done |
| VM 198 `git reset --hard origin/main` | Done |
| `scripts/blue-green-deploy.sh --cutover` | **Green** slot active (`mycodao-green`) |
| Cloudflare cache purge | Done |
| Calendar cron import (`/api/news/producer/integrations/calendar/cron`) | `ok: true`, 4 schedule slots |
| n8n workflow **BLOCKS Calendar Auto-Import** | Imported + **active** on `myca-n8n` |
| n8n env `BLOCKS_BASE_URL`, `BLOCKS_SCHEDULER_CRON_SECRET` | Set in compose + container recreated |

## Verification

```text
GET https://blocks.mycodao.com/healthz          → 200, X-Active-Slot: green
GET .../integrations/calendar?daysAhead=14      → events returned (TEST Jun 12)
POST .../integrations/calendar/cron (cron hdr)  → {"ok":true,"imported":0,"totalSlots":4}
GET https://blocks.mycodao.com/api/news/epg       → public EPG endpoint up
n8n list:workflow | grep BLOCKS                 → blocks-calendar-auto-import | active
```

## n8n hourly auto-import

- **Workflow file:** `n8n/workflows/blocks_calendar_auto_import.json` (MAS repo) / `workflows/n8n/blocks-calendar-auto-import.json` (MYCODAO)
- **Schedule:** every hour
- **Target:** `GET https://blocks.mycodao.com/api/news/producer/integrations/calendar/cron`
- **Auth header:** `x-blocks-cron-secret` from `$env.BLOCKS_SCHEDULER_CRON_SECRET`
- **Deploy scripts:** `scripts/deploy_blocks_n8n_workflow_ssh.py`, `scripts/configure_n8n_blocks_env.py`

## Producer UI (live)

Under **Show Streamlabs & automation** → **Integrations hub** (EPG preview, NAS ingest, commercials, hub status).

## Git commits (final merge)

| Repo | Commit | Branch |
|------|--------|--------|
| **MYCODAO** | `53a93cd` | `main` — post-deploy scripts, prod smoke test, completion doc |
| **MAS** | `85a81f366` | `main` — `n8n/workflows/blocks_calendar_auto_import.json` merged from feature branch |

## Production deploy (June 11, 2026 — second cutover)

| Step | Result |
|------|--------|
| VM 198 `git reset --hard origin/main` @ `53a93cd` | Done |
| Docker disk cleanup (98% → 27% on `/`) | Required before rebuild |
| `bash scripts/blue-green-deploy.sh --cutover` | **Blue** slot active (`mycodao-blue-20260611225951`) |
| Cloudflare purge | Done |

## Post-deploy verification (all pass)

Run: `node scripts/test-scheduler-integrations-prod.mjs` (with `BLOCKS_SCHEDULER_CRON_SECRET` from VM).

| Check | Result |
|-------|--------|
| `GET /healthz` | 200 — `X-Active-Slot: blue` |
| `GET /api/news/epg` | 200 |
| `GET .../integrations/calendar?daysAhead=14` | 200 — TEST event Jun 12 visible |
| `GET .../integrations/calendar/cron` | 200 — `ok: true`, `totalSlots: 4` |
| MINDEX API `192.168.0.189:8000/health` | 200 `healthy` |
| n8n `192.168.0.188:5678/healthz` | 200 |
| n8n workflow `BLOCKS Calendar Auto-Import` | Listed + active |
| n8n env `BLOCKS_BASE_URL` | `https://blocks.mycodao.com` |

## MINDEX integration scope

**No MINDEX repo changes required** for BLOCKS Scheduler Phase 2.

| Integration | Backend | MINDEX? |
|-------------|---------|---------|
| Google Calendar → slots | Blocks VM data + cron | No |
| MAS notify | Outbound webhook to `192.168.0.188:8001` | No |
| Supabase audit | Supabase direct | No |
| Finnhub / NAS / OBS / YouTube | External APIs + local files | No |
| Species / taxonomy for news | Future — would use MINDEX if added | Not in Phase 2 |

MINDEX VM health confirmed reachable from dev LAN during verification. See `MINDEX/mindex/docs/BLOCKS_SCHEDULER_MINDEX_SCOPE_JUN11_2026.md`.

## Known follow-ups

1. **Refresh `N8N_API_KEY`** in `.credentials.local` so `scripts/deploy_n8n_workflows.py` can manage workflows without SSH/CLI (current key returns 401).
2. **VM 198 disk:** schedule periodic `docker system prune` — full rebuild needs ~10GB free during Next.js build.
3. **Rotate n8n basic-auth** on 188 compose (legacy value on VM only).

## How to re-deploy

```bash
# Blocks (198)
ssh mycosoft@192.168.0.198
cd /opt/mycodao && git pull && ./scripts/blue-green-deploy.sh --cutover

# n8n workflow + env (from dev PC)
python scripts/configure_n8n_blocks_env.py
python scripts/deploy_blocks_n8n_workflow_ssh.py
python scripts/_recreate_n8n.py   # if container name conflict
```
