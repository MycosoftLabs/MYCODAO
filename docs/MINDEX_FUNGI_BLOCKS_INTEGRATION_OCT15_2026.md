# MINDEX fungi → MycoDAO Blocks integration — October 15, 2026

**Status:** Code complete on owned worktrees; activation gates remain (license, Supabase 009, MINDEX export deploy, FungiP pilot, signer)  
**Handoff:** `CURSOR-MINDEX-FUNGI-BLOCKS-HANDOFF.md` (Codex artifacts, Oct 15 2026)

## Exact source identities

| Repo | Branch | Commit / evidence |
| --- | --- | --- |
| MycoDAO | `cursor/mindex-fungi-blocks-oct15` | Cherry-pick of `edd70e4` → `580dfdb` + fungi integration commit |
| Worktree | `D:/Users/admin2/Desktop/MYCOSOFT/CODE/_wt/mycodao-fungi-blocks-oct15` | owned |
| MINDEX export | `cursor/mindex-mycodao-fungi-export-oct15` | base `e56daa9` + fungi export router |
| MINDEX worktree | `D:/Users/admin2/Desktop/MYCOSOFT/CODE/_wt/mindex-mycodao-fungi-export-oct15` | owned |
| Applied artifact | ZIP SHA-256 `e1cf9cd4…da72d` / commit `edd70e4` once | verified |

**Coordination:** Another Cursor agent owns Blocks AWS restore (`mycodao-blocks-aws-oct15` / ECS `mycodao-blocks`). This work stays on owned branches/worktrees and does **not** cut over production hosting.

## What shipped

### WP0 — baseline
- Owned MycoDAO worktree; applied `edd70e4` exactly once via cherry-pick → `580dfdb`.
- Species tokenization service: **60/60** tests pass locally.

### WP1 — MINDEX fungi export
- `GET /api/mindex/integrations/mycodao/fungi/export`
- `GET /api/mindex/integrations/mycodao/fungi/taxa/{uuid}`
- Purpose-scoped `MINDEX_MYCODAO_FUNGI_EXPORT_KEYS`; Fungi-only; snapshot binding; unclassified kingdoms excluded.

### WP2 — MycoDAO reference DB
- Migration `009_fungal_reference_library_oct15_2026.sql`
- Tables: grants, import releases, `fungal_taxa`, external ids, aliases, physical bridges, token associations
- Soft unique on valid `tissue_taxa.mindex_taxon_id` UUID links
- Importer: `lib/server/fungal-import.ts` (stage → publish; preserve last good on failure)

### WP3 — Public APIs + boundary repairs
- `GET /api/tissue/fungi` (+ detail + curator `POST .../sync`)
- Explicit `availability`: available | empty | partial | unavailable
- Biobank public catalog: `visibility='public'` on accession/taxon/strain/media; **503** on failure (no fake empty 200)

### WP4 — Blocks Tissue / 3D
- Catalog scopes: **Fungal library** (taxon-first) vs **Physical holdings**
- `TaxonDetailDrawer` keyed by MINDEX UUID; accession drawer still keyed by accession code
- 3D hero: physical mode uses accession codes; library mode uses `taxon:<uuid>` reference tiles (bounded, labeled Reference)
- Inventory / Replates / curator / QR paths unchanged in contract

### WP5–WP6 (wired, not activated)
- Token association projection table + detail fields (`tokenStatus`, mint, FG id, holds)
- `/species-tokens` page retained from `edd70e4` for contribution/rewards
- Genuine FungiP pilot import still **gated** on captured export inputs (not fabricated)

## WP7 verification evidence

| Check | Result | Class |
| --- | --- | --- |
| Artifact ZIP hash | Match handoff | local |
| Cherry-pick `edd70e4` | Applied once → `580dfdb` | local |
| `services/species-tokenization` tests | **60/60 pass** | local fixture |
| Root `tsc --noEmit` | **exit 0** | local |
| Pulse Vite `npm run build` | **exit 0** (~30s); assets under `public/blocks/` | local |
| Next `npm run build` | **exit 0**; routes include `/api/tissue/fungi`, `/api/tissue/fungi/[mindexTaxonUuid]`, `/api/tissue/fungi/sync`, `/species-tokens` | local |
| Pulse `tsc --noEmit` | **exit 2** — pre-existing errors in `ProducerDashboard.tsx`, `studioPresets.ts`, `useNewsProducer.ts`, `App.tsx` PulseTabId (not fungi files) | known debt |
| Local Next `:3020` `GET /api/tissue/fungi` | **503** body `availability=unavailable`, `reason=supabase_service_role_unconfigured` (correct — no fake empty 200) | local staging |
| Local `GET /species-tokens` | **200** | local |
| Local `GET /blocks/` | **200** | local |
| Browser Blocks shell | Loaded static Blocks shell on `:3020/blocks/` | local |
| Supabase migration `009` apply | Pending operator | unavailable |
| Live MINDEX export against 189 | Pending credentials + deploy | unavailable |
| AWS Blocks staging cutover | Owned by other agent — not raced | external lane |
| Mainnet / funded creation | Not authorized / not run | gated |

## Activation still required (exact)

1. Execute and record MINDEX ↔ MycoDAO data agreement (`fungal_license_grants.agreement_ref`).
2. Set `MINDEX_MYCODAO_FUNGI_EXPORT_KEYS` on MINDEX API; deploy export branch to 189.
3. Apply migration `009_…` on MycoDAO Supabase; set MycoDAO env: `TOKENIZATION_*`, export key, Supabase service role.
4. Curator `POST /api/tissue/fungi/sync` for full licensed import; retain snapshot accounting.
5. Import genuine FungiP First40 manifest + holds (FG026 etc.) — never invent mints.
6. Configure signer, MYCO mint, funding, inventory for rewards (test network first).
7. After AWS Blocks restore owner finishes, rebuild Pulse (`npm run build`) and promote with their release procedure — do not race their cutover.

## Acceptance matrix (handoff)

| Criterion | Status |
| --- | --- |
| Durable fungi-only reference replica schema + importer | **Met** (code); apply+sync **gated** |
| Preserve MINDEX UUIDs / FungiP / forty-token / holds / physical / NAS / QR / curator / replates | **Met** (additive paths; no destructive rewrite) |
| Reference vs physical clearly distinguished | **Met** (library scope + Reference tiles) |
| Public APIs never false-empty on failure | **Met** (503 + availability) |
| Integrate Tissue Library + 3D | **Met** (UI + APIs); live data **gated** on migration+import |
| Contribution rewards / species tokens page | **Met** (edd70e4 retained); mainnet **gated** |
| Full Vite + Next builds | **Met** |
| Browser / local staging smoke | **Met** (503 contract + pages 200) |
| Production / AWS promotion | **Not this lane** |

## Non-goals completed as non-claims

- No real SOL spent; no real tokens created.
- Pump fee sweeps / treasury automation not implemented.
- Website Ancestry code left untouched this pass (cross-link URL generated from MycoDAO detail only); deeper Ancestry BFF changes need the website release owner after Blocks AWS restore stabilizes.
