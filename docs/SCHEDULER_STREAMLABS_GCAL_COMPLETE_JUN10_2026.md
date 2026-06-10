# Scheduler Pro Studio — Streamlabs + Google Calendar — Complete (Jun 10, 2026)

**Date:** Jun 10, 2026  
**Status:** Complete  
**Scope:** MYCODAO BLOCKS producer only (no website repo)  
**Related:** `PRODUCER_PROGRAM_SIDE_PANEL_COMPLETE_JUN09_2026.md`, `BLOCKS_PRODUCER_LIVE_GO_LIVE_JUN09_2026.md`

---

## Outcome

BLOCKS **Scheduler** tab now matches the **Program** tab UX: week grid, slot list, right **SchedulerDetailPanel**, poll pause while editing, and pro integrations for **Streamlabs Desktop** (remote scene switch) and **Google Calendar** (iCal import → slots).

---

## Delivered

### Server

| Item | Path |
|------|------|
| Extended schedule + integration types | `lib/server/blocks-scheduler-types.ts` |
| Streamlabs SLOBS WebSocket RPC client | `lib/server/streamlabs-slobs-client.ts` |
| Google Calendar iCal parse + slot conversion | `lib/server/google-calendar-import.ts` |
| Last-applied Streamlabs slot runtime | `lib/server/blocks-scheduler-runtime.ts` |
| Auto scene switch on active slot change | `lib/server/news-channel-program.ts` |
| Streamlabs status / test / switch scene | `app/api/news/producer/integrations/streamlabs/route.ts` |
| Calendar list / import | `app/api/news/producer/integrations/calendar/route.ts` |
| Seed integrations block | `config/blocks-producer/news-channel-schedule.json` |

### Producer UI

| Item | Path |
|------|------|
| Week timeline grid | `myco-pulse/src/components/SchedulerWeekTimeline.tsx` |
| Slot + integrations side panel | `myco-pulse/src/components/SchedulerDetailPanel.tsx` |
| Integrations hook | `myco-pulse/src/hooks/useSchedulerIntegrations.ts` |
| Scheduler tab layout + wiring | `myco-pulse/src/components/ProducerDashboard.tsx` |
| Extended client types | `myco-pulse/src/hooks/useProducerNas.ts` |

### Slot fields (new)

- `programPresetId`, `streamlabsSceneId`, `streamlabsSceneName`
- `googleCalendarEventId`, `notes`, `color`, `enabled`

---

## Operator setup

### Streamlabs Desktop

1. On the streaming PC: **Settings → Remote Control** → show details → copy **token**.
2. Note API URL (LAN): `http://<streaming-pc-ip>:59650/api`
3. In producer **Scheduler** → open a slot → **Show integrations**:
   - Enable Streamlabs
   - Paste API URL + token
   - **Test connection**
   - Assign per-slot scene or rely on `sceneBySlotType` defaults
4. **Save schedule** — credentials persist in `data/news-channel-schedule.json` (producer auth required).

Optional env on VM (fallback if not in schedule file):

- `STREAMLABS_REMOTE_API_URL`
- `STREAMLABS_REMOTE_TOKEN`

### Google Calendar

1. Make calendar **public** or use **public iCal** link.
2. In integrations: paste **iCal URL** or **calendar ID** (email).
3. **Import calendar → slots** merges events for the next ~30 days.

Optional env:

- `GOOGLE_CALENDAR_ICAL_URL`
- `GOOGLE_CALENDAR_ID`

---

## Verification

| Check | Result |
|-------|--------|
| `npm run build:pulse` | Pass (Jun 10, 2026) |
| Scheduler tab UI | Week grid + list + side panel |
| Poll pause while panel open | Same pattern as Program tab |

### Manual acceptance

1. `npm run dev` → http://localhost:3004/blocks/#producer
2. **Scheduler** tab → tap slot → side panel opens; main list hidden on mobile.
3. Edit days/start/end → **Save schedule** → `data/news-channel-schedule.json` updates.
4. Streamlabs: test connection from integrations (streaming PC on LAN).
5. Calendar: import events → new slots with `googleCalendarEventId`.
6. Viewer **News** tab: active slot label matches **On air now** banner when off producer override.

---

## Known follow-ups

- Auto **go on air** from `programPresetId` when slot starts (not yet wired).
- Google Calendar **export** (slots → calendar) — import only in this release.
- n8n cron for calendar auto-import (`autoImportEnabled` flag reserved).
