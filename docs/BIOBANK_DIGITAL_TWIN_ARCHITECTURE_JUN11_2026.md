# MycoDAO Biobank Digital Twin — Architecture & Build Spec

**Date:** 2026-06-11
**Status:** Foundation shipped (schema + ID/QR + scan + labels). Remainder specced below.
**System of record:** Supabase (MYCODAO project)
**Taxonomy authority + public mirror:** MINDEX
**Media binaries:** UniFi NAS `//192.168.0.105/MYCODAO/BLOCKS/tissue/<accessionCode>/`
**Primary surface:** BLOCKS (`blocks.mycodao.com`) — Tissue tab + `/t/<accession>` scan page

This is the first-of-its-kind digital twin of a living fungal (and any-species) biobank:
every physical jar, dish, slant, and grow-pod has a QR sticker that resolves to its live
record. It builds directly on the existing `tissue_samples` / `tissue_media` contract
(`TISSUE_CATALOG_CROSS_SYSTEM_CONTRACT_JUN10_2026.md`) without breaking it.

---

## 1. The identity model — 3 tiers

The core idea you asked for: separate **what species it is** from **which genetic/epigenetic
line it is** from **this exact physical unit**. Hundreds of clones of one species are grouped
into named variant lines; each physical container is its own QR-addressable accession.

```
TAXON           PLEOST                Pleurotus ostreatus  (species; authority = MINDEX/GBIF/NCBI)
  └ STRAIN      PLEOST-A              "Blue Oyster — Line A"  (a genetic/epigenetic variant you maintain)
      └ ACCESSION  PLEOST-A-0014      one jar/dish/pod  ← the QR sticker target
```

| Tier | Table | Code example | Meaning |
|------|-------|--------------|---------|
| 1 | `tissue_taxa` | `PLEOST` | The species. Links to `mindex_taxon_id`, `gbif_id`, `ncbi_taxid`. |
| 2 | `tissue_strains` | `PLEOST-A` | A variant/clone line. Holds `genetics`, `chemistry`, `phenotype`. `parent_strain_id` tracks lineage. |
| 3 | `tissue_accessions` | `PLEOST-A-0014` | One physical unit. The QR encodes its resolve URL. |

**Taxon code** = genus[0..3] + species[0..3], uppercased (`Pleurotus ostreatus → PLEOST`),
de-duplicated with a numeric suffix on collision. **Variant key** is a free letter/number you
choose (`A`, `B`, `C1`). **Accession sequence** auto-increments per strain (zero-padded to 4).
A mod-36 **check character** (`PLEOST-A-0014·D`) is printed under the QR for typo/OCR defense.

Implemented in `lib/server/biobank-id.ts` — pure, tested:
`taxonCodeFromScientificName`, `buildStrainCode`, `buildAccessionCode`, `parseAccessionCode`,
`buildScanUrl`, `computeCheckChar`, `withCheckChar`, `isAccessionCode`.

---

## 2. What the QR encodes & where scanning lands

The QR encodes a short URL: **`https://blocks.mycodao.com/t/<ACCESSION>`**
(base from `BLOCKS_PUBLIC_URL`, falls back to `https://blocks.mycodao.com`).

- Any phone camera opens it — no app needed.
- **Public** accession → full public record (species, strain, gallery, live stream, status).
- **Internal/hidden** accession → "private specimen, sign in with biobank access" page.
- Unknown code → "not registered yet — provision it in the curator panel."

Page: `app/t/[accession]/page.tsx` (server-rendered, dark lab theme).
JSON API: `GET /api/tissue/scan/<code>` → `{ found, restricted, accession }`.
Each scan writes a lightweight `tissue_events` row (`event_type='scanned'`) for analytics.

---

## 3. Brother label printing

`GET /api/tissue/admin/labels?codes=PLEOST-A-0014,PLEOST-A-0015&layout=jar`

Returns a print-optimized HTML sheet: each label carries the **server-rendered QR SVG**
(offline-capable, no CDN), the accession code, the check char, and — for public specimens
only — the species name. Open it, hit Print, peel and stick.

