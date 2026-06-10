# Producer Program Side Panel — Complete (Jun 09, 2026)

**Date:** Jun 09, 2026  
**Status:** Complete  
**Related plan:** Producer Program Side Panel (MYCODAO/myco-pulse + lib/server)  
**Prerequisite:** MINDEX ETL remediation (Jun 10, 2026) — producer work unblocked  

**Scope:** MYCODAO only. No website repo changes.

---

## Outcome summary

BLOCKS Producer now uses a **split layout** (main tabs + right detail panel). Clicking a program preset **opens configuration** instead of cutting to air immediately. Per-show `ProgramShowConfig` drives title, talent, live data, commercials (manual + offset), zone graphics, and news reel / bottom bar behavior on the news viewer via `showOverlay` from `GET /api/news/producer`.

Commercial NAS cuts **resume the active show** after playback (not full off-air `returnToLive`).

---

## Delivered

### Schema and persistence

| Item | Location |
|------|----------|
| `ProgramShowConfig`, `ShowOverlayPublic`, commercial slot types | `lib/server/news-program-show-config.ts` |
| Seed + runtime JSON | `config/blocks-producer/news-program-show-configs.json` → `data/news-program-show-configs.json` |
| Runtime show session fields | `data/news-producer-state.json` via `NewsProducerState` |

Runtime fields: `selectedProgramPresetId`, `activeShowProgramId`, `showStartedAt`, `commercialFiredSlotIds`, `activeCommercialSlotId`.

### API and playout

| Patch key | Behavior |
|-----------|----------|
| `saveProgramShowConfig` | Upsert per-program config |
| `selectProgramPresetId` | UI selection only (no fire) |
| `goOnAirProgramId` | Apply config + start show stream + set show runtime |
| `fireCommercialSlot` | Manual commercial override |
| `endShow` / `returnToLive` | Clear show runtime and overlays |

| Endpoint / module | Change |
|-------------------|--------|
| `POST /api/news/program/nas-complete` | `resumeActiveShow()` when `activeShowProgramId` set; else `returnToLive` |
| `lib/server/news-program-commercials.ts` | Offset commercial timing, `maxSecondsForActiveCommercial` |
| `resolveNewsProgramNow` | Due offset commercials before show embed resolution |
| `GET /api/news/producer` | `showConfigs`, `showOverlay`, show runtime fields |

### Producer UI

| File | Change |
|------|--------|
| `ProducerDashboard.tsx` | Split layout; program list selects preset + opens panel |
| `ProgramDetailPanel.tsx` | Title, talent, live data, 0–4 commercials, reel/bar modes, Save / Go on air / End show / Fire commercial |
| `useNewsProducer.ts` | Client types for show configs and overlay |

### Viewer

| File | Change |
|------|--------|
| `CNBCNewsWidget.tsx` | `showOverlay` gates live data rail (desktop + mobile), bottom bar modes, custom ticker segments |
| `FloatingNewsRail.tsx` | `hidden` / `customText` / `graphic` modes |
| `NewsLiveStage.tsx` | `maxDurationSeconds` timeout → nas-complete resume path |
| `ProgramZoneGraphic.tsx` | NAS graphic zones via media serve URL |

When no show on air (`showOverlay` null), viewer behavior is unchanged (live Pulse news + markets only).

---

## Verification

| Check | Result |
|-------|--------|
| `npm run build` (Vite pulse + Next.js typecheck) | **Pass** (Jun 09, 2026) |
| TypeScript fix `applyShowStreamFromPreset` | `programMode = preset.type` after live early-return |
| Dev server `:3004` manual acceptance | **Not run** — dev server was not up in agent session; run locally per checklist below |

### Manual acceptance (operator)

1. `npm run dev` → http://localhost:3004/blocks/#producer (restart after `npm run build:pulse` if bundle stale).
2. Two tabs: producer + news viewer.
3. Click show preset → panel opens; news tab video unchanged.
4. Save config → `data/news-program-show-configs.json` updates.
5. Go on air → show NAS/title/talent match config.
6. News reel `hidden` → `FloatingNewsRail` absent during show.
7. Manual commercial → on end returns to same show.
8. Offset commercial (1 min test) → fires once; no double-fire.
9. Return to live → default news behavior restored.
10. Mobile 375px → list + panel usable.

---

## Deploy notes

Blue/green `./data` mount at `/app/data` (VM 198) — new JSON files persist without extra mount. Deploy via existing `scripts/deploy-pulse-vm.ps1` / blue-green cutover when ready for production.

---

## Known follow-ups (out of scope)

- Side panel for Talent / Title / Live Data / Schedule / NAS tabs
- Drag-reorder commercial timeline UI
- n8n/MAS scheduled show start (Phase 2 in 24/7 plan)

---

## Key files

| Area | Paths |
|------|--------|
| Types + patch | `lib/server/news-producer.ts`, `lib/server/news-program-show-config.ts` |
| Commercials + resume | `lib/server/news-program-commercials.ts`, `app/api/news/program/nas-complete/route.ts`, `lib/server/news-channel-program.ts` |
| API route | `app/api/news/producer/route.ts` |
| Producer UI | `myco-pulse/src/components/ProducerDashboard.tsx`, `ProgramDetailPanel.tsx` |
| Viewer | `CNBCNewsWidget.tsx`, `FloatingNewsRail.tsx`, `NewsLiveStage.tsx` |
