# Cursor Handoff — Biobank Tissue Tab (front-end wiring)

**Date:** 2026-06-11
**Owner of this task:** Cursor
**Context doc:** `docs/BIOBANK_DIGITAL_TWIN_ARCHITECTURE_JUN11_2026.md`

The biobank **backend is done and live**. Your job is the BLOCKS SPA UI in `myco-pulse`:
add a provisioning + QR-label flow to the Tissue tab and surface accessions. Everything
below is already deployed and tested — you only touch `myco-pulse/src/**`.

---

## ✅ Already done (do NOT redo)

- **Migration applied to PRODUCTION Supabase** (`hnevnsxnhfibhbsipqvz`): 12 new tables
  (`tissue_taxa`, `tissue_strains`, `tissue_accessions`, `tissue_locations`,
  `tissue_scientists`, `tissue_events`, `tissue_transfers`, `tissue_contaminations`,
  `tissue_interactions`, `tissue_experiments`, `tissue_experiment_accessions`,
  `tissue_access_grants`) + 6 new columns on `tissue_media`. Existing
  `tissue_samples`/`tissue_media` untouched. Migration file:
  `supabase/migrations/005_biobank_digital_twin_jun11_2026.sql`. Optional seed:
  `006_seed_biobank_known_species_jun11_2026.sql` (not yet applied).
- **Backend routes (Next.js, live on :3004):**
  - `GET /api/tissue/scan/[code]` — public resolve (verified).
  - `POST /api/tissue/admin/accessions` — provision taxon→strain→N accessions (curator auth).
  - `GET /api/tissue/admin/accessions` — list accessions (curator auth).
  - `GET /api/tissue/admin/labels?codes=…&layout=jar|dish|roll` — printable QR sheet (verified).
  - `app/t/[accession]/page.tsx` — public scan landing page (verified).
- **Server libs:** `lib/server/biobank-id.ts`, `lib/server/biobank.ts`, `lib/server/qr.ts`,
  `types/qrcode.d.ts`. Dependency `qrcode@^1.5.4` added to `package.json` — run `npm install`.
- **Demo data:** one public accession `PLEOST-A-0001` (Blue Oyster) exists with
  `created_by='demo:biobank-loop'`. Delete later with:
  `delete from tissue_accessions where created_by='demo:biobank-loop';`
  `delete from tissue_strains where created_by='demo:biobank-loop';`
  `delete from tissue_taxa where created_by='demo:biobank-loop';`

---

## 🎯 Your task

Wire the 3-tier biobank into the Tissue tab so a curator can: **provision a species →
variant → N physical units → print Brother QR labels → scan → live record.**

### File 1 — `myco-pulse/src/lib/tissueApi.ts` (extend, don't rewrite)

Add types + functions. Reuse the existing `curatorHeaders()`, `pulseApiUrl()` helpers
already in this file.

```ts
// ---- Biobank (3-tier) ----
export interface BiobankAccession {
  id: string;
  accession_code: string;          // 'PLEOST-A-0014'  ← QR target
  strain_id: string | null;
  taxon_id: string | null;
  form: string;                    // jar|petri|slant|grain_spawn|fruiting_block|pod_*…
  container: string | null;
  agar_medium: string | null;
  status: string;                  // active|stored|incubating|fruiting|contaminated|…
  health: string;                  // healthy|watch|contaminated|dead|unknown
  replate_due_at: string | null;
  qr_url: string | null;
  visibility: "public" | "internal" | "hidden";
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProvisionResult {
  taxon: { id: string; taxon_code: string; scientific_name: string; common_name: string };
  strain: { id: string; strain_code: string; variant_key: string };
  accessions: BiobankAccession[];
  labelSheetUrl: string;           // relative; pass through pulseApiUrl() before opening
}

export async function provisionBiobankAccessions(input: {
  scientificName: string;          // required
  commonName?: string;
  category?: "mushroom" | "mold" | "mildew" | "yeast" | "lichen" | "bacteria" | "plant" | "algae" | "protist" | "other";
  kingdom?: string;
  variantKey?: string;             // "A", "B", "C1"… default "A"
  strainLabel?: string;
  origin?: string;
  form?: string;                   // default "jar"
  container?: string;
  agarMedium?: string;
  substrate?: string;
  replateIntervalDays?: number;    // sets each unit's replate_due_at
  visibility?: "public" | "internal" | "hidden"; // default "internal"
  quantity?: number;               // 1..200, default 1
  enrichFromMindex?: boolean;
}): Promise<ProvisionResult> {
  const res = await fetch(pulseApiUrl("/api/tissue/admin/accessions"), {
    method: "POST",
    headers: await curatorHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
    throw new Error(b.detail ?? b.error ?? `provision ${res.status}`);
  }
  return (await res.json()) as ProvisionResult;
}

export async function fetchBiobankAccessions(opts?: {
  status?: string;
  search?: string;
}): Promise<BiobankAccession[]> {
  const p = new URLSearchParams();
  if (opts?.status) p.set("status", opts.status);
  if (opts?.search?.trim()) p.set("search", opts.search.trim());
  const qs = p.toString();
  const res = await fetch(pulseApiUrl(`/api/tissue/admin/accessions${qs ? `?${qs}` : ""}`), {
    headers: await curatorHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(b.error ?? `accessions ${res.status}`);
  }
  const data = (await res.json()) as { accessions?: BiobankAccession[] };
  return data.accessions ?? [];
}

export function biobankLabelSheetUrl(
  codes: string[],
  layout: "jar" | "dish" | "roll" = "jar",
): string {
  return pulseApiUrl(
    `/api/tissue/admin/labels?codes=${encodeURIComponent(codes.join(","))}&layout=${layout}`,
  );
}
```