| Layout | Face size | Use |
|--------|-----------|-----|
| `jar` (default) | 50 × 30 mm | Mason jars, grain spawn, fruiting blocks |
| `dish` | 38 × 19 mm | Petri dishes, slants |
| `roll` | 62 × 29 mm | One label per page — Brother QL continuous roll (DK-22205/DK-1201 class) |

Works with **Brother QL** (DK label rolls) and **P-touch** printers via the system print
dialog. `@page` size is set per layout; for die-cut label sheets use `jar`/`dish` grid mode.
QR rendering uses the `qrcode` npm package (added to `package.json`) via `lib/server/qr.ts`.

> **Tuning:** if your specific Brother model/label stock needs exact margins, the three values
> to adjust live in `LAYOUTS` in `app/api/tissue/admin/labels/route.ts` (`w`, `h`, `qr` in mm).

---

## 4. Provisioning flow (taxon → strain → N accessions)

`POST /api/tissue/admin/accessions` (curator auth — `verifyTissueCuratorAuth`) does the whole
chain in one call and returns a ready-to-print label-sheet URL:

```jsonc
// request
{
  "scientificName": "Pleurotus ostreatus",
  "commonName": "Blue Oyster",
  "category": "mushroom",
  "variantKey": "A",
  "form": "jar",
  "agarMedium": "MEA",
  "replateIntervalDays": 90,
  "quantity": 12,            // makes 12 physical accessions at once
  "visibility": "internal",
  "enrichFromMindex": true   // pulls taxonomy + mindex_taxon_id
}
// response
{ "taxon": {...}, "strain": {...}, "accessions": [ ... 12 ... ],
  "labelSheetUrl": "/api/tissue/admin/labels?codes=PLEOST-A-0001,...,PLEOST-A-0012" }
```

It reuses an existing taxon (matched by scientific name) and an existing strain (matched by
strain code), so you can keep adding clones to `PLEOST-A` over time and the sequence keeps
counting. Data layer: `ensureTaxon`, `createStrain`, `createAccession`, `nextAccessionSequence`
in `lib/server/biobank.ts`.

---

## 5. Everything the twin tracks (data model)

Migration `supabase/migrations/005_biobank_digital_twin_jun11_2026.sql`.

