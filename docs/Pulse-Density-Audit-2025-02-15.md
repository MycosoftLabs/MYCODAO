# Pulse Density Audit — 2025-02-15

## Summary

Final density audit of `/pulse` dashboard. Eliminated blank areas, reduced padding/gaps, added Calendar/Events module. Target: Bloomberg terminal–style packed layout.

## Changes

### New Module
- **Calendar / Events** — Mock upcoming events (CPI, Fed, earnings). Fills space alongside Research in Row 5. No full-width blank areas.

### Layout
- **Row 5 split**: Research (6 cols) | Calendar/Events (6 cols) — was full 12 cols, created blank horizontal space
- **Main**: p-2 → p-1
- **Header**: px-2 py-1 → px-1 py-0.5

### Padding/Gap Reductions
| Component | Before | After |
|-----------|--------|-------|
| PulseModule title bar | px-2 py-1 | px-1 py-0.5 |
| PulseModule content | p-1.5 | p-1 |
| PanelCarousel | min-h-120px, p-2 | min-h-90px, p-1 |
| PanelCarousel footer | px-2 py-1 | px-1 py-0.5 |
| BreakingNewsBand | py-1 px-2 | py-0.5 px-1 |
| BottomBar | px-2 py-1 | px-1 py-0.5 |
| Layout pb | pb-10 | pb-8 |
| NewsCard compact | p-1.5 | p-1 |
| MycoEcosystemSpotlight | p-2, mb-2 | p-1, mb-1 |
| MycoEcosystemCompact | space-y-1, mt-1 | space-y-0.5, mt-0.5 |
| ResearchFundingModule | mt-1 | mt-0.5 |
| BottomBar tab links | px-2 py-1 | px-1.5 py-0.5 |

### Content Additions
- News: 5 → 6 headlines (added 2 mock items)
- Research: 3 → 5 items (added 2 mock items)

## Grid Layout (Final)

| Row | Modules |
|-----|---------|
| 1 | Carousel (5) \| Crypto (2) \| Metals (2) \| Big Movers (3) |
| 2 | Commodities (3) \| Bio (3) \| Tech (3) \| Business (3) |
| 3 | News (4) \| Podcasts (4) \| Learn (4) |
| 4 | Watchlist (3) \| Indicators (3) \| MYCO (3) \| Research Funding (3) |
| 5 | Research (6) \| **Calendar/Events (6)** |

## Result

- No area wider than 1 module is blank
- Typography 10px–13px
- Padding p-1 or p-2 max
- Gaps gap-1 only
