# Blocks species rewards + producer studio — status (Oct 16, 2026)

**Status:** Local implementation on worktree `_wt/mycodao-fungi-blocks-oct15` (port **3020**). **No ECS / live deploy** until Morgan approves.

**Visual QA (browser, this session):** Passed on `http://127.0.0.1:3020`.

## Track A — Species UI

- Blocks left nav on `/species-tokens` via `BlocksSideNav` — **Species rewards** current
- Hero + `#contribute` open observation `ContributionPanel` (wallet gate until Phantom verify)
- Expert determination fields (substrate/habit/locality/confidence) submitted with discoveries
- Specimen org panel: opens with MINDEX taxonomy + reference image (verified *Erysiphe necator* / FG271)

## Track B — Rewards (review → auto mint/reward)

- Engine: known-untokenized approve → `create` job + `approved_pending_mint`; after mint finalize → `settleDeferredFirstObserver` (first-observer units)
- Tokenized taxa: species units (+ MYCO if rare/new) on approve
- Next BFF: `POST /api/species-tokens/review` (header `x-species-reviewer-key`) — returns **401** without key (gate OK)
- Proxy allows `determination` on discoveries
- Ancestry/FungiP sync: `services/species-tokenization` `sync-ancestry` + `npm run bootstrap` — **163** taxa in catalog
- Local service: port **8095**, `devnet_automatic`; Next proxy `/api/species-tokens/status` → available

## Track C — Producer studio

- Preset CRUD API: `/api/news/producer/presets` (talent / title / program) — Talent UI CRUD live (5 presets)
- Durable store: JSON always; Supabase tables when service role present (`010_blocks_producer_catalogs_oct16_2026.sql`)
- Live-data picks shared via `blocks_producer_live_picks` + producer state
- Scheduler: week grid + Google Calendar panel (`Sync from Google` / `Import → slots`); on-air slot shown
- Media: S3 bucket `mycodao-blocks-media-376129856177` created; list/upload/serve OK
  - `GET /api/news/producer/media` → `available:true`, graphics asset `qa-pixel.png` visible in Media Library UI
  - `GET .../media/serve?path=library/graphics/qa-pixel.png` → HTTP 200 `image/png`
  - Helper `scripts/ensure-blocks-media-s3.ps1` (AWS CLI); Node SDK used when CLI absent
  - Local Next needs `AWS_*` + `BLOCKS_MEDIA_BUCKET` in gitignored `.env.local`

## Browser verification checklist (3020)

| Surface | Result |
|--------|--------|
| `/species-tokens` nav + service status | Service connected / DEVNET / 163 records |
| Contribute observation dialog | Opens; signed in; wallet required to submit |
| Specimen card → org panel | Taxonomy + image loaded |
| `/blocks` live Pulse | On air / markets feed |
| `/blocks?producer=1` Overview | Signed in unlocked; on-air talent/title/program |
| Producer Talent / Scheduler / Media | CRUD list, week grid, S3 All (1) / graphics |

## Verify locally

1. `cd services/species-tokenization && npm run bootstrap && npm start` (+ `npm run worker` in second terminal)
2. Next on **3020** with `SPECIES_TOKEN_SERVICE_URL` / proxy key + AWS media env set
3. `http://127.0.0.1:3020/species-tokens` — nav, contribute popup, catalog
4. Producer `?producer=1` — catalog CRUD, media `available:true`, schedule calendar

## Out of scope until approve

- ECS image push / cutover
- Mainnet broadcast / funded inventory
- mycosoft.com Ancestry code changes
