# Market Pulse Implementation

**Date:** 2026-02-15

## Summary

Implemented a Bloomberg TV-style "Market Pulse" experience for MycoDAO with rotating panels, tickers, news, podcasts, and financial literacy—featuring MYCO as one of the tracked assets.

## Routes

| Route | Purpose |
|-------|---------|
| `/pulse` | Main Bloomberg-style dashboard |
| `/pulse/markets` | Expanded tickers, watchlist, filters |
| `/pulse/news` | News feed (Markets, Crypto, MycoDAO) |
| `/pulse/podcasts` | Episodes list + audio player |
| `/pulse/learn` | Financial literacy hub |
| `/pulse/learn/[id]` | Lesson detail |
| `/pulse/myco` | Token overview (links to /token) |
| `/pulse/settings` | Refresh/rotation intervals, watchlist |
| `/token` | Full MYCO token page (existing) |

## Data Architecture

- **Provider:** `lib/pulse-provider.tsx` — fetches from API routes, provides context
- **Types:** `lib/types.ts` — Ticker, NewsItem, PodcastEpisode, LearnModule, MycoSnapshot
- **Mock data:** `lib/mock-data.ts` — deterministic seeded drift for "live" feel

### API Routes (mock-first)

- `/api/tickers` — TODO: Replace with DEX/price feed
- `/api/news` — TODO: Replace with news API
- `/api/podcasts` — TODO: Replace with podcast RSS
- `/api/learn` — TODO: Replace with CMS
- `/api/myco` — TODO: Replace with MYCO price feed

## Components

- `TickerCard` — symbol, price, change, sparkline
- `Sparkline` — SVG mini-chart
- `PanelCarousel` — rotating feature panels (market, news, podcast, learn, MYCO)
- `BreakingNewsBand` — top news strip
- `NewsCard` / `NewsList`
- `PodcastPlayer` / `EpisodeList`
- `LessonCard` / `LearnSpotlight`
- `MycoEcosystemSpotlight` — tokenomics + link to /token
- `BottomBar` — time, LIVE, nav tabs
- `SettingsPanel` — intervals, watchlist

## Features

- Auto-rotate feature panel (configurable, default 12s)
- Ticker paging (configurable, default 8s)
- Manual controls: next/prev + pause
- `prefers-reduced-motion`: no auto-rotate when enabled
- MYCO as ticker + ecosystem spotlight
- Links to /token throughout

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3004/pulse
