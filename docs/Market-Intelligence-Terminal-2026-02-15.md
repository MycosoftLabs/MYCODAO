# Market Intelligence Terminal — Five-Phase Implementation (2026-02-15)

## Summary

The Market Pulse dashboard was extended into a full **Market Intelligence Terminal** per the five-phase plan: intelligence layer, real data adapters, MycoDAO ecosystem modules, signature visual modules, and alerts. Layout, routes, and module registry were extended incrementally; no rebuild.

---

## Phase 1 — Market Intelligence Layer

- **1.1 NewsItem optional fields** (`lib/types.ts`): Added `CatalystType`, `ImpactLevel`, and optional `relatedAssets`, `catalystType`, `impactLevel` on `NewsItem`. In `lib/news-intelligence.ts`, enrichment prefers these when present; otherwise keeps derived logic (extractRelatedSymbols, extractCatalystTags, importanceForItem).
- **1.2 Why It’s Moving module**: New `components/pulse/WhyItsMovingModule.tsx` using `usePulse()` for tickers and `whyMovingMap`; row format Asset | Change | Reason. Registered as `whyMoving` in `lib/dashboard-module-types.ts` and rendered in `RotatableSlotContent.tsx`.
- **1.3 Big Movers refinement**: `buildWhyMovingMap` in `lib/news-intelligence.ts` now prefers catalyst tag + title snippet for the reason line when tag is not "markets"; else short summary or title snippet.
- **1.4 Upcoming catalysts**: `lib/upcoming-catalysts.ts` defines `UpcomingCatalyst` and `getUpcomingCatalysts()` (CPI, FOMC, NVDA earnings, PCE, Fed Speaker, ISM Mfg, Ethereum upgrade, MYCO proposal vote). `CalendarEventsModule.tsx` uses this shared source.

---

## Phase 2 — Real Data Feeds

- **Adapters** (`lib/adapters/`):
  - `tickers.ts`: `fetchTickers()` — CoinGecko `simple/price` (5s timeout), merges into mock tickers, 60s cache; on failure returns full mock.
  - `news.ts`: `fetchNews()` — GNews or NewsAPI when `GNEWS_API_KEY` or `NEWS_API_KEY` set (8s timeout), 5 min cache; otherwise mock.
  - `myco.ts`: `fetchMycoSnapshot()` — placeholder returning `getMockMycoSnapshot()`.
- **API routes**: `app/api/tickers/route.ts`, `app/api/news/route.ts`, `app/api/myco/route.ts` call adapters; on exception they fall back to mock and return same response shape.
- **Env**: `.env.example` documents optional `GNEWS_API_KEY`, `NEWS_API_KEY`. Dashboard works without keys (mock fallback).

---

## Phase 3 — MycoDAO Ecosystem Intelligence

- **Types** (`lib/types.ts`): Added `BiobankActivity` (samplesIndexed, labsParticipating, dataContributions) and `DaoGovernance` (activeProposals, votingProgressPct, grantApprovals); extended `MycoSnapshot` with optional `biobank` and `governance`. Added catalyst types `grant`, `biobank milestone` to `CatalystType`.
- **Mock**: `getMockMycoSnapshot()` in `lib/mock-data.ts` now includes `biobank` and `governance` objects.
- **New modules**: `BiobankActivityModule.tsx`, `DaoGovernanceModule.tsx` — compact rows, same style as Research Funding. Registered as `biobank` and `daoGovernance` in module registry and `RotatableSlotContent.tsx`; data from `myco?.biobank` and `myco?.governance`.
- **Ecosystem tags**: In `lib/news-intelligence.ts`, `extractCatalystTags` candidates include `biobank milestone`; API `catalystType` (proposal, grant, partnership, biobank milestone, research funding) is used when present for ecosystem headlines.

---

## Phase 4 — Signature Visual Modules

- **Market Heatmap**: New `components/pulse/MarketHeatmapModule.tsx` — grid of assets (top 24 by absolute % change), color by performance (green/red intensity), compact 4-column layout. Replaces heatmap placeholder in `RotatableSlotContent.tsx` for `moduleId === "heatmap"`.

---

## Phase 5 — Alerts

- **Types** (`lib/alert-types.ts`): `Alert` (id, type, symbol?, message, threshold?, triggeredAt, read); `AlertType`: price_above, price_below, pct_move, proposal_approved, grant_deployed, macro_event. `createAlert()` helper.
- **Evaluation** (`lib/alerting.ts`): `evaluateAlerts(tickers, enrichedNews)` — emits `pct_move` for abs(changePct) ≥ 5%; `proposal_approved` / `grant_deployed` from news title patterns; `macro_event` for high-importance macro catalysts. Capped per run; dedupe in provider.
- **Provider** (`lib/pulse-provider.tsx`): After each refresh, runs `evaluateAlerts` and merges new alerts into state (dedupe by type+symbol+message); exposes `alerts`, `dismissAlert(id)`, `clearAlerts()`.
- **Status module** (`components/pulse/StatusModule.tsx`): Shows last 5 alerts in compact lines; “No alerts” when empty; per-alert Dismiss (×) and “Clear” button.

---

## Files Touched

| Area | Files |
|------|--------|
| Types | `lib/types.ts`, `lib/alert-types.ts` |
| Intelligence | `lib/news-intelligence.ts`, `lib/upcoming-catalysts.ts` |
| Adapters | `lib/adapters/tickers.ts`, `lib/adapters/news.ts`, `lib/adapters/myco.ts` |
| Alerting | `lib/alerting.ts` |
| Provider | `lib/pulse-provider.tsx` |
| Module registry | `lib/dashboard-module-types.ts` |
| API routes | `app/api/tickers/route.ts`, `app/api/news/route.ts`, `app/api/myco/route.ts` |
| Components | `WhyItsMovingModule.tsx`, `BiobankActivityModule.tsx`, `DaoGovernanceModule.tsx`, `MarketHeatmapModule.tsx`, `CalendarEventsModule.tsx`, `RotatableSlotContent.tsx`, `StatusModule.tsx` |
| Config | `.env.example` |

---

## Next Steps (optional)

- Phase 4 optional: Crypto Heatmap variant, Sector Momentum, Research Funding Flow.
- Phase 5 optional: Notification system (browser push or in-app list page); document or stub only.
- Real MYCO price source in `lib/adapters/myco.ts` when available.
