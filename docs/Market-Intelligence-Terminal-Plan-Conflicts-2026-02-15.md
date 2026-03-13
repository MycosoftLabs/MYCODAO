# Market Intelligence Terminal — Plan vs Existing Dashboard Architecture

**Purpose:** Review the five-phase plan against the current dashboard so implementation avoids layout breaks, data conflicts, and scope creep. This doc does **not** edit the plan; it identifies conflicts and mitigations.

---

## 1. Layout and grid (Plan: “remain unchanged”)

**Plan:** “Layout, routes, and module registry remain unchanged”; “Do not rebuild layout.”

**Current architecture:**
- **Mode 1** (`DashboardMode1.tsx`): Fixed 12-column grid, 5 rows; each cell is an explicit `<div className="col-span-*">` with a fixed module (Market Pulse, Crypto, Metals, Big Movers, … News, Status). No dynamic slots.
- **Mode 2** (`DashboardMode2.tsx`): Same grid; **row 3** is the only dynamic row — 4 slots filled by `getModulesForRotatingSlots(registry, 4)` and `RotatableSlotContent`.
- **Mode 3** (`DashboardMode3.tsx`): Different layout (focus panel + sidebar); uses a separate `FOCUS_OPTIONS` list, not the module registry.

**Potential conflicts:**

| Issue | Risk | Mitigation |
|-------|------|------------|
| **1.1 Adding Why Its Moving to Mode 1** | Plan says “add one new grid cell or replace one slot” for Why Its Moving in Mode 1. Adding a new cell changes the grid (e.g. 19 → 20 cells) and can reflow rows/columns. | **Do not** add a new grid cell in Mode 1. Keep Why Its Moving **only** as a rotatable module in Mode 2 (already in registry + `RotatableSlotContent`). If it must appear in Mode 1, **swap** one existing cell (e.g. one of Research / Calendar / Quick Links / Status) so total cell count is unchanged. |
| **1.2 New modules (Biobank, DAO Governance)** | Plan says “add to registry and grid without removing others.” In Mode 1 there are no rotatable slots — every cell is fixed. | Add Biobank and DAO Governance only to the **registry** and to **Mode 2** rotation (and optionally Mode 3 focus list later). Do **not** add two new fixed cells to Mode 1 unless we explicitly remove or merge two existing cells to keep the same grid shape. |
| **1.3 Heatmap** | Plan says replace the heatmap **placeholder** in `RotatableSlotContent`. | No layout change: keep the same slot; only the content inside the slot changes from placeholder to `MarketHeatmapModule`. Already aligned. |

**Summary:** Treat “layout unchanged” as “same grid dimensions and same number of fixed cells in Mode 1.” New modules = new **rotatable** options in Mode 2 only, unless we define a clear swap for Mode 1.

---

## 2. Phase 3 — Data overlap (MycoSnapshot, Research Funding, Biobank, DAO)

**Plan:** Extend `MycoSnapshot` with `biobank?: { samplesIndexed, labsParticipating, dataContributions }` and `governance?: { activeProposals, votingProgressPct, grantApprovals }`.

**Current architecture:**
- `ResearchFundingMetrics` already has `activeProposals` and `samplesIndexed`.
- `ResearchFundingModule` shows: grant pool, grants deployed, **active proposals**, votes today, biobank incentives, active research projects, **samples indexed**, etc.
- So the same concepts appear in both “Research Funding” and the new “Biobank Activity” / “DAO Governance” modules.

**Potential conflicts:**

| Issue | Risk | Mitigation |
|-------|------|------------|
| **2.1 Duplicate fields** | `activeProposals` in both `ResearchFundingMetrics` and `DaoGovernance`; `samplesIndexed` in both `ResearchFundingMetrics` and `BiobankActivity`. If `/api/myco` only returns `researchFunding`, then `myco?.biobank` and `myco?.governance` are undefined and the new modules show “Loading…” or empty. | Accept that mock/API can populate both: e.g. `governance.activeProposals` and `researchFunding.activeProposals` may be the same value. Document in types or adapter that when the backend only has one source, the adapter can copy e.g. `researchFunding.activeProposals` into `governance.activeProposals` so both modules have data. |
| **2.2 Semantics** | “Active proposals” in Research Funding vs “Active proposals” in DAO Governance might mean different things (e.g. grant proposals vs governance proposals). | Document the intended meaning in `lib/types.ts` or in the doc. If they are the same, use one source; if different, the API must provide both when available. |

