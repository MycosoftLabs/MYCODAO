# Biobank Digital Twin UI — Build Complete

**Date:** 2026-06-11
**Status:** Built + verified on localhost:3004 (dev). Deploy pending Morgan's go.
**Related:** `BIOBANK_DIGITAL_TWIN_ARCHITECTURE_JUN11_2026.md`, `BIOBANK_CURSOR_HANDOFF_JUN11_2026.md`
**Plan:** `.cursor/plans/biobank_digital_twin_ui_*.plan.md`

The BLOCKS Tissue tab is now an animated, Three.js-enhanced digital twin of the
physical biobank: provisioning + Brother QR labels, an accessions grid, a deep
accession-detail drawer, the public scan page, and the real lab species seeded
with their actual photos.

---

## What shipped

### Backend API routes (`app/api/tissue/admin/*`, curator-gated)
- `accessions/[code]` — GET full record (`getAccessionFull`) + PATCH fields.
- `accessions/[code]/media` — POST attach NAS media, PATCH set cover, DELETE.
- `events`, `transfers`, `contaminations`, `interactions` — POST ops (touch log,
  clone/replate with rolling ETA, contamination flip, co-culture).
- `replates` — GET units due/overdue (`listReplatesDue`).
- `strains/[code]` — GET/PATCH genetics/chemistry/phenotype/medium/label.
- `locations`, `scientists`, `experiments` — GET/POST reference data.
- Shared gate: `lib/server/tissue-route-auth.ts` (`requireCurator`).
- `lib/server/biobank.ts` extended: `getAccessionByCode`, `patchAccession`,
  `attachAccessionMedia`, `setAccessionCover`, `deleteAccessionMedia`,
  `getStrainByCode`, `patchStrain`, locations/scientists/experiments helpers,
  and `attachCovers` (batch cover serve-URL resolver, no N+1).
- **Read fallback:** list/detail reads use `service role ?? anon` so public rows
  render even when no service-role key is configured; writes still require
  service role.

### SPA (myco-pulse, React 19 + Tailwind v4 + motion + Three.js)
- `lib/tissueApi.ts` — biobank types + `provisionBiobankAccessions`,
  `fetchBiobankAccessions`, `fetchAccessionDetail`, `patchAccession`,
  `attachAccessionMedia`, `setAccessionCover`, `deleteAccessionMedia`,
  `logAccessionEvent`, `recordTransfer`, `recordContamination`,
  `fetchReplatesDue`, `biobankLabelSheetUrl`, `scanPageUrl`, `fetchTissueNasFolder`.
- `components/tissue/BiobankVaultHero.tsx` — **Three.js (R3F + drei)** living-vault
  hero: instanced helix of health-colored accession nodes, float, hover labels,
  click-to-open. Lazy-loaded (own ~917 KB chunk), dpr clamped to 2, no per-frame
  allocation. CSS/animated fallback when no WebGL or reduced-motion.
- `components/tissue/AccessionsGrid.tsx` — animated cover cards (status/health
  chips, form icon, replate-due badge).
- `components/tissue/AccessionDetailDrawer.tsx` — slide-over twin record: gallery
  + lightbox, live stream, quick actions (observe / replate now / flag contam /
  attach), NAS media browser, status/health/visibility controls, replate ETA,
  strain science (genetics/chemistry/phenotype), activity timeline, contamination
  log, QR (print label / open scan).
- `components/tissue/ProvisionPanel.tsx` — species → variant → N units → result
  block with accession codes, layout selector, **Print QR labels**, scan links.
- `components/tissue/biobankUi.tsx` — shared chips/icons/colors/ETA/capability.
- `TissueView.tsx` — hero + segmented control (Catalog | Accessions | Replates
  due | Curator), search, drawer wiring.
- `TissueCuratorPanel.tsx` — provisioning panel mounted above the legacy editor.
- Deps added: `three`, `@react-three/fiber` (9), `@react-three/drei` (10),
  `@types/three`.

### Three.js skills applied
- `threejs-builder` (local) — reference-frame discipline, dpr clamp, instancing,
  no per-frame allocation, sRGB.
- `webgpu-threejs-tsl` (GitHub dgreenheck) — noted as optional WebGPU/TSL
  enhancement behind `navigator.gpu`; WebGL is the shipped baseline.

### Data — real lab inventory (Jun 10 2026)
- `scripts/stage-lab-photos.mjs` — copy-only staging of the 30 photos in
  `tissue/6-10-2026 Lab/` into the dev mirror **and** the NAS share.
- `scripts/upload-tissue-photos-to-nas.mjs` — standalone SAFE copy-only uploader
  (dev mirror → NAS; additive, never deletes/0-bytes; `--dry-run`).
- Seeded via Supabase MCP (project `hnevnsxnhfibhbsipqvz`): 10 taxa / 10 strains /
  10 accessions + 30 media + covers. Public (verified IDs): Blue Oyster
  (`PLEOST-A-0002`), Pink Oyster, King Trumpet, Lion's Mane, Turkey Tail, False
  Turkey Tail, Wolf Lichen. Internal (unverified): Ganoderma, Mycena, Lab
  Inventory gallery (`FUNSP-A-0001`, 18 photos).
- Migration `007_biobank_media_sample_id_nullable_jun11_2026.sql` (also applied to
  prod via MCP) — lets media attach to an accession without a legacy sample.

---

## Verify (localhost:3004)
- `GET /api/tissue/scan/PLEOST-A-0002` → full record + cover serveUrl. ✓
- `GET /api/news/producer/media/serve?path=tissue/PLEOST-A-0002/cover.jpg` →
  200 image/jpeg (real 4.7 MB photo). ✓
- `GET /t/PLEOST-A-0002` and `/t/LETVUL-A-0001` → 200. ✓
- `GET /api/tissue/admin/accessions` (no token) → 401 (gated). ✓
- Internal `GANODE-A-0001` scan → not exposed publicly. ✓
- `npm run build:pulse` → clean; hero in its own lazy chunk. ✓

---

## One ops step to unlock curator writes
The deployed app and local dev currently run with the Supabase **anon** key only
(no `SUPABASE_SERVICE_ROLE_KEY` in any env). Reads degrade gracefully to public
rows, but **provisioning and all curator writes (patch / media / replate /
contaminate) require the service-role key.** To enable:
1. Add `SUPABASE_SERVICE_ROLE_KEY=<key>` to `MYCODAO/.env.local` (dev) and
   `/opt/mycodao/.env.production` (VM 198).
2. Restart dev / redeploy. Internal accessions then also become visible to
   signed-in curators, and provisioning + label printing work in-app.

(The 10 species are already seeded, so the catalog is real now; the key only
unlocks in-app editing/creation.)

---

## Deploy (on Morgan's go)
1. Commit + push MYCODAO.
2. `bash scripts/blue-green-deploy.sh --cutover` on VM 198.
3. `node scripts/upload-tissue-photos-to-nas.mjs` if any photos aren't on the NAS.
4. Purge Cloudflare. Verify localhost vs blocks.mycodao.com.

## Follow-ups
- Add service-role key (above) for full curator write path.
- Optional: public biobank accessions list so non-curators see the catalog grid
  (today public users see species via `/t/<code>` scan pages).
- Optional: WebGPU/TSL hero enhancement; hls.js for in-page HLS streams.
- Remove demo `PLEOST-A-0001` once `PLEOST-A-0002` is confirmed.
