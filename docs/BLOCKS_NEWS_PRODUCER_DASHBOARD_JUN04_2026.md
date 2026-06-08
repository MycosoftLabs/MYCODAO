# BLOCKS News Producer Dashboard — Jun 04, 2026

**Status:** Complete  
**Scope:** Live producer control for BLOCKS News (talent name tags, program cut-ins, bumpers/commercials)

## What shipped

- **Producer API** — `GET /api/news/producer` (public read), `PATCH /api/news/producer` (auth)
- **Runtime state** — `data/news-producer-state.json` (on-air now)
- **Presets** — `data/news-producer-presets.json` (talent + bumper/commercial buttons)
- **Producer UI** — `#producer` hash route in Pulse SPA
- **News widget** — lower-thirds poll producer state every ~5s (default: Morgan Rockwell)
- **Program resolver** — producer program override wins over schedule/env

## URLs

| Surface | URL |
|---------|-----|
| Viewer News tab | `http://localhost:3004/blocks/` → News |
| Producer dashboard | `http://localhost:3004/blocks/#producer` or `?producer=1` |
| Producer API | `GET/PATCH /api/news/producer` |

## Quick start (live show)

1. Open **producer dashboard** in a second browser/tab: `/blocks/#producer`
2. Under **Talent**, tap **Morgan Rockwell** (or custom name/roles)
3. Viewers on the News tab pick up the tag within ~5 seconds
4. To cut to a bumper/commercial: add YouTube `videoId` or `videoUrl` in `data/news-producer-presets.json`, then tap the preset in producer UI
5. **Return to live** clears override and resumes schedule/default embed

## Auth (production)

Set on the MYCODAO server:

```env
NEWS_PRODUCER_API_KEY=<long-random-secret>
```

In the producer dashboard, paste the key once (stored in `sessionStorage` for the session). PATCH sends header `x-news-producer-key`.

Dev without the env var allows open PATCH.

## Adding commercials / bumpers

Edit `data/news-producer-presets.json` → `program` array:

```json
{
  "id": "commercial-mycodao",
  "label": "MycoDAO Commercial",
  "type": "commercial",
  "videoId": "YOUR_YOUTUBE_ID"
}
```

No Pulse rebuild required — producer UI reads presets on each GET.

## Verify

```powershell
Invoke-RestMethod http://localhost:3004/api/news/producer
Invoke-RestMethod http://localhost:3004/api/news/program
```

After PATCH talent, News lower-third should show the new name within ~5s.
