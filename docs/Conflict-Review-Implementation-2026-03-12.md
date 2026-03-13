# Conflict Review Implementation — 2026-03-12

**Guardrail:** `docs/Market-Intelligence-Terminal-Plan-Conflicts-2026-02-15.md`

## Rules enforced

- **Mode 1:** Grid dimensions and permanent cell count unchanged. No new permanent grid cells.
- **New modules (WhyItsMoving, BiobankActivity, DaoGovernance):** Introduced only via **Mode 2** rotation. Not added as fixed cells in Mode 1.
- **Mode 1 enrichment:** New functionality only by enriching existing modules, not by expanding the grid.
- **RotatableSlotContent:** Every `ModuleId` in the registry has a matching render case.
- **Phase 3 data:** Biobank/governance populated from mock or API; when API returns only `researchFunding`, adapter fills `biobank` and `governance` from it.
- **Mode 3:** Unchanged unless required later.

## Implemented

### 1. NewsItem: catalyst tags and relatedAssets

- **Types:** `relatedAssets`, `catalystType`, `impactLevel` already on `NewsItem` in `lib/types.ts`.
- **Enrichment:** `lib/news-intelligence.ts` already prefers these when present; `extractCatalystTags` and `extractRelatedSymbols` use them.
- **UI:** `NewsHeadline` shows `catalystTags` and `relatedSymbols` from enriched data when passed.
- **Mock:** Added `relatedAssets`, `catalystType`, and `impactLevel` to all 12 items in `getMockNews()` in `lib/mock-data.ts` so headlines display catalyst badges and related-asset badges.

### 2. Big Movers ↔ headlines

- **Already connected:** `buildWhyMovingMap(tickers, enrichedNews)` in `lib/news-intelligence.ts` links top movers to relevant headlines.
- **BigMoversModule** uses `usePulse().whyMovingMap` and passes `whyMoving={whyMovingMap.get(t.symbol)?.summary}` to each `BigMoversRow`.
- **BigMoversRow** renders the “why” line when `whyMoving` is present. No code change.

### 3. WhyItsMoving as Mode 2 rotatable module

- **Already implemented:** `WhyItsMovingModule` in `components/pulse/WhyItsMovingModule.tsx`; registered as `whyMoving` in `lib/dashboard-module-types.ts`; included in `ROTATABLE_IDS`; rendered in `RotatableSlotContent` with `case "whyMoving"`. Not added to Mode 1.

### 4. BiobankActivity and DaoGovernance as Mode 2 rotatable modules

- **Already implemented:** `BiobankActivityModule` and `DaoGovernanceModule` exist; `biobank` and `daoGovernance` are in `MODULE_REGISTRY` and `ROTATABLE_IDS`; both have cases in `RotatableSlotContent`. Not added to Mode 1.
- **Data:** `lib/adapters/myco.ts` now normalizes the snapshot: if `biobank` or `governance` are missing but `researchFunding` is present, they are filled from `researchFunding` (e.g. `samplesIndexed` → biobank, `activeProposals` / votes → governance) so Phase 3 modules always receive data when the API only returns research funding metrics.

### 5. Layout stability

- **DashboardMode1.tsx:** Not modified. Same 12-column grid, 5 rows, same fixed cells (Market Pulse, Crypto, Metals, Big Movers, Commodities, Bio, Tech, Business, row 3 fixed modules, News, Status).
- **DashboardMode2.tsx:** Row 3 remains the only dynamic row (4 rotatable slots). No new slots; WhyItsMoving, Biobank, DaoGovernance appear only via rotation.

## Files changed

| File | Change |
|------|--------|
| `lib/mock-data.ts` | Added `relatedAssets`, `catalystType`, `impactLevel` to all 12 mock news items. |
| `lib/adapters/myco.ts` | Added `ensurePhase3Fields()` to derive `biobank` and `governance` from `researchFunding` when missing; applied before returning snapshot. |

## Verification

- **ModuleId coverage:** `RotatableSlotContent` has explicit `case` for `whyMoving`, `biobank`, `daoGovernance` (and all other registry IDs). Default is only for unknown IDs.
- **Mode 1 cell count:** Unchanged; no new `<div className="col-span-*">` or new fixed modules in `DashboardMode1.tsx`.