**Summary:** Overlap is acceptable as long as mock and future API consistently fill both `researchFunding` and the new `biobank` / `governance` (by copy or by separate fields). No type or layout change required.

---

## 3. Module registry and Mode 2 rotation

**Plan:** “Keep module registry”; add new `ModuleId`s (e.g. whyMoving, biobank, daoGovernance); new modules rendered in `RotatableSlotContent`.

**Current architecture:**
- `getModulesForRotatingSlots(registry, slotCount)` uses `ROTATABLE_IDS` and sorts by `lastShownAt`, priority, freshnessScore. It returns **slotCount** module IDs (e.g. 4).
- Adding more IDs to `ROTATABLE_IDS` only increases the pool; the number of slots (4) is fixed in `DashboardMode2`. So more modules = more variety in rotation, no layout change.

**Potential conflicts:**

| Issue | Risk | Mitigation |
|-------|------|------------|
| **3.1 Default order** | New modules might appear less often if their priority/freshness is lower. | Tune `priority` and `freshnessScore` in `MODULE_REGISTRY` for new modules so they get a fair share of rotation. |
| **3.2 Switch exhaustiveness** | `RotatableSlotContent` must handle every `ModuleId` in the registry. Adding an id without a `case` in the switch causes the `default` fallback (“—”). | For every new `ModuleId` added to `MODULE_REGISTRY` and `ROTATABLE_IDS`, add a corresponding `case` in `RotatableSlotContent` that renders the correct component. |

**Summary:** No architectural conflict. Implementation must keep the switch in `RotatableSlotContent` in sync with `ModuleId` and registry.

---

## 4. Mode 3 (Broadcast / focus)

**Plan:** Does not mention Mode 3 or expanding the focus list.

**Current architecture:**
- Mode 3 uses a **separate** list: `FOCUS_OPTIONS = ["myco", "podcast", "news", "chart"]`. It does **not** use `ModuleId` or the registry for the focus panel.
- When focus is "myco", it sets `setFocusModuleId("researchFunding")` and shows MYCO Ecosystem + price/supply/chain.

**Potential conflicts:**

| Issue | Risk | Mitigation |
|-------|------|------------|
| **4.1 New modules not in Mode 3** | Why Its Moving, Biobank, DAO Governance, Heatmap are not focusable in Mode 3. | Accept for this plan: no change to Mode 3. Optional follow-up: extend `FOCUS_OPTIONS` and the focus content to include e.g. “whyMoving” or “heatmap” and render the same components. |

**Summary:** No conflict with the plan as written. Mode 3 stays as-is unless we explicitly extend it later.

---

## 5. Provider and API contracts

**Plan:** API routes call adapters; on failure return mock. Response shapes unchanged so the provider stays unchanged.

**Current architecture:**
- `PulseProvider` fetches `/api/tickers`, `/api/news`, `/api/myco`, etc., and expects `Ticker[]`, `NewsItem[]`, `MycoSnapshot`, etc.
- Adapters return the same types; routes return `NextResponse.json(...)` with that shape.

**Potential conflicts:**

| Issue | Risk | Mitigation |
|-------|------|------------|
| **5.1 Base path** | Provider uses `window.location.origin + "/mycodao.financial"` in production for API calls. If the app is deployed under a different path, requests can 404. | Out of scope for the plan; document in deployment/configuration. No change to the plan. |
| **5.2 Enrichment in refresh** | Phase 5 says “run evaluation after each refresh.” Alert evaluation needs classified/enriched news. If we run `evaluateAlerts(tickers, enrichedNews)` in the provider, we must use the same classification as the rest of the UI. | Run enrichment (classify + enrich) once per refresh and pass the result both to `setAlerts` (via `evaluateAlerts`) and to the existing `enrichedNews` useMemo (or derive from the same refresh data). Current pattern of computing enriched list inside refresh for alerts and separately via useMemo for UI is fine as long as both use the same logic. |

**Summary:** No contract conflict. Keep adapter response types aligned with existing provider types.

---

## 6. Upcoming catalysts (Phase 1.4)

**Plan:** Move Calendar/Events data to a shared list (e.g. `lib/upcoming-catalysts.ts`); later Phase 2 can back with an API.

**Current architecture:**
- `CalendarEventsModule` already uses `getUpcomingCatalysts()` from `lib/upcoming-catalysts.ts` (sync, client-side). No provider state for catalysts.

