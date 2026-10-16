# MycoDAO Tokenization Automation & Myco Mushroom ID App — October 15, 2026

**Date:** 2026-10-15  
**Status:** Architecture + product blueprint (implementation in progress on species service; Myco App demo exists for showcase)  
**Audience:** Morgan, MycoDAO builders, MAS/MYCA operators, future app/product owners  
**Related:** `SPECIES-TOKENIZATION-DELIVERY.md`, `SPECIES-TOKENS-UI.md`, `services/species-tokenization/README.md`, `FUNGIP-PILOT-IMPORT.md`, `MINDEX_FUNGI_BLOCKS_INTEGRATION_OCT15_2026.md`, `app/natureapp/MYCO-App/`

---

## 1. Core product (what the DAO is for)

MycoDAO’s core product loop is:

1. **See a fungus** (phone camera or VR/AR field view).
2. **Identify it** against the licensed **MINDEX / Ancestry / FungiP** scientific graph (not a toy list).
3. **Know if it is already known** to the network, or **candidate-new** (never “new” solely because a local cache missed it).
4. **Reward contribution:**
   - **Known species:** contributor receives the **species token** (when one exists / is eligible) **plus MYCO**.
   - **Verified new concept:** mint (or finalize) the **new species token**, grant a **larger MYCO** discovery reward, and continue **progress MYCO** as genetics, lab confirmation, and proven uses advance.
5. **Keep humans out of the mint button** — agents + policy signers execute creation and payouts; curators only adjudicate science and holds.

That loop is the DAO: discovery → evidence → catalog → token → ongoing value tied to real fungal progress.

---

## 2. How we explain it to users (future app copy)

### Short (app store / onboarding)

> Point your phone at a mushroom. Myco tells you if the network already knows it. Log a real find, connect your wallet, and earn **species tokens** and **MYCO**. Find something the network has never verified before, help confirm it, and you help mint that species’ token — and keep earning MYCO as that species’ genetics and uses grow.

### In-product moments

| Moment | What the user sees | What is true underneath |
| --- | --- | --- |
| Match (known) | “Known to MINDEX — *Hericium erinaceus*” + confidence + Ancestry / Tissue links | Canonical UUID already in licensed catalog; species mint may already exist |
| Low confidence | “Need another angle / spore print / habitat” | No reward claim yet |
| Possible new | “Not matched at high confidence — submit for review” | **Candidate**, not auto-mint. Lab / curator / genetics may follow |
| Reward known | “+ species token · + MYCO” | Species-tokenization service reward job after wallet bind + policy |
| Reward new (after verification) | “Species token minted · discovery MYCO · progress unlocks later” | Creation job + holds cleared; progress MYCO is event-driven (genetics deposited, use published), not vibes |

### Hard honesty rules (never market otherwise)

- Species tokens are **contribution / coordination assets**, not legal ownership of DNA, IP, or wild organisms.
- “New” requires **scientific process** (review, optional tissue, genetics). Absence from a phone model score ≠ new taxon.
- Markets, royalties, and “uses” rewards require **recorded progress events**, not promises.
- No fake balances, no simulated species lists in production UI (replace legacy MYCO-App demo mocks before public launch).

---

## 3. Prototype path: Myco App (Mushroom ID showcase)

We already have a demo codebase for the consumer loop:

