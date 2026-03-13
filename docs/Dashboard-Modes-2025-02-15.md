# Dashboard Modes — Market Pulse Multi-Mode System (2025-02-15)

## Overview

The MycoDAO Market Pulse is a multi-mode dashboard. All modes stay within the viewport; no route changes. Mode is switched via the bottom bar (1 / 2 / 3).

## Modes

### Mode 1: Fixed Terminal (default)

- Dense Bloomberg-style dashboard.
- All modules visible in a fixed 12-column, 5-row grid.
- No top tickers; **bottom tickers** (Market Tape + Catalyst) are in the layout below the main content.
- Implemented in `components/pulse/DashboardMode1.tsx`.

### Mode 2: Rotating Modular Terminal

- Rows 1–2: same fixed layout as Mode 1 (Carousel, Crypto, Metals, Big Movers; Commodities, Bio, Tech, Business).
- Row 3: **four rotatable slots**. Module IDs for slots come from `getRotatingSlotIds(4)` (registry-based: longest visible out first, lower priority out before higher, pinned never out, freshness respected).
- Rows 4–5: fixed (Watchlist, Market Indicators, MYCO Ecosystem, Research Funding; News, Quick Links, Status).
- Rotation interval: 20s (respects `prefers-reduced-motion`).
- Implemented in `components/pulse/DashboardMode2.tsx`; slot content in `components/pulse/RotatableSlotContent.tsx`.

### Mode 3: Broadcast / Expanded Focus

- One large focus area (e.g. MYCO Ecosystem, Featured Podcast, Featured News, Market Chart placeholder) with next/prev controls.
- Side panel: compact Status + Top Movers.
- Implemented in `components/pulse/DashboardMode3.tsx`.

## Shared Architecture

- **Provider**: `lib/dashboard-mode-context.tsx` — `DashboardModeProvider` wraps pulse layout; exposes `mode`, `setMode`, `moduleRegistry`, `setModuleShown`, `getRotatingSlotIds`, `focusModuleId`, `setFocusModuleId`.
- **Module registry**: `lib/dashboard-module-types.ts` — `ModuleMetadata` (id, priority, pinned, rotatable, lastShownAt, freshnessScore), `MODULE_REGISTRY`, `getModulesForRotatingSlots`, `pickOneToRotateOut`.
- **News intelligence**: `lib/news-intelligence.ts` — `classifyNews()` → `NewsWithClass` (nowMoving, upcomingCatalyst, ecosystem); used by BottomTickers Catalyst tape.

## Bottom Tickers

- **Location**: Bottom of viewport (in `app/pulse/layout.tsx`), above `BottomBar`.
- **Market Tape** (faster): BTC, ETH, SOL, SPY, QQQ, DXY, GOLD, OIL, VIX, MYCO. Compact terminal style.
- **Catalyst / News Tape** (slower): Headlines from classified news.
- Component: `components/pulse/BottomTickers.tsx`; receives `tickers` and `newsWithClass` from layout (layout uses `usePulse()` + `classifyNews(news)`).

## Wiring

- **Layout** (`app/pulse/layout.tsx`): Wraps with `DashboardModeProvider`; renders `BottomTickers` (with `tickers`, `newsWithClass`) then `BottomBar`. No top tickers.
- **Page** (`app/pulse/page.tsx`): Uses `useDashboardMode()`; renders `DashboardMode1` | `DashboardMode2` | `DashboardMode3` based on `mode`. Single header (MycoDAO | Market Pulse).
- **BottomBar** (`components/pulse/BottomBar.tsx`): Uses `useDashboardMode()`; shows mode switcher buttons 1, 2, 3 (Fixed / Rotate / Focus).

## Files

| Area | Path |
|------|------|
| Module types & registry | `lib/dashboard-module-types.ts` |
| Mode context | `lib/dashboard-mode-context.tsx` |
| News classification | `lib/news-intelligence.ts` |
| Mode 1 | `components/pulse/DashboardMode1.tsx` |
| Mode 2 | `components/pulse/DashboardMode2.tsx` |
| Mode 3 | `components/pulse/DashboardMode3.tsx` |
| Rotatable slot content | `components/pulse/RotatableSlotContent.tsx` |
| Bottom tickers | `components/pulse/BottomTickers.tsx` |
| Bottom bar (mode switcher) | `components/pulse/BottomBar.tsx` |
| Pulse layout | `app/pulse/layout.tsx` |
| Pulse page | `app/pulse/page.tsx` |

## Possible refinements

- **Mode 2**: Update `lastShownAt` when a module *leaves* a slot (in addition to when shown) so rotation order stays accurate.
- **Mode 3**: Timed rotation for the focus slot; more focus options (e.g. Featured Proposal, Featured Grant) if data exists.
- **Catalyst tape**: Optional scrolling animation or "now moving" tags from news intelligence.
