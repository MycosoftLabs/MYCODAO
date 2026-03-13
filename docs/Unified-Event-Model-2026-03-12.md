# Unified Event and Catalyst Model — 2026-03-12

## Summary

Market, news, governance, research, and ecosystem signals are normalized into a shared **unified event** model. All events share common fields (id, type, title, timestamp, relatedAssets, urgency, freshness, impact, source, optional explanation) and can drive Why It's Moving, Upcoming Catalysts, Big Movers, Mode 2 editorial, and future alerts. Layout and routes are unchanged; Mode 1 grid cell count unchanged.

## 1. Event types (`lib/events/event-types.ts`)

- **BaseEvent:** id, title, timestamp, relatedAssets, urgency, freshness, impact, source, explanation?
- **MarketEvent:** BaseEvent + type "market", symbol, changePct?, price?
- **CatalystEvent:** BaseEvent + type "catalyst", date?, catalystType?, url?
- **GovernanceEvent:** BaseEvent + type "governance", subtype (proposal | vote | grant), progressPct?
- **ResearchEvent:** BaseEvent + type "research", category?, summary?
- **MediaEvent:** BaseEvent + type "media", url?, summary?

Scores (urgency, freshness, impact) are 0–1. **UnifiedEvent** is the union of the five event types.

## 2. Normalization (`lib/events/normalize-events.ts`)

- **normalizeMarketEvents(tickers)** — Top movers by |changePct| → MarketEvent[]; urgency from move size, freshness from updatedAt.
- **normalizeCatalystAndMediaEvents(news, enrichedNews?)** — News → CatalystEvent (earnings/cpi/fomc/proposal etc.) or MediaEvent; impact from importance.
- **normalizeUpcomingCatalystEvents()** — Calendar catalysts (getUpcomingCatalysts()) → CatalystEvent[].
- **normalizeGovernanceEvents(myco)** — myco.governance → GovernanceEvent(s).
- **normalizeResearchEvents(research)** — ResearchItem[] → ResearchEvent[].
- **normalizeAllEvents(inputs)** — Runs all normalizers and returns a single UnifiedEvent[].

Helpers:

- **getEventsForSymbol(events, symbol, limit)** — Events that mention or relate to the symbol (for Why It's Moving / Big Movers).
- **getExplanationForSymbol(events, symbol)** — One-line explanation string from the event layer.

## 3. Integration

- **PulseProvider** exposes **unifiedEvents: UnifiedEvent[]** (computed via normalizeAllEvents from tickers, news, enrichedNews, myco, research). Existing whyMovingMap, enrichedNews, and insights are unchanged.
- **Why It's Moving / Big Movers:** Can use getExplanationForSymbol(unifiedEvents, symbol) or getEventsForSymbol() for “why” copy; current buildWhyMovingMap/enrichedNews path remains valid.
- **Upcoming Catalysts:** Calendar can optionally render from unifiedEvents filtered by type "catalyst" (or keep using getUpcomingCatalysts()).
- **Mode 2 editorial:** Can derive per-module urgency/freshness/impact from unifiedEvents (e.g. aggregate by source or module) and pass as moduleScores into selectEditorialCandidates.
- **Future alerts:** evaluateAlerts can be extended to consume unifiedEvents (e.g. high-urgency market or catalyst events) in addition to current logic.

## 4. Files

| File | Role |
|------|------|
| `lib/events/event-types.ts` | BaseEvent + MarketEvent, CatalystEvent, GovernanceEvent, ResearchEvent, MediaEvent. |
| `lib/events/normalize-events.ts` | Normalizers + normalizeAllEvents, getEventsForSymbol, getExplanationForSymbol. |
| `lib/events/index.ts` | Re-exports. |
| `lib/pulse-provider.tsx` | Exposes unifiedEvents. |

## 5. Incremental use

- No breaking changes: existing modules and insights continue to work.
- Optional migration: replace or augment why-moving and Big Movers copy with getExplanationForSymbol(unifiedEvents, symbol).
- Optional: feed unified event scores into the editorial layer for Mode 2 rotation and into alert evaluation.
