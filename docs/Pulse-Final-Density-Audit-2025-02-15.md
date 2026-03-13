# Pulse Final Density Audit — 2025-02-15

## Summary

Final density pass: reduced padding/gaps to Bloomberg terminal level, split Row 5 into 4 modules (Research, Calendar, Quick Links, Status). No empty areas.

## Changes

### New Modules
- **Quick Links** — Compact nav: Markets, News, Podcasts, Learn, MYCO, Settings
- **Status** — Live indicator, "No alerts"

### Layout
- **Row 5**: Research (3) | Calendar (3) | Quick Links (3) | Status (3) — was Research (6) | Calendar (6)
- **Main**: p-1 → p-0.5, gap-1 → gap-0.5
- **Header**: px-1 → px-0.5, gap-2 → gap-1

### Padding Reductions
| Component | Before | After |
|-----------|--------|-------|
| PulseModule title | px-1 py-0.5 | px-0.5 py-0.5 |
| PulseModule content | p-1 | p-0.5 |
| PanelCarousel | min-h-90px, p-1 | min-h-80px, p-0.5 |
| BreakingNewsBand | px-1 | px-0.5 |
| Layout pb | pb-8 | pb-7 |
| Row spacing | py-0.5 | py-0 (TickerRow, NewsHeadline, etc.) |
| Internal spacing | space-y-0.5, mt-0.5 | space-y-0, mt-0 |

## Grid (Final)

| Row | Modules |
|-----|---------|
| 1 | Carousel (5) \| Crypto (2) \| Metals (2) \| Big Movers (3) |
| 2 | Commodities (3) \| Bio (3) \| Tech (3) \| Business (3) |
| 3 | News (4) \| Podcasts (4) \| Learn (4) |
| 4 | Watchlist (3) \| Indicators (3) \| MYCO (3) \| Research Funding (3) |
| 5 | Research (3) \| Calendar (3) \| Quick Links (3) \| Status (3) |

## Result

- No section larger than one module is empty
- Dense Bloomberg-style layout
- Typography 9–10px, padding p-0.5, gaps gap-0.5
