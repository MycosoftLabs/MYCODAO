# BLOCKS n8n workflows (Jun 10, 2026)

## Scheduler calendar auto-import

**File:** `blocks-scheduler-calendar-sync.json`

### Setup (MAS VM n8n or local)

1. Import workflow into n8n (188:5678).
2. Set n8n environment variables:
   - `BLOCKS_BASE_URL` — `https://blocks.mycodao.com` (or dev `http://192.168.0.x:3004`)
   - `BLOCKS_SCHEDULER_CRON_SECRET` — same value as on BLOCKS VM `.env`
3. In producer **Scheduler → integrations**, enable **Google Calendar** and **n8n hourly auto-import**.
4. Activate workflow.

### Cron endpoint (manual test)

```bash
curl -s -H "x-blocks-cron-secret: $BLOCKS_SCHEDULER_CRON_SECRET" \
  "https://blocks.mycodao.com/api/news/producer/integrations/calendar/cron"
```

Returns `{ ok, imported, totalSlots }` or `{ skipped: true, reason: "auto_import_disabled" }`.