**Potential conflicts:**

| Issue | Risk | Mitigation |
|-------|------|------------|
| **6.1 Future API** | If we add `/api/catalysts` later, we need to decide: does the module fetch on mount, or does the provider hold `upcomingCatalysts` and pass it down? | Keep current behavior: module calls `getUpcomingCatalysts()` (sync). When adding an API, either (a) add `upcomingCatalysts` to the provider and fetch in refresh, or (b) have the module fetch from `/api/catalysts` and use local state. Document the choice when implementing the API. |
| **6.2 CatalystImportance** | `lib/upcoming-catalysts.ts` and `lib/news-intelligence.ts` both define an importance/impact type (“high” | “medium” | “low”). | Duplication is acceptable. Optionally re-export one type from a shared place (e.g. `lib/types.ts`) later to avoid drift. |

**Summary:** No conflict for Phase 1.4. Optional API in Phase 2 can be wired without breaking the module.

---

## 7. Alerts (Phase 5)

**Plan:** Alerts in Status module; evaluate when tickers/myco/news update; in-memory or localStorage; show last N, optional Clear/Dismiss.

**Current architecture:**
- Provider already has `alerts` state, `dismissAlert(id)`, `clearAlerts()`; runs `evaluateAlerts` after refresh and merges new alerts with dedupe.
- `StatusModule` uses `usePulse()` and shows the last 5 alerts with per-alert dismiss and Clear.

**Potential conflicts:**

| Issue | Risk | Mitigation |
|-------|------|------------|
| **7.1 Alert storm** | Every refresh that has e.g. 5 movers with |changePct| ≥ 5% could add 5 alerts; after many refreshes the list can grow. | Already mitigated: merge with dedupe (e.g. by type+symbol+message), cap list at 50, and only add alerts that are not already present. |
| **7.2 localStorage** | Plan says “in-memory or localStorage.” Current implementation is in-memory only; alerts reset on reload. | Accept in-memory for the plan. If we add localStorage persistence, do it in the provider (save on add/dismiss, load on mount) without changing the plan’s scope. |

**Summary:** No conflict. Existing implementation matches the plan.

---

## 8. NewsItem and catalystType (Phase 1.1)

**Plan:** Add optional `relatedAssets`, `catalystType`, `impactLevel` to `NewsItem`; enrichment prefers these when present.

**Current architecture:**
- `NewsItem` already has these optional fields; `CatalystType` includes the plan’s union plus e.g. `grant`, `biobank milestone`.
- `enrichNewsWithIntelligence` and `extractCatalystTags` / `importanceForItem` already prefer item fields when present.

**Potential conflicts:** None. Types and enrichment are aligned with the plan.

---

## 9. Summary table

| Area | Conflict? | Action |
|------|-----------|--------|
| Mode 1 layout | Yes — adding new fixed cells changes grid | Add new content only via Mode 2 rotation (or swap one Mode 1 cell if Why Its Moving must be fixed in Mode 1). |
| Phase 3 data overlap | Low — same numbers in two modules / two types | Document; have mock/API fill both; optionally derive from single source in adapter. |
| Registry / RotatableSlotContent | No | Keep switch in sync with every new `ModuleId`. |
| Mode 3 | No | No change required by plan. |
| Provider / API | No | Keep response shapes; enrichment + alert evaluation already compatible. |
| Upcoming catalysts | No | Already on shared list; optional API later. |
| Alerts | No | Already implemented as specified. |
| NewsItem / catalystType | No | Already implemented. |

---

## 10. Recommended implementation order (unchanged)

The plan’s suggested order remains valid:

1. Phase 1.1 — NewsItem optional fields + enrichment merge (already done).
2. Phase 1.2 — Why Its Moving module + registry/slot (already done; do **not** add a new Mode 1 cell).
3. Phase 1.4 — Upcoming catalysts data source (already done).
4. Phase 2 — Adapters + route fallback.
5. Phase 3 — Biobank + DAO modules; ensure mock/API populates `biobank` and `governance` (copy from researchFunding if needed).
6. Phase 4 — Market heatmap in existing heatmap slot.
7. Phase 5 — Alert types, evaluation, Status module (already done).

When in doubt, prefer **adding to the rotatable pool and leaving Mode 1 grid dimensions unchanged** rather than adding new fixed cells.
