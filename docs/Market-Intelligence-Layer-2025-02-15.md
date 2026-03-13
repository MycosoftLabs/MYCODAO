# Market Intelligence Layer (2025-02-15)

## Overview

A “market intelligence” layer associates major movers and assets with likely catalysts from the news feed. It uses the existing 3-mode dashboard, news classification, and module architecture. Layout and density are unchanged; all modes remain viewport-fit.

## Goals Met

- **Connect Big Movers to relevant headlines** — `buildWhyMovingMap(tickers, enrichedNews)` links each top mover symbol to matching headlines; Big Movers show a one-line “why it’s moving” when available.
- **Classify news by affected assets/sectors** — `enrichNewsWithIntelligence()` adds `relatedSymbols` and `catalystTags` per item (from title/summary/tags and a tag→symbol map).
- **Surface “Why it’s moving” in compact form** — BigMoversRow accepts optional `whyMoving` (truncated headline); BigMoversModule passes it from `whyMovingMap`.
- **Upcoming Catalysts with likely market impact** — Enriched news has `importance` (high/medium/low). Bottom catalyst tape and calendar events show importance markers (● / ○ / ·).
- **Ecosystem news as catalyst events** — Ecosystem items get `importance: "medium"` and are included in enriched news and catalyst tape with related symbols (e.g. MYCO).

## Data Layer

### Types (`lib/news-intelligence.ts`)

- **NewsWithIntelligence** — Extends `NewsWithClass` with:
  - `catalystTags: string[]` — e.g. earnings, cpi, fed, governance, myco.
  - `relatedSymbols: string[]` — e.g. NVDA, SOL, MYCO, DXY, GOLD.
  - `importance: CatalystImportance` — `"high" | "medium" | "low"` for market impact.
- **WhyMoving** — `{ symbol, summary, headlineIds }` for a mover’s linked headline(s).

### Functions

- **enrichNewsWithIntelligence(items)** — Adds catalyst tags, related symbols, and importance to classified news.
- **getHeadlinesForMover(symbol, news)** — Returns up to 3 headlines that mention or relate to the symbol.
- **buildWhyMovingMap(tickers, news, maxMovers)** — Map of symbol → WhyMoving (top movers by |changePct|, summary = first linked headline title).

### Provider

- **PulseProvider** (`lib/pulse-provider.tsx`) exposes:
  - **enrichedNews** — `enrichNewsWithIntelligence(classifyNews(news))`.
  - **whyMovingMap** — `buildWhyMovingMap(tickers, enrichedNews, 12)`.

## UI Support

- **NewsHeadline** — Optional `enriched` prop: when present, shows up to 3 catalyst tags and up to 4 related-asset badges (compact, below title).
- **BigMoversRow** — Optional `whyMoving` prop: one-line “why” below the row when provided.
- **BigMoversModule** — Uses `whyMovingMap` from `usePulse()` and passes `whyMovingMap.get(t.symbol)?.summary` to each row.
- **CalendarEventsModule** — Each event has `importance` (high/medium/low); shows ● / ○ / · with tooltip “High/Medium/Low market impact”.
- **BottomTickers (catalyst tape)** — Receives `enrichedNews`; shows importance marker (●/○/·) before each catalyst headline.

## Wiring

- **DashboardMode1, DashboardMode2, DashboardMode3** — Use `enrichedNews` from `usePulse()` and pass `enriched={enrichedNews.find(e => e.id === n.id)}` to every `NewsHeadline`.
- **RotatableSlotContent** — Uses `enrichedNews` for the Featured News slot and passes `enriched` to each `NewsHeadline`.
- **Pulse layout** — `PulseBottomSection` passes `enrichedNews` to `BottomTickers` as `newsWithClass`.

## Files

| Area | Path |
|------|------|
| Intelligence types & logic | `lib/news-intelligence.ts` |
| Provider (enrichedNews, whyMovingMap) | `lib/pulse-provider.tsx` |
| News headline (tags, badges) | `components/pulse/NewsHeadline.tsx` |
| Big Movers (why row) | `components/pulse/BigMoversRow.tsx`, `BigMoversModule.tsx` |
| Calendar importance | `components/pulse/CalendarEventsModule.tsx` |
| Bottom catalyst tape | `components/pulse/BottomTickers.tsx` |

## No Layout Rebuild

- All modes (1, 2, 3) and grid layouts unchanged.
- Density preserved; new UI is compact (small tags, one-line why, single-character importance).
- Viewport: no new scroll; all content remains within the fixed frame.
