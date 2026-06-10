# BLOCKS Scheduler Phase 2 — Auto go-on-air, GCal export, n8n cron — Complete (Jun 10, 2026)

**Date:** Jun 10, 2026  
**Status:** Complete  
**Related:** `SCHEDULER_STREAMLABS_GCAL_COMPLETE_JUN10_2026.md`, `BLOCKS_PRODUCER_LIVE_GO_LIVE_JUN09_2026.md`

---

## Delivered

| Feature | Implementation |
|---------|----------------|
| Auto go on air | `syncSchedulerSlotAutomation()` when slot with `programPresetId` becomes active |
| Auto push live | `pushShowLive` after go-on-air when `autoPushLiveOnSlotStart` (default true) |
| Auto end show | `returnToLive` when scheduler-owned show slot ends |
| Google Calendar export | `scheduleToIcal()` + download + public subscribe feed URL |
| n8n auto-import | `GET/POST .../calendar/cron` + `workflows/n8n/blocks-scheduler-calendar-sync.json` |

### New / updated files

- `lib/server/blocks-scheduler-auto-actions.ts`
- `lib/server/google-calendar-export.ts`
- `lib/server/blocks-calendar-sync.ts`
- `lib/server/producer-cron-auth.ts`
- `app/api/news/producer/integrations/calendar/feed/route.ts`
- `app/api/news/producer/integrations/calendar/cron/route.ts`
- `workflows/n8n/blocks-scheduler-calendar-sync.json`
- Producer UI: automation toggles, export .ics, generate subscribe URL

---

## Operator setup

### Auto go on air

1. Scheduler → **Show integrations**
2. Enable **Auto go on air when slot with program preset starts**
3. On each slot, set **Program preset** (show id)
4. **Save schedule**

Manual producer overrides (`programOverride`) block automation.

### Google Calendar two-way

**Import:** public iCal URL → **Import calendar → slots**

**Export to Google (subscribe):**

1. **Generate Google subscribe URL** → copy URL
2. Google Calendar → **Add calendar** → **From URL** → paste feed URL
3. Slots with RRULE sync as recurring events (read-only in Google)

**Download:** **Download .ics export** for manual import.

### n8n hourly sync

1. Set `BLOCKS_SCHEDULER_CRON_SECRET` on BLOCKS VM
2. Enable **n8n hourly auto-import** in integrations + save
3. Import `workflows/n8n/blocks-scheduler-calendar-sync.json` on MAS n8n
4. Set n8n env: `BLOCKS_BASE_URL`, `BLOCKS_SCHEDULER_CRON_SECRET`

---

## Env vars

| Variable | Purpose |
|----------|---------|
| `BLOCKS_SCHEDULER_CRON_SECRET` | n8n / cron auth |
| `BLOCKS_CALENDAR_FEED_TOKEN` | Optional global feed token |
| `BLOCKS_PUBLIC_BASE_URL` | Feed URL host in API responses |
| `GOOGLE_CALENDAR_ICAL_URL` / `GOOGLE_CALENDAR_ID` | Import fallback |

---

## Verification

- `npm run build:pulse` — pass
- `npx tsc --noEmit` — pass
- Producer Scheduler → integrations section shows automation + export controls
