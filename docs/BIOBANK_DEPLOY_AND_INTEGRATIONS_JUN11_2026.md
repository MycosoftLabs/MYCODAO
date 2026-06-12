# Biobank — Auto-Image, MYCA/MINDEX Webhooks, Photoreal Hero & Production Deploy

**Date:** 2026-06-11
**Status:** Deployed to production (VM 198, blue-green) and verified.
**Builds on:** `BIOBANK_DIGITAL_TWIN_UI_COMPLETE_JUN11_2026.md`, `BIOBANK_DIGITAL_TWIN_ARCHITECTURE_JUN11_2026.md`

This session: enabled curator writes (service-role key), added no-code species
imagery + cross-system event notifications, made the hero a photoreal lab
storage facility with row navigation, and shipped it all live.

---

## 1. Service-role key wired (curator writes enabled)
- Added `SUPABASE_SERVICE_ROLE_KEY` (new `sb_secret_…` secret key) to:
  - `MYCODAO/.env.local` (dev, gitignored — never committed)
  - VM 198 `/opt/mycodao/.env.production` (prod secret store)
- Verified the key bypasses RLS (reads all 10 accessions incl. 3 internal).
- Dev `config-status` confirms `SUPABASE_SERVICE_ROLE_KEY: true`.
- Curator writes (provision, status/health/visibility patch, replate, contaminate,
  media attach) now function in dev and prod; internal specimens visible to curators.

## 2. Auto-image on provision (no code, from the lab)
- New `lib/adapters/inaturalist-image.ts` — best-effort iNaturalist lookup.
- `ensureTaxon()` now auto-fetches a live HD species photo when a new taxon is
  created and stores it on `tissue_taxa.reference_image_url/_thumb/_attribution/_source`.
- Result: a curator adds a species from the tablet (Curator → Provision) and the
  Catalog automatically shows the grown-organism photo; the unit auto-fills the
  fridge. Lab sample photos are attached via the NAS media browser (Inventory).

## 3. MYCA / MINDEX webhook notifications
- New `lib/server/biobank-notify.ts` → `notifyBiobankEvent()`.
- Fires best-effort JSON events to (env-configured, any subset):
  - `BIOBANK_WEBHOOK_URLS` (comma list, e.g. an n8n webhook)
  - `${MAS_API_URL}/api/biobank/events` (MYCA)
  - `${MINDEX_API_URL}/api/biobank/events` (MINDEX)
  - optional `BIOBANK_WEBHOOK_TOKEN` bearer
- Emitted on: `species_added` (ensureTaxon), `accession_created` (createAccession),
  `accession_updated` (patchAccession), `tissue_transferred` (transfers route),
  `tissue_contaminated` (contaminations route).
- Payload: `{ source, at, event, accessionCode?, taxonCode?, scientificName?,
  commonName?, status?, health?, detail?, performedBy? }`.
- **Receivers not built yet** on the MYCA/MINDEX side — those endpoints can consume
  these events to sync species status/lifecycle to other Mycosoft apps. Until then
  the POSTs are harmless no-ops (404s swallowed).

## 4. Photoreal hero — lab storage facility
`myco-pulse/src/components/tissue/BiobankVaultHero.tsx`:
- **Neutral stainless-steel + glass** (removed the green/cartoon look); PBR metals,
  HDRI environment reflections, real overhead fixtures + spotlights, shadows, and a
  subtle reflective floor.
- **Light mode fixed** — replaced transmission glass (caused rainbow/triangle
  artifacts) with simple physical glass; reflections/bloom toned down ~90% in light.
- **Dark mode de-shined** — lower metalness, higher roughness, lower envMap/spot
  intensity; frame edges lit so the structure reads in the dark.
- **Fahrenheit** temps + **humidity + lumen** on each cabinet's digital screen
  ("● LIVE SENSOR PENDING" — ready for real fridge sensors). Lumen varies interior
  lighting (some cabinets lit, some dark).
- **Neon section labels** (Mushrooms/Lichen/Mold/Yeast/Other) fixed on the fridge
  under the screen, with a lit neon frame (bloom), readable in the dark.
- **5 rows deep** server-room layout (instanced empty drawers for performance).
- **Row navigation** (Row 1–5 control): selecting a row hides the rows in front of
  it and flies the camera down the aisle to that layer. Selecting a jar flies to it;
  clicking empty space returns out. Angled close load framing.
- Drawers show the **accession code** label + tissue photo; CSS glass-grid fallback
  if WebGL/reduced-motion.
- Deps added: `three`, `@react-three/fiber`, `@react-three/drei`,
  `@react-three/postprocessing`, `@types/three`.

## 5. Catalog vs Inventory imagery
- **Catalog** (public): live HD species photos (iNaturalist) — the grown organism.
- **Inventory** (curator): the actual lab sample photos (NAS).
- Catalog cards show the species photo with a small lab-sample inset + attribution.

## 6. Production deploy (blue-green, VM 198)
- Commits pushed to `MycosoftLabs/MYCODAO` `main`:
  - `78e4571` biobank feature set
  - `f525a6f` root `package-lock.json` sync (qrcode) — fixed Docker `npm ci`
- `bash scripts/blue-green-deploy.sh --cutover` → built green slot, health-checked,
  nginx flipped, Cloudflare purged, 300s rollback window, stopped blue.
- **Active slot: green.** Verified live:
  - `https://blocks.mycodao.com/api/tissue/biobank` → 7 species, HD images
  - `/blocks/` 200, `/t/PLEOST-A-0002` 200
  - NAS lab cover serves 200 (image/jpeg)
- `.gitignore`: anchored `/tissue/` and `data/blocks-nas-dev/` so the ~140MB of lab
  source photos are not committed (they live on NAS + dev mirror).

## 7. Migrations applied to production Supabase (hnevnsxnhfibhbsipqvz)
- `005` biobank schema (prior), `007` `tissue_media.sample_id` nullable,
  `008` `tissue_taxa` reference-image columns. (Local files in `supabase/migrations/`.)

---

## How to add a species from a tablet (no code)
1. Open `blocks.mycodao.com` → Tissue → **Curator** → sign in (allowlisted Google).
2. **Provision biobank unit**: scientific name (+ common), variant, form, agar,
   replate cadence, quantity → Provision. HD species photo auto-attaches; accessions
   mint and appear in the fridge.
3. **Attach lab photos**: open the accession → Attach media → pick NAS files
   (drop them in `\\192.168.0.105\MYCODAO\BLOCKS\tissue\<ACCESSION>\` first).
4. Flip visibility to **public** to show it in the public Catalog.
5. Every add/modify/use emits a webhook event for MYCA/MINDEX to consume.

## Known follow-ups
- Build the MYCA + MINDEX `/api/biobank/events` receivers to act on the events.
- iNaturalist photos may be "all rights reserved" — for public production, filter to
  CC-licensed (attribution shown either way).
- Optional: drop-folder watcher to auto-attach NAS photos without manual attach.
