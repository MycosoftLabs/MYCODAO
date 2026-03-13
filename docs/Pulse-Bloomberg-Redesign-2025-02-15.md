# Pulse Dashboard Bloomberg-Style Redesign — 2025-02-15

## Summary

Rebuilt the `/pulse` dashboard with a high-density, Bloomberg/financial terminal layout. Replaced the previous grid with a 12-column modular structure composed of small information panels.

## Grid Structure

| Row | Modules |
|-----|---------|
| 1 | Market Pulse Carousel | Crypto | Metals |
| 2 | Commodities | Bio Assets | News |
| 3 | Podcasts | Learn | MYCO Ecosystem |
| 4 | Watchlist | Market Indicators | Research |

## New Components

- **PulseModule** — Wrapper with title bar, emerald/amber accent line, minimal padding (p-1.5)
- **TickerRow** — Compact row: symbol, price, change %, sparkline (36×14px)
- **NewsHeadline** — 5 headlines, compact format (date + title)
- **PodcastRow** — Episode with play button, title, show, duration
- **LessonRow** — Level, title, reading time
- **ResearchRow** — Category, date, title
- **MycoEcosystemCompact** — Price, change, supply, chain, link to /token

## Data Additions

- **Types:** `ResearchItem` (ecosystem, funding, biobank, science)
- **Mock tickers:** VIX, US10Y (10Y Treasury), BDM (BioData Index)
- **API:** `/api/research` — `getMockResearch()`
- **Provider:** `research` in context

## Design

- Typography: 9px–11px
- Card padding: p-1 or p-1.5
- Grid gaps: gap-1
- Accent lines: emerald (default), amber (MYCO)
- No large empty areas

## Bottom Bar

Unchanged: time, LIVE indicator, navigation tabs (compressed px-2 py-1).
