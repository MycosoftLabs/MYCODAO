> **AWS topology correction 2026-11-27: production is AWS-only; this file's legacy on-prem references are not deployment authority. See [AWS_INFRA_REFERENCE.md](../AWS_INFRA_REFERENCE.md) for its replacement and disposition. Loopback development and physical-device fixtures are separate.**

# BLOCKS News 24/7 Channel Plan

**Date:** Jun 4, 2026  
**Status:** In progress — Phase 0 (OBS → YouTube → News embed)  
**Surface:** `blocks.mycodao.com/blocks/` → **News** tab

---

## Goal

Run **MycoDAO News** like Bloomberg / CNBC: always on, with scheduled **live desks**, **recorded segments**, **commercials**, and **partner/licensed feeds** — while viewers only see the Mycosoft news set (ticker, headlines, Markets Now), not operator tools or ingest URLs.

---

## Phased roadmap

### Phase 0 — Now: OBS → YouTube → BLOCKS (test)

| Piece | Role |
|-------|------|
| **OBS / Streamlabs** | Encode + RTMP to YouTube (`rtmp://a.rtmp.youtube.com/live2` + stream key from Studio) |
| **YouTube** | Temporary origin CDN (live or VOD) |
| **BLOCKS News** | Embeds current program via `/api/news/program` + `data/news-channel-schedule.json` |

**Operator checklist**

1. Go live on YouTube from OBS/Streamlabs.  
2. Either edit `data/news-channel-schedule.json` **or** set `NEWS_CHANNEL_LIVE_OVERRIDE_URL` for instant swap (no pulse rebuild).  
3. News tab polls program every 60s.

**Test video (current default):** `https://www.youtube.com/watch?v=4Vj9dlNRp4g`

### Phase 1 — Streamlabs multistream

Same OBS program; Streamlabs sends to:

- YouTube (primary origin for embed test)
- Twitch / X / LinkedIn (audience growth)
- Optional **custom RTMP** → Cloudflare Stream Live (Phase 2)

News page still plays **one** program URL from the schedule API — not RTMP directly.

### Phase 2 — Scheduled program guide (weeks 1–2)

Already scaffolded:

- `data/news-channel-schedule.json` — slots by day/time/priority  
- `GET /api/news/program` — resolves “what’s on now”  
- Slot types: `youtube_video`, `youtube_live_channel`, `commercial`, `partner_stream`, `recorded`  
- `NEWS_CHANNEL_LIVE_OVERRIDE_URL` — “go live now” without JSON edit  

**Next build-out**

- n8n or MAS cron to flip override at show times  
- MycoPOD / NAS MP4 → upload → auto slot entry  
- Commercial library table (duration, sponsor, click-through)  
- Operator UI (internal MYCA APP) to drag shows on a timeline  

### Phase 3 — True 24/7 channel (production)

YouTube embeds are **not** sufficient for a nonstop white-label channel (branding, gaps when offline, no ad insertion).

**Recommended stack**

| Layer | Technology |
|-------|------------|
| Ingest | OBS / Streamlabs → **Cloudflare Stream Live** or **Mux Live** |
| Playout | Scheduled HLS playlist or MediaMTX + playout engine |
| Ads | SCTE-35 markers or timed MP4 bumpers in playlist |
| Viewer | Custom `<video>` HLS player in `NewsLiveStage` (no YouTube iframe) |
| EPG | Program guide API + “Now / Next” on ticker |

BLOCKS graphics (ticker, headlines, Markets Now) stay as today — only the **program source** swaps from iframe → HLS.

---

## Files (Phase 0–2)

| Path | Purpose |
|------|---------|
| `data/news-channel-schedule.json` | Program schedule (edit anytime) |
| `app/api/news/program/route.ts` | Current program resolver |
| `lib/server/news-channel-program.ts` | Schedule + env override logic |
| `myco-pulse/src/hooks/useNewsProgram.ts` | News tab polls API |
| `myco-pulse/src/components/NewsLiveStage.tsx` | Full-bleed player |

## Env vars

| Variable | When |
|----------|------|
| `NEXT_PUBLIC_PULSE_NEWS_VIDEO_EMBED_URL` | Build-time fallback |
| `NEWS_CHANNEL_LIVE_OVERRIDE_URL` | **Instant** live swap (server, no rebuild) |
| `NEWS_CHANNEL_LIVE_OVERRIDE_LABEL` | Label for override slot |
| `NEWS_CHANNEL_SCHEDULE_PATH` | Custom schedule JSON path |

---

## Adding content (no redeploy)

Edit `data/news-channel-schedule.json`:

```json
{
  "id": "morgan-live-morning",
  "type": "youtube_live_channel",
  "label": "Morning Desk",
  "channelId": "UCxxxxxxxx",
  "days": [1, 2, 3, 4, 5],
  "start": "06:00",
  "end": "10:00",
  "priority": 80
}
```

Higher `priority` wins overlapping slots (e.g. commercial at priority 90 over background loop at 10).

---

## Verification

```bash
curl http://localhost:3004/api/news/program
```

Expect `embedUrl` with `youtube-nocookie.com` and your current `slotId`.

---

## Related

- MycoPOD production pipeline: `docs/MYCOPOD_PODCAST_REFERENCE_JUN06_2026.md`  
- News terminal env: `.env.example` → Pulse News section
