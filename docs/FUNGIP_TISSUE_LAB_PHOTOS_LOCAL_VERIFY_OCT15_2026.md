# FungIP + Tissue lab photos — local verify complete (Oct 15, 2026)

**Date:** 2026-10-15  
**Status:** Local + live verified (`blocks.mycodao.com` serving `index-C5nT0QbU.js`)  
**Related:** `FUNGIP_BLOCKS_UI_LIVE_COMPLETE_OCT15_2026.md`, Blocks worktree `_wt/mycodao-fungi-blocks-oct15`

## What was wrong

1. **Stale Pulse bundle on localhost:3020** — Next `public/blocks` was not rebuilt/restarted, so FungIP UI and lab-cover hero never appeared.
2. **Tissue defaulted toward empty fungal library** — MINDEX sync not published (`fungal_taxa` empty); Physical holdings have the real jars.
3. **Lab covers 404 under `next start`** — NAS path missed local mirror; fixed via `BLOCKS_NAS_ROOT` + always-fallback to `data/blocks-nas-dev`.
4. **Live `blocks.mycodao.com`** — still on older image until ECS pulls the new ECR digest.

## Local proof (localhost:3020)

| Check | Result |
|-------|--------|
| FungIP tab | Live copy: “Find fungi. Match MINDEX…”, How it works, honest empty library |
| `/api/tissue/fungi/overview` | `availability: empty`, zeros (no fake taxa) |
| Physical holdings | 63 catalog rows; **9 stored** accessions with covers |
| Cover serve | `LAROFF-A-0001/cover.jpg` → HTTP 200 (~2.8 MB) |
| Accession drawer | LAROFF-A-0001: COVER photo + STORED / JAR / strain / IN SINCE 6/12/2026 |
| Catalog hero | Prefers lab jar photo when `status=stored` + `coverServeUrl` |

## Supabase data (physical)

Stored accessions with covers: LAROFF, PLEOST, STEOST, PLEERY, HERERI, PLEDJA, GANLUC, TRAVER, LETVUL.

Local folders not yet linked as accessions: FUNSP-A-0001, GANODE-A-0001, MYCSP-A-0001, PLEOST-A-0002.

## Deploy

- ECR push digest `sha256:f9944df398134ead998ea6c7704ff71c3af3f8d68839c775439bcceaeb232af3` (includes FungIP UI + baked `data/blocks-nas-dev/tissue` ~34 files for ECS cover serving).
- ECS `mycosoft-website` / `mycodao-blocks` force-new-deployment after push.
- Dockerfile now `COPY`s `data/blocks-nas-dev` into the runner image so covers work without NAS on Fargate.

## Live proof (2026-10-15 ~23:30 PT)

| Check | Result |
|-------|--------|
| Bundle | `index-C5nT0QbU.js` includes “FungIP is how” + “Physical holdings” |
| Cover | `…/tissue/LAROFF-A-0001/cover.jpg` → HTTP 200 |
| FungIP tab | Hero + How it works media + zeros / empty-library honesty |
| Tissue | Physical holdings default; jar covers visible in grid |

## Gaps still honest

- Fungal library / FungIP FG linked counts stay **empty** until licensed MINDEX sync publishes `fungal_taxa` (no mock taxa).
- Four local folders (FUNSP, GANODE, MYCSP, PLEOST-A-0002) exist on disk but are not yet Supabase accessions.

## How to verify

1. Local: http://localhost:3020/blocks/ → FungIP + Tissue → Physical holdings → open Agarikon.
2. Live: https://blocks.mycodao.com/blocks/ → hard refresh (Ctrl+Shift+R).
