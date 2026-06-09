# BLOCKS Producer Live Go-Live — Jun 09, 2026

**Status:** Complete — deployed VM 198 @ `c12da9e` (Jun 09, 2026)  
**Site:** https://blocks.mycodao.com

## What shipped

| Capability | Status |
|------------|--------|
| News tab shows **live program** (YouTube + NAS) | `NewsBroadcastView` + `NewsLiveStage` under CNBC chrome |
| Producer **Cut to URL** → viewer | `PATCH /api/news/producer` → `GET /api/news/program` (5s poll + slot timer) |
| **Talent** lower-thirds on air | `ProducerTalentBar` polls `GET /api/news/producer` |
| **Presets** on fresh deploy | `config/blocks-producer/*.json` + seed script + runtime fallback |
| **NAS bumpers loop** | `loopPlayback` on schedule/producer bumpers |
| **Producer NAS commercial** auto-return | `POST /api/news/program/nas-complete` on video `ended` |
| **Schedule slot boundaries** | `nextChangeAt` timer + 5s poll |
| Blue/green **data volume** | `./data` mounted at `/app/data` |
| Session refresh (producer console) | `producerSession.ts` |

## Podcast / RSS (MycoPOD)

- Episodes: `GET https://blocks.mycodao.com/api/podcasts` (JSON from RSS.com `https://media.rss.com/mycopod/feed.xml`)
- Podcast tab in Blocks UI plays enclosure URLs directly
- No blocks-hosted `feed.xml` yet — RSS.com remains canonical
- **Jun 09 prod check:** API returns `[]` until RSS.com feed has at least one `<item>` with enclosure (feed channel metadata is live; zero episodes published yet)

## NAS setup (before bumper/commercial slots play)

Upload to `\\192.168.0.105\MYCODAO\BLOCKS\` (or UniFi drive):

| Path | Purpose |
|------|---------|
| `bumpers/blocks-bumper.mp4` | Low-priority loop slot (schedule) |
| `commercials/mycodao-15s.mp4` | Noon commercial block (Mon–Fri 12:00–12:05 PT) |
| `graphics/` | Lower-third / fullscreen overlays |

VM mount: `/mnt/nas/mycodao/BLOCKS` (see `scripts/setup_blocks_nas_mount.sh`).

## Producer workflow (podcast test)

1. Open https://blocks.mycodao.com/blocks/?producer=1 — Google sign-in (allowlisted email).
2. **Program** tab — Cut to URL (YouTube) or fire NAS asset.
3. Open **News** tab in another window — program + talent should match within ~5s.
4. **Return to live** — back to schedule (YouTube live channel when streaming).
5. **Podcasts** tab — verify MycoPOD episodes load from RSS.

## Deploy

```powershell
cd D:\Users\admin2\Desktop\MYCOSOFT\CODE\MYCODAO
.\scripts\deploy-pulse-vm.ps1
```

On VM (blue/green): `DEPLOY_DIR=/opt/mycodao bash scripts/blue-green-deploy.sh --cutover`

## Verify (post-deploy Jun 09)

| Check | Result |
|-------|--------|
| `GET /api/health` | `ok: true` |
| `GET /api/news/producer` | Presets populated (talent + program) |
| `GET /api/news/program` | YouTube live channel slot active |
| `GET /api/news/producer/media` | NAS mounted, `totalAssets: 0` until upload |
| `GET /api/podcasts` | `[]` until first RSS.com episode |

```powershell
curl.exe -s https://blocks.mycodao.com/api/news/producer
curl.exe -s https://blocks.mycodao.com/api/podcasts
curl.exe -s https://blocks.mycodao.com/api/news/program
```

Hard-refresh Blocks after deploy (or purge Cloudflare) so `/blocks/` loads new `NewsBroadcastView` bundle.

## Next phase (not in this release)

OBS / Streamlabs preview, Google Calendar, producer stream monitor — planned upgrade after loop/schedule is stable.