| Asset | Location / note |
| --- | --- |
| **MYCO App demo** | `MYCODAO/app/natureapp/MYCO-App/` (gamified discovery + reward vision; early stack) |
| **Product page** | [myco-app-mycodex](https://www.mycodao.com/projects/myco-app-mycodex) |
| **Original brief** | `app/natureapp/MYCO-App/attached_assets/…MYCO-App…Reward-System…txt` |

**Prototype goal (near term):** revive and showcase **Myco** as a **Mushroom ID** demo that:

1. Captures a photo (phone; VR later).
2. Calls identification → returns **MINDEX-linked** taxon (or “unmatched”).
3. Deep-links into **Blocks** Tissue / FungIP / Ancestry for the same UUID.
4. Shows **reward eligibility** (not fake coins) from the species-tokenization catalog when wired.
5. Stays clearly labeled **prototype / showcase** until signer, license, and FungiP pilot gates clear.

**Showcase narrative:** “This is how MycoDAO feels in the field — ID → known vs candidate-new → species token + MYCO.”

---

## 4. End-to-end automation (no manual minting)

Manual today (bad): human picks a species, opens a wallet UI, clicks create, copies mint, pastes into a spreadsheet.

Automated target (good):

```text
Field / App / Curator evidence
        │
        ▼
┌───────────────────┐
│  Observation bus  │  (MAS events + Myco App API)
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐     ┌──────────────────────────┐
│ Identity agents   │────▶│ MINDEX + Ancestry + FungiP│
│ (match / novelty) │     │ canonical UUIDs, holds    │
└─────────┬─────────┘     └────────────┬─────────────┘
          │                            │
          ▼                            ▼
┌───────────────────┐     ┌──────────────────────────┐
│ Review / holds    │     │ Licensed Blocks replica  │
│ (humans only here)│     │ fungal_taxa + bridges    │
└─────────┬─────────┘     └────────────┬─────────────┘
          │                            │
          └──────────┬─────────────────┘
                     ▼
          ┌──────────────────────┐
          │ Species-tokenization │  queue · fund · prepare · sign · confirm
          │ service + policy     │
          │ signer + MYCO inventory│
          └──────────┬───────────┘
                     ▼
          Solana (capped species mint / reward ATAs)
                     │
                     ▼
          Blocks FungIP · /species-tokens · Myco wallet UI
```

**Humans only:** license agreements, scientific adjudication, hold release, funding approvals, mainnet enable flags.  
**Agents + workers:** match, enqueue, metadata publish, tx prepare/submit, confirmation, reward ledger, UI projection.

---

## 5. Agents to build (MAS / MYCA) — replace manual work

Register these as real MAS agents (or extend existing ones). Each should be **task-typed**, write to the event ledger, and never hold spending keys in-process (signer is external).

| Agent | Job | Inputs | Outputs | Must not |
| --- | --- | --- | --- | --- |
| **SpeciesMatchAgent** | Map photo/embedding/text ID to MINDEX UUID | Image features, GPS, model scores | `match` / `ambiguous` / `unmatched` + confidence | Declare “new species” |
| **NoveltyTriageAgent** | Rank unmatched finds for curator queue | Unmatched observations | Priority queue + evidence pack | Auto-mint |
| **CatalogSyncAgent** | Keep MycoDAO `fungal_taxa` = licensed MINDEX fungi export | Export pages + snapshot_id | Published release / failure preserving last good | Invent taxa |
| **FungiPReconcileAgent** | Import FG001–FG040 + holds; verify mints on chain | Captured index + mint facts | Adopted mints + creation holds | Fabricate FG026 etc. |
| **TokenCreationAgent** | Drive funded capped creation jobs | Approved allocation + taxon UUID | Job states → finalized mint | Spend without policy signer |
| **RewardDispatchAgent** | Species + MYCO rewards for verified contributions | Reviewed observation + bound wallet | Reward jobs + explorer links | Pay unbound wallets |
| **ProgressRewardAgent** | Ongoing MYCO when genetics/use milestones fire | Lab genetics deposited, peer-reviewed use, Tissue events | Progress reward jobs | Pay on rumor |
| **AncestryLinkAgent** | Keep UUID ↔ Ancestry / Tissue / FungIP URLs coherent | Taxon UUID | Cross-link projection | Duplicate concepts |
| **PolicyGuardAgent** | Enforce holds, mainnet gate, spend caps | Config + job drafts | Allow / block | Bypass signer limits |

Orchestration: MYCA / MAS orchestrator schedules sync and workers; n8n may fan out webhooks (observation created → triage). Prefer **one** creation owner per mint (same sole-owner discipline as deploys).

---

## 6. Programs / middle / backend / frontend to create

### 6.1 Programs (services & workers)

| Program | Role | Status (Oct 15 2026) |
| --- | --- | --- |
| `services/species-tokenization` | Catalog, queue, Solana executor, rewards API | **Built** (60 tests); activation gated |
| Species-tokenization **worker** | Deferred prepare/submit/confirm | In package; needs deploy |
| **Policy signer** (HTTPS, remote) | Signs only policy-allowed messages | Required for mainnet; not activated |
| MINDEX **fungi export** API | Licensed Fungi-only pages | Built on branch; deploy to 189 |
| Catalog **import worker** | Snapshot walk → Supabase `fungal_taxa` | Code in MycoDAO; needs migration + keys |
| **ID inference** service | Photo → candidates (on-device or GPU) | Prototype via Myco App; production model TBD |
| **Observation API** | Store finds, link user + wallet + taxon | Partially in species UI; Myco App needs real backend |

### 6.2 Middle layer

| Piece | Responsibility |
| --- | --- |
| **MAS (188)** | Agents, event ledger, device/env context, n8n hooks |
| **MINDEX (189)** | Canonical taxa, FungiP permanent IDs, Ancestry index |
| **MycoDAO Next proxies** | `/api/species-tokens/*`, `/api/tissue/fungi*` — session → service; no keys in browser |
| **Supabase** | Auth, biobank, `fungal_*` replica, member profiles |
| **Cloudflare + ECS Blocks** | Public Blocks UX (`blocks.mycodao.com`) |
| **Wallet bind** | Phantom message verify → durable user↔pubkey |

### 6.3 Backend data contracts (must stay coherent)

| System | Identity | Link rule |
| --- | --- | --- |
| MINDEX | `mindex_taxon_uuid` | Canonical forever |
| FungiP | `FG###` permanent ID | Maps to UUID; holds block creation |
| Ancestry | Same UUID / ancestry routes | Deep link only; no second taxonomy |
| Tissue / biobank | Accession codes | Physical only; reference taxa ≠ jars |
| Species mint | Solana mint address | Verified on-chain before adopt |
| MYCO | Approved mint + inventory ATA | Rewards from funded inventory |

### 6.4 Frontend surfaces

| Surface | Purpose |
| --- | --- |
| **Myco App (prototype)** | Field ID showcase; camera → match → explain rewards |
| **Blocks → Tissue** | Fungal library vs physical holdings; curator |
| **Blocks → FungIP** | IP / vault UX **backed by real catalog** (retire mock `SPECIMENS`) |
| **`/species-tokens`** | Wallet bind, evidence, reward status |
| **mycosoft.com Ancestry** | Scientific drill-down for same UUID |
| **VR client (later)** | Same observation API; different capture UI |

---

## 7. Reward economics (product rules for automation)

Encode these as **config + policy**, not UI copy alone.

| Event | Species token | MYCO | Gate |
| --- | --- | --- | --- |
| Verified observation of **known** tokenized species | Transfer / claim of species asset (per policy) | Base contribution amount | Match UUID + review if required + wallet bound |
| Verified observation of known species **without** mint yet | Creation may be queued if funded/eligible | Base MYCO optional | Creation agent + funds |
| **Candidate new** submitted | None yet | Optional small “submit” MYCO (optional; can be zero) | Explicitly not a mint |
| **Curator/lab confirms new concept** | Mint capped species token; large discoverer allocation | Discovery MYCO | Holds clear; novelty process complete |
| **Genetics deposited / validated** | — | Progress MYCO | ProgressRewardAgent event |
| **Documented use / research milestone** | — | Progress MYCO | Evidence URI + review |

Inventory for MYCO and species rewards must be **pre-funded**; agents fail closed when inventory or signer limits are hit.

---

## 8. Build sequence (automation + Myco ID prototype)

### Phase A — Showcase (near)

1. Boot **MYCO-App** demo for demos; label as prototype.
2. Wire ID result screen to **deep links**: Blocks Tissue taxon, Ancestry UUID, FungIP when FG exists.
3. Replace FungIP mock specimens with **live** `/api/tissue/fungi` + token projection once deployed.
4. Do **not** enable mainnet rewards in the showcase build.

### Phase B — Catalog backbone

1. Apply Supabase `009_fungal_reference_library_…`.
2. Deploy MINDEX fungi export; run full licensed sync (no missing Fungi species in scope).
3. Import genuine FungiP First40 + holds; reconcile forty-token map.
4. Deploy species-tokenization service + Blocks image containing fungi + species-tokens routes.

### Phase C — Agent automation

1. Register Match / Triage / Sync / Creation / Reward / Progress / Guard agents in MAS.
2. Connect Myco App observation webhook → MAS.
3. Staging: funded test-network walkthrough (real txs on test cluster, not mainnet).
4. Mainnet only after Morgan enables gates (signer, funding, license, pilot reconciliation).

### Phase D — Product app

1. Production Myco (phone) with real ID model + observation API.
2. VR capture client sharing the same backend.
3. Progress-reward event types for genetics and uses.

---

## 9. User-education kit (for the future app)

Prepare these once, reuse everywhere (Myco, Blocks, DAO docs):

1. **One-pager:** “How Myco rewards work” (section 2 short copy).
2. **Diagram:** known vs candidate-new vs verified-new (section 4).
3. **FAQ:** “Do I own the mushroom / DNA?” → No; you earn contribution assets.  
4. **FAQ:** “Why didn’t I get a new-species mint?” → Unmatched ≠ new; review/lab first.  
5. **Safety:** never eat from the app; ID is scientific/coordination, not culinary advice.  
6. **Wallet:** Phantom bind steps; rewards only to verified addresses.

---

## 10. What already exists vs what to build next

| Capability | Exists | Next |
| --- | --- | --- |
| Capped species creation + reward service | Yes (`services/species-tokenization`) | Deploy + configure signer/MYCO inventory |
| Blocks `/species-tokens` UI + proxies | Yes | Ship in live ECS image |
| Licensed fungi replica schema + import | Yes (branch) | Migration + full MINDEX sync |
| FungiP pilot importer/holds | Yes (offline exporter) | Genuine captured inputs |
| MYCO App demo | Yes (`app/natureapp/MYCO-App`) | Showcase + then real ID/reward wiring |
| Match / creation / progress **agents** | Partial / planned | Implement as MAS agents (section 5) |
| Production phone/VR ID | Demo-era | Prototype → production Phases A–D |
| Live Blocks fungi API | Not on AWS image yet (404) | Promote fungi branch after catalog sync |

---

## 11. Non-goals (keep the DAO sharp)

- Manual spreadsheet mints as a process.
- Declaring novelty from model miss alone.
- Fee sweeps, Pump treasury automation, tax filing, or legal IP assignment as part of this service.
- Mock species or fake balances in any public surface after the showcase phase.

---

## 12. One-sentence north star

**Myco (phone/VR) finds fungi; MINDEX decides identity; agents mint and pay; Blocks and FungIP show the living catalog — so discovery compounds into species tokens and MYCO without anyone babysitting a wallet.**