### File 2 — `myco-pulse/src/components/TissueCuratorPanel.tsx` (add a section)

Add a **"Provision biobank unit"** sub-panel (it already gates on curator auth). Fields:
`scientificName` (required), `commonName`, `category` select, `variantKey` (default A),
`form` select, `agarMedium`, `replateIntervalDays`, `quantity` (number), `visibility`
select, `enrichFromMindex` checkbox. On submit → `provisionBiobankAccessions(...)`.

On success render a result block:
- the new **strain code** + **taxon**;
- the list of **accession codes** created;
- a primary button **"Print QR labels"** → `window.open(biobankLabelSheetUrl(codes, layout), "_blank")`;
- per-code link **"Open scan page"** → `window.open(`${origin}/t/${code}`, "_blank")` (use
  `pulseApiUrl("/")`-derived origin, or `window.location.origin`);
- a layout selector (jar / dish / roll) feeding the label URL.

Match the panel's existing visual language (the file is ~700 lines; reuse its input/button
styles, the `cn()` util, lucide icons like `Dna`, `Printer`, `QrCode`, `Microscope`).

### File 3 — `myco-pulse/src/components/TissueView.tsx` (optional, phase 2)

Add an **"Accessions"** view toggle next to the existing catalog: a grid/table from
`fetchBiobankAccessions()` showing `accession_code`, species, `status`/`health` chips, and a
"replates due" highlight when `replate_due_at <= now+7d`. Clicking a row opens `/t/<code>`.
Keep the existing public `tissue_samples` catalog as-is; this is an additive tab.

---

## Build & verify

```bash
npm install                 # picks up qrcode dep
npm run build:pulse         # REQUIRED: the /blocks SPA is prebuilt static; source edits
                            # won't show until this runs (or use `npm run dev:pulse`)
# open http://localhost:3004/blocks/ → Tissue tab → CURATOR → Provision
```

**Acceptance:** Provision "Pleurotus ostreatus", variant A, quantity 6 → 6 accession codes
appear → "Print QR labels" opens a sheet of 6 scannable QR codes → scanning any one (or
opening `/t/<code>`) shows the live record.

---

## Gotchas

1. **The /blocks SPA is prebuilt.** Next routes (`/t`, `/api/tissue/*`) hot-reload, but
   `myco-pulse` source changes need `npm run build:pulse`. Don't expect SPA edits to appear
   under plain `next dev`.
2. **Curator auth:** all `/api/tissue/admin/*` calls need `Authorization: Bearer <supabase
   JWT>` via the existing `curatorHeaders()` (uses `getValidProducerAccessToken()`), and the
   caller's email must be in `TISSUE_CURATOR_ALLOWED_EMAILS` (or `NEWS_PRODUCER_ALLOWED_EMAILS`).
3. **Provision response is snake_case** (raw Supabase rows), unlike the camelCase public
   `TissueSample`. Types above reflect that — don't auto-camelCase.
4. **Label endpoint is intentionally open** and only reveals species names for `public`
   accessions; internal units print code-only. Safe to `window.open` directly.
5. **Editing files on this repo (Windows mount) can append trailing NUL bytes / truncate
   CRLF files.** After writing, verify (JSON.parse for json, build for ts). Prefer full-file
   writes over fragile in-place edits on CRLF files like `package.json`.
6. **Codes are deterministic:** `taxon = genus[0..3]+species[0..3]` upper (`PLEOST`),
   `strain = TAXON-VARIANT` (`PLEOST-A`), `accession = STRAIN-####` (`PLEOST-A-0014`),
   sequence auto-increments per strain. Logic in `lib/server/biobank-id.ts` — reuse, don't
   reinvent, if you ever need client-side preview.
