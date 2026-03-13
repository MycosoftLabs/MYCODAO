# MycoDAO Project Build Report

**Report Date:** February 15, 2025  
**Project:** MycoDAO  
**Location:** `c:\Users\Abelardo\Desktop\Websites\mycodao`

---

## Executive Summary

MycoDAO is a Next.js 14 application featuring a Bloomberg TV-style Market Pulse dashboard for tracking crypto, metals, commodities, equities, and bio assets—including the MYCO governance token. The dashboard is a **viewport-locked terminal** that fits entirely within 100vh with no vertical scrolling. This report summarizes the current build state, architecture, modules, and recent updates.

---

## 1. Technical Stack

| Technology | Version |
|------------|---------|
| Next.js | 14.2.x |
| React | 18.2.x |
| Tailwind CSS | 3.4.x |
| Node.js | — |

**Port:** 3004 (dev and production)  
**Base path:** `/mycodao.financial` — app at `http://localhost:3004/mycodao.financial`

---

## 2. Routes & Pages

| Route | Purpose |
|-------|---------|
| `/` | Home (links to Pulse) |
| `/pulse` | Main Bloomberg-style dashboard (viewport-locked) |
| `/pulse/markets` | Expanded tickers with category filters |
| `/pulse/news` | News feed |
| `/pulse/podcasts` | Episodes list + audio player |
| `/pulse/learn` | Financial literacy hub |
| `/pulse/learn/[id]` | Lesson detail |
| `/pulse/myco` | Token overview |
| `/pulse/settings` | Refresh intervals, watchlist |
| `/token` | Full MYCO token page |

---

## 3. Pulse Dashboard Layout (12-column grid)

| Row | Modules |
|-----|---------|
| 1 | Market Pulse Carousel (4) \| Crypto (3) \| Metals (2) \| Big Movers (3) |
| 2 | Commodities (3) \| Bio Assets (3) \| Tech (3) \| Business (3) |
| 3 | News (4) \| Podcasts (4) \| Learn (4) |
| 4 | Watchlist (3) \| Market Indicators (3) \| MYCO Ecosystem (3) \| Research Funding (3) |
| 5 | Research (3) \| Calendar/Events (3) \| Quick Links (3) \| Status (3) |

All modules are gateways: clicking the title bar navigates to the full-page view.

---

## 4. Viewport & Layout

- **Dashboard fits 100vh** — no vertical scroll
- **Flex column layout:** `h-screen flex flex-col overflow-hidden`
- **Fixed-height bars:** Header, BreakingNewsBand, MarketTapeStrip, BottomBar — each `h-[20px]`
- **Grid:** `gridTemplateRows: repeat(5, minmax(0, 1fr))` — rows shrink evenly
- **Grid items:** `min-h-0 overflow-hidden` for proper shrinking

---

## 5. Design Density

- **Typography:** 9–10px
- **Title bars:** `py-[2px]`, `px-[2px]`, `text-[10px] font-semibold`
- **Rows:** `py-[1px]`, `text-[10px]`
- **Module padding:** `p-[2px]`
- **Grid gap:** `gap-[2px]`
- **Row separators:** `border-b border-neutral-800`
- **TickerRow / BigMoversRow:** `hover:bg-neutral-900` (no transitions)
- **Body:** `font-variant-numeric: tabular-nums` (globals.css)

---

## 6. Branding

