# Pulse Expansion + Density Pass — 2025-02-15

## Summary

Added four new modules (Big Movers, Research Funding, Tech, Business) and integrated them into the /pulse dashboard layout. No dead whitespace; all grid areas contain modules.

## New Modules

### A) Big Movers
- **Component:** `BigMoversModule`, `BigMoversRow`
- **Location:** Row 1, right side (3 cols), high visibility
- **Content:** Top 8 movers across ALL assets (crypto, trad, bio, MYCO), sorted by absolute % change
- **Fields:** symbol, last price, change %, 1h/session change %, tiny sparkline
- **Data:** Uses `sessionChangePct` on Ticker (mock)

### B) Research Funding
- **Component:** `ResearchFundingModule`
- **Location:** Row 4, adjacent to MYCO Ecosystem
- **Content:** MycoDAO ecosystem metrics
  - Grant Pool (MYCO)
  - Grants Deployed (MYCO)
  - Active Proposals
  - Votes Today
  - Biobank Incentives Distributed (MYCO)
  - Active Research Projects
  - Samples Indexed
- **Links:** View details → /pulse/myco, /token
- **Data:** `myco.researchFunding` from /api/myco (mock)

### C) Tech
- **Component:** `PulseModule` + `TickerRow`
- **Location:** Row 2
- **Tickers:** AAPL, MSFT, NVDA, AMZN, GOOGL, META

### D) Business
- **Component:** `PulseModule` + `TickerRow`
- **Location:** Row 2
- **Tickers:** JPM, GS, BRK.B, V, MA, UNH

## Layout (12-column grid)

| Row | Cols |
|-----|------|
| 1 | Carousel (5) \| Crypto (2) \| Metals (2) \| Big Movers (3) |
| 2 | Commodities (3) \| Bio Assets (3) \| Tech (3) \| Business (3) |
| 3 | News (4) \| Podcasts (4) \| Learn (4) |
| 4 | Watchlist (3) \| Market Indicators (3) \| MYCO Ecosystem (3) \| Research Funding (3) |
| 5 | Research (12) |

## Data Changes

### Types (`lib/types.ts`)
- `Ticker`: added `sessionChangePct?: number`
- `ResearchFundingMetrics`: new type
- `MycoSnapshot`: added `researchFunding?: ResearchFundingMetrics`

### Mock (`lib/mock-data.ts`)
- Added tech tickers: AAPL, MSFT, NVDA, AMZN, GOOGL, META
- Added business tickers: JPM, GS, BRK.B, V, MA, UNH
- All tickers now have `sessionChangePct`
- `getMockMycoSnapshot()` returns `researchFunding` with mock values

### Provider
- Default watchlist extended with AAPL, MSFT, NVDA, JPM, GS, V

## Files Changed

- `lib/types.ts` — Ticker, ResearchFundingMetrics, MycoSnapshot
- `lib/mock-data.ts` — tech/business tickers, sessionChangePct, researchFunding
- `lib/pulse-provider.tsx` — watchlist
- `components/pulse/BigMoversRow.tsx` — new
- `components/pulse/BigMoversModule.tsx` — new
- `components/pulse/ResearchFundingModule.tsx` — new
- `app/pulse/page.tsx` — layout integration
