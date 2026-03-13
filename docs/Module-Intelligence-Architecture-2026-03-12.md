# Module-Driven Intelligence Architecture — 2026-03-12

## Summary

- **No sliders:** All scrollbars removed from the dashboard (main, modules, PanelCarousel, Mode3, BottomTickers, MarketTapeStrip). Layout is fixed viewport with `overflow-hidden`; grid uses `repeat(5, minmax(0, 1fr))`.
- **Module registry extended** with `supportedModes`, `sizeSupport`, `refreshCadence`, `dataDependencies`.
- **Intelligence layer** added: normalized insight types (movers, headlines, research metrics, governance), scoring (urgency, freshness, relevance, impact), and generation from raw data. Modules remain presentational; rotation and alerts can be driven by scores.

## 1. No sliders

- **DashboardMode1 / DashboardMode2:** `main` uses `overflow-hidden` and `gridTemplateRows: repeat(5, minmax(0, 1fr))`. All grid cells use `overflow-hidden flex flex-col` so content is constrained and never shows a scrollbar.
- **PulseModule:** Content div uses `flex-1 min-h-0 overflow-hidden` (no `overflow-auto`). Section uses `flex-1 min-h-0` to fill the cell.
- **PanelCarousel:** Inner content area `overflow-auto` → `overflow-hidden`.
- **DashboardMode3:** Focus panel content `overflow-auto` → `overflow-hidden`.
- **BottomTickers / MarketTapeStrip:** `overflow-x-auto` → `overflow-hidden` (tape content may clip; no scrollbar).

## 2. Module registry (`lib/dashboard-module-types.ts`)

- **New types:** `DashboardModeId` (1 | 2 | 3), `ModuleSizeSupport` ("compact" | "full" | "both"), `RefreshCadence` (ms | "on-demand"), `DataDependency` ("tickers" | "news" | "myco" | "research" | "learn" | "podcasts" | "watchlist").
- **ModuleMetadata** now includes: `supportedModes`, `sizeSupport`, `refreshCadence`, `dataDependencies`. All registry entries populated.
- **Rotation:** `getModulesForRotatingSlots` unchanged. New `getModulesForRotatingSlotsWithScores(registry, slotCount, moduleScores?)` allows score-driven ordering (e.g. from insight composite scores).

## 3. Intelligence layer (`lib/intelligence/`)

- **insight-types.ts:** Normalized types: `MoverInsight`, `HeadlineInsight`, `CatalystInsight`, `GovernanceInsight`, `ResearchMetricsInsight`, each with `InsightScores` (urgency, freshness, relevance, impact, 0–1).
- **scoring.ts:** `freshnessScore(updatedAt)`, `urgencyFromMove(absChangePct)`, `impactFromImportance(importance)`, `compositeScore(scores, weights?)`, `defaultScores(updatedAt, importance)`.
- **generate-insights.ts:** `generateHeadlineInsights(news)`, `generateMoverInsights(tickers, enrichedNews, maxMovers)`, `generateResearchMetricsInsight(myco)`, `generateGovernanceInsight(myco)`, `generateAllInsights({ tickers, news, myco })`.
- **index.ts:** Re-exports types and functions for consumers.

## 4. Provider and modules

- **PulseProvider** now computes and exposes: `moverInsights`, `headlineInsights`, `researchMetricsInsight`, `governanceInsight` via `generateAllInsights()`. Existing `tickers`, `news`, `enrichedNews`, `whyMovingMap`, etc. unchanged.
- **Modules** remain presentational; they can continue using raw data or optionally consume insights. No required changes to existing module components. Mode 1 grid cell count unchanged.

## 5. Files touched

| Area | Files |
|------|--------|
| No sliders | `DashboardMode1.tsx`, `DashboardMode2.tsx`, `DashboardMode3.tsx`, `PulseModule.tsx`, `PanelCarousel.tsx`, `BottomTickers.tsx`, `MarketTapeStrip.tsx` |
| Registry | `lib/dashboard-module-types.ts` |
| Intelligence | `lib/intelligence/insight-types.ts`, `lib/intelligence/scoring.ts`, `lib/intelligence/generate-insights.ts`, `lib/intelligence/index.ts` |
| Provider | `lib/pulse-provider.tsx` |

## 6. Next steps (optional)

- Use `getModulesForRotatingSlotsWithScores` in the dashboard mode context when a per-module score map is available (e.g. from headline/mover composite scores).
- Migrate individual modules to render from `moverInsights` / `headlineInsights` instead of raw data for consistency.
- Use insight scores in `evaluateAlerts` for impact/urgency thresholds.
