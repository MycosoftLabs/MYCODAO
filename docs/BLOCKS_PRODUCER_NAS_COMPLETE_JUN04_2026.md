# BLOCKS Producer NAS Integration — Complete (Jun 04, 2026)

**Status:** Complete  
**Related:** `docs/BLOCKS_NEWS_PRODUCER_DASHBOARD_JUN04_2026.md`, MINDEX `MINDEX_LIBRARY_NAS_MOUNT_MAY27_2026.md`

## What was delivered

### NAS media library

- Server module: `lib/server/blocks-nas-media.ts`
- Scans folders under `MYCODAO/BLOCKS` on UniFi NAS `192.168.0.105`:
  - `commercials/`, `shows/`, `live-streams/`, `graphics/`, `bumpers/`
- APIs:
  - `GET /api/news/producer/media` — catalog + mount status
  - `GET /api/news/producer/media/serve?path=...` — stream MP4/images (Range support for video)

### Producer control

- Extended `news-producer.ts` with `nasPath`, `fireNasAsset`, `activeGraphicNasPath`
- `PATCH /api/news/producer` accepts NAS cut-ins and graphic overlays
- `GET/PATCH /api/news/producer/schedule` — edit `data/news-channel-schedule.json`
- Schedule slots support `nasPath` alongside YouTube fields
- `nextChangeAt` computed from slot boundaries

### Viewer playout

- `NewsLiveStage` plays NAS MP4 via `<video>` when `mediaUrl` is set
- Graphic overlay from NAS `graphics/` folder
- `useNewsProgram` exposes `mediaUrl`, `graphicUrl`, `isNasPlayback`

### Producer UI (`/blocks/#producer`)

- Tabs: Overview, NAS Library, Scheduler, Talent, Program
- Browse NAS assets by category, preview, **Cut to air** / **Overlay**
- Visual schedule editor with `nasPath`, times, days, priority

## Environment

Set on MYCODAO server (never commit secrets):

```env
NEWS_PRODUCER_API_KEY=<your-key>
NAS_HOST=192.168.0.105
NAS_SMB_USER=mycosoft
NAS_SMB_PASSWORD=<from .credentials.local>
BLOCKS_NAS_CIFS_URL=//192.168.0.105/MYCODAO/BLOCKS
BLOCKS_NAS_ROOT=/mnt/nas/mycodao/BLOCKS   # Linux VM after CIFS mount
```

Windows dev:

```env
BLOCKS_NAS_ROOT=\\192.168.0.105\MYCODAO\BLOCKS
npm run mount:nas   # mounts \\192.168.0.105\MYCODAO (loads NAS_SMB_* from .credentials.local)
```

Web upload: [NAS BLOCKS folder](https://192.168.0.105/drive/shared-drives/MYCODAO/BLOCKS) · [UniFi Drop](https://drop.ui.com/8b266a1c-8adb-4cdd-b127-cbb216741114)

## Verify

1. Mount NAS BLOCKS path on MYCODAO VM (same creds as MINDEX library mount).
2. Drop `commercials/test.mp4` on NAS, run **Sync** in producer NAS tab.
3. **Cut to air** — viewer should show video (not YouTube iframe).
4. Edit schedule slot with `nasPath`, save, confirm auto playout in window.
5. Paste producer key in dashboard, confirm PATCH returns 401 without key in production.

## Known gaps

- No duration-based auto-return after commercial ends (manual **Return to live** or schedule slot end).
- HLS `.m3u8` listed but not fully tested; prefer MP4 for now.
- VM Docker must mount NAS volume for production serve path.
