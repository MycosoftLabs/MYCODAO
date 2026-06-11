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

## Known follow-ups

1. **MAS `main`:** merge `blocks_calendar_auto_import.json` from feature branch so repo ↔ n8n parity includes this workflow in standard `deploy_n8n_workflows.py` runs (requires fresh `N8N_API_KEY` on 188 — current key returns 401).
2. **Rotate n8n basic-auth password** on 188 compose (legacy value still in compose file; not committed here).
3. **EPG public slot count** may be 0 until slots are marked for broadcast window; producer calendar import is the source of truth for grid slots.

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