- **MycoDAO wordmark:** Top-left, tiny, muted gold (`--accent-gold` #8b7355)
- **Accents (restrained, non-crypto):**
  - **LIVE:** deep green (`--accent-green` #2d4a3e)
  - **MYCO links, selected tab:** muted gold (`--accent-gold` #8b7355)
- **No large background graphics.**

---

## 7. Module → Full Page Mapping

| Module | Destination |
|--------|-------------|
| Crypto | `/pulse/markets?category=crypto` |
| Metals | `/pulse/markets?category=metals` |
| Commodities | `/pulse/markets?category=commodity` |
| Bio Assets | `/pulse/markets?category=bio` |
| Tech | `/pulse/markets?category=tech` |
| Business | `/pulse/markets?category=business` |
| News | `/pulse/news` |
| Podcasts | `/pulse/podcasts` |
| Learn | `/pulse/learn` |
| Watchlist | `/pulse/markets` |
| Market Indicators | `/pulse/markets?category=indicators` |
| MYCO Ecosystem | `/pulse/myco` |
| Research Funding | `/pulse/myco` |
| Research | `/pulse/myco` |
| Big Movers | `/pulse/markets` |

---

## 8. Data Architecture

### Provider
- **`lib/pulse-provider.tsx`** — Fetches from API routes, provides context to all Pulse pages

### Types (`lib/types.ts`)
- `Ticker` — symbol, price, changePct, sessionChangePct, sparkline, assetClass
- `NewsItem` — title, summary, source, publishedAt, category
- `PodcastEpisode` — title, show, duration, audioUrl
- `LearnModule` — title, summary, contentMd
- `MycoSnapshot` — price, changePct, researchFunding
- `ResearchFundingMetrics` — grant pool, grants deployed, proposals, votes, etc.
- `ResearchItem` — title, source, category, publishedAt

### Ticker Categories
- **Crypto:** BTC, ETH, SOL, AVAX, LINK, UNI, DOT, ATOM, MYCO
- **Metals:** GOLD, SILVER, PLAT, COPPER
- **Commodities:** OIL, NATGAS, WHEAT, COPPER, CORN, SOY
- **Bio:** MYCO, BIOX, GENE, BDM
- **Tech:** AAPL, MSFT, NVDA, AMZN, GOOGL, META
- **Business:** JPM, GS, BRK.B, V, MA, UNH
- **Indicators:** DXY, SPY, VIX, US10Y

### API Routes (mock-first)
- `/api/tickers` — 50+ tickers with seeded drift
- `/api/news` — 12 items
- `/api/podcasts` — 8 episodes
- `/api/learn` — 12 modules
- `/api/research` — 10 items
- `/api/myco` — MYCO snapshot + research funding metrics

---

## 9. Components

| Component | Purpose |
|-----------|---------|
| `PulseModule` | Box module with title bar, optional href gateway |
| `TickerRow` | Symbol, price, change %, sparkline (grid layout, hover) |
| `BigMoversModule` | Top movers with All/Crypto/Trad/Bio/MYCO filters, Gainers/Losers |
| `BigMoversRow` | Ticker row with asset badge, session change, sparkline |
| `ResearchFundingModule` | Grant pool, proposals, votes, biobank metrics, timestamp |
| `PanelCarousel` | Rotating panels (market, news, podcast, learn, MYCO) |
| `BreakingNewsBand` | Top news strip |
| `MarketTapeStrip` | Market tape (BTC, ETH, SOL, SPY, DXY, GOLD, OIL, MYCO) |
| `NewsHeadline` | Compact news row |
| `PodcastRow` | Episode with play button |
| `LessonRow` | Learn module row |
| `ResearchRow` | Research item row |
| `CalendarEventsModule` | Mock CPI, Fed, earnings events |
| `QuickLinksModule` | Nav links |
| `StatusModule` | LIVE indicator, alerts |
| `MycoEcosystemCompact` | MYCO price, supply, token link |
| `BottomBar` | Time, LIVE, nav tabs |

---

## 10. Build & Run

```bash
npm install
npm run dev    # http://localhost:3004/mycodao.financial
npm run build
npm run start
npm run docs:pdf   # Generate PDF from update report
```

---

## 11. Recent Updates (2025-02-15)

- **Viewport terminal:** Dashboard fits 100vh, no vertical scroll
- **Branding:** MycoDAO wordmark, restrained accents (deep green, muted gold)
- **Row separators:** `border-neutral-800` inside modules
- **Ticker hover:** `bg-neutral-900` on TickerRow, BigMoversRow
- **Typography:** `font-variant-numeric: tabular-nums` on body
- **Transitions:** Instant (no animation) on hover states

---

## 12. Pending / TODO

- Replace mock API routes with real feeds (DEX, news API, podcast RSS, CMS)
- Connect MYCO price to live feed
- Add GitHub remote and deploy pipeline

---

## 13. Documentation

| Location | Description |
|----------|-------------|
| `docs/update-reports/` | Update reports (this folder) |
| `docs/Agent-Handoff.md` | Latest work, project context |
| `docs/Pulse-Viewport-Terminal-2025-02-15.md` | Viewport layout |
| `docs/Branding-Pass-2025-02-15.md` | Branding |
| `docs/Pulse-Fill-Density-Polish-2025-02-15.md` | Fill + density |
| `docs/Pulse-*.md` | Pulse redesign and density audits |

---

*Generated for MycoDAO project build update.*