| Table | Captures |
|-------|----------|
| `tissue_taxa` | Species, taxonomy ranks, MINDEX/GBIF/NCBI IDs, category (fungi + plant/algae/bacteria/etc.) |
| `tissue_strains` | Variant lines, lineage (`parent_strain_id`), **genetics** (ITS/barcode/markers), **chemistry** (assays/compounds), **phenotype**, preferred medium |
| `tissue_accessions` | The physical unit: form (jar/petri/slant/grain_spawn/fruiting_block/**pod_hydroponic/pod_aquaponic/pod_fungal**/…), container, **agar_medium**, substrate, **location**, status, health, viability, mass, quantity, **date_in / date_out / last_touched_at**, **replate_due_at** (ETA), passage #, clone parent, QR fields |
| `tissue_locations` | Facility→room→freezer/fridge/incubator/flow_hood/vault/**pod** hierarchy, temp/humidity |
| `tissue_scientists` | People + roles (admin/curator/scientist/technician/viewer), ORCID |
| `tissue_access_grants` | Who can read/write/admin which taxon/strain/accession/experiment |
| `tissue_events` | **The touch log** — created/observed/moved/photographed/checked_out/replated/cloned/contaminated/scanned… who + when |
| `tissue_transfers` | **Cloning / replating / passaging / slant recycling** with `due_at` ETA + `eta_days`; rolls the accession's next-due automatically |
| `tissue_contaminations` | Contaminant (+ optional contaminant taxon), severity, detection, resolution; auto-flips accession health/status |
| `tissue_interactions` | **Species/strain interactions** — antagonism / synergy / co-culture / mycoparasitism, with metrics |
| `tissue_experiments` (+ `_accessions`) | Experiments: hypothesis, protocol, status, lead, results JSON, dataset URI, member accessions + role |
| `tissue_media` (extended) | Images / video / **live stream** (`live_stream_url`, `stream_protocol` hls/rtsp/webrtc), now attachable to accession **or** strain **or** taxon; caption + captured_at |

RLS: `tissue_taxa`, `tissue_strains`, `tissue_accessions`, `tissue_experiments` allow anon
read only where `visibility='public'`. All operational tables (events, transfers,
contaminations, interactions, locations, scientists, grants, experiment membership) are
service-role-only. Writes always use the service role via curator routes — never the client.

### Things commonly forgotten — already in the model
Passage number & clone lineage; viability flag; mass + quantity; date in/out/last-touched;
replate ETA + cadence (slant recycling); contamination severity + resolution; live-stream
protocol; per-image visibility; check digit; scan telemetry; cross-strain interactions;
experiment membership roles; multi-authority taxonomy IDs (MINDEX + GBIF + NCBI); location
temperature/humidity; access grants per resource.

---

## 6. To apply the foundation

```bash
# 1. Install the new dependency (qrcode)
npm install

# 2. Apply the migration (Supabase SQL editor, or when linked:)
supabase db push        # or paste 005_biobank_digital_twin_jun11_2026.sql

# 3. Run BLOCKS
npm run dev             # http://localhost:3004

# 4. Provision a species + 12 jars (curator bearer token required)
curl -X POST http://localhost:3004/api/tissue/admin/accessions \
  -H "Authorization: Bearer $SUPABASE_USER_JWT" -H "Content-Type: application/json" \
  -d '{"scientificName":"Pleurotus ostreatus","commonName":"Blue Oyster","variantKey":"A","quantity":12,"form":"jar","enrichFromMindex":true}'

# 5. Print labels → open the returned labelSheetUrl, Ctrl/Cmd-P
# 6. Scan a sticker → lands on /t/PLEOST-A-0001
```

> An optional seed (`006_seed_biobank_known_species_jun11_2026.sql`) provisions taxa/strains/
> accessions for the species already in `tissue/6-10-2026 Lab/` at **`visibility='internal'`** so
> nothing speculative is published. Verify each ID, attach the real NAS photos, then flip to
> `public`.

---

## 7. Build-out roadmap (next, on top of this foundation)

1. **Curator UI** in the BLOCKS Tissue tab: provisioning form (species → variant → quantity →
   print), accession grid with status/health chips, "replates due this week" queue
   (`listReplatesDue`), and a media attach panel reusing the NAS media-browser.
2. **MINDEX mirror writer**: publish `visibility='public'` taxa/strains/accessions to MINDEX so
   the website/NatureOS read one source. (Read path already exists via the public API + RLS.)
3. **Live tissue streams**: register camera HLS/RTSP per accession in `tissue_media`
   (`kind='stream'`); the scan page already renders a "Watch live" affordance.
4. **Lineage graph**: visualize `parent_strain_id` / `parent_accession_id` clone trees.
5. **Scientist auth + grants UI**: surface `tissue_access_grants`.
6. **Mobile scan-to-log**: a scientist scans a sticker → quick "replated / observed /
   contaminated" buttons that POST `tissue_events` / `tissue_transfers`.

---

## 8. Files added this session

```
supabase/migrations/005_biobank_digital_twin_jun11_2026.sql   schema (12 tables + media extend + RLS)
supabase/migrations/006_seed_biobank_known_species_jun11_2026.sql  optional internal seed
lib/server/biobank-id.ts        3-tier ID + QR URL + check char (pure, tested)
lib/server/biobank.ts           data layer: resolve, provision, events, transfers, contamination, interactions
lib/server/qr.ts                server-side QR → SVG / data URL
types/qrcode.d.ts               ambient types for qrcode
app/api/tissue/scan/[code]/route.ts          public QR resolve JSON
app/api/tissue/admin/accessions/route.ts     provision + list (curator auth)
app/api/tissue/admin/labels/route.ts         Brother-printable QR label sheet
app/t/[accession]/page.tsx                   public scan landing page
package.json                    + qrcode dependency
```
