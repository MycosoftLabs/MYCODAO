# Pulse Fill + Density + Polish — 2025-02-15

## Summary

FILL + DENSITY + POLISH pass on `/pulse` to achieve a Bloomberg/terminal screen feel. No routing or provider changes; no modules removed.

---

## 1) Zero-empty rule

- **News**: 7 headlines (was 6)
- **Podcasts**: 5 episodes (was 3)
- **Learn**: 6 lessons (was all 12; kept 6 for density)
- **Research**: 6 items (was all 10)
- **Commodities**: 6 rows — added CORN, SOY to mock data (was 3)
- **Big Movers**: 10 rows (was 8)
- **Calendar/Events**: 6 events (unchanged)

---

## 2) Terminal density

- **Module containers**: `p-1` max; `gap-0.5` or `gap-1`
- **Row separators**: `border-stone-800/50` (hairline)
- **Font sizes**: 9–12px rows, 11px titles
- **Numeric columns**: `tabular-nums`
- **Line height**: `leading-tight` across pulse components

---

## 3) Bloomberg visual language

- **Module title bar**: Uppercase label + subtle separator
- **Row separators**: Hairline borders between rows
- **Up/down**: Arrow (▲/▼) + sign + percentage (not color only)
- **Market Tape strip**: New `MarketTapeStrip` below BreakingNewsBand — BTC, ETH, SOL, SPY, DXY, GOLD, OIL, MYCO in one line

---

## 4) Big Movers

- 10 rows (was 8)
- Asset class badge: Crypto / Trad / Bio / MYCO
- Arrow + sign + percentage for change
- Symbol, last, change %, session change %, sparkline

---

## 5) Research Funding

- All metrics displayed (Grant Pool, Grants Deployed, Active Proposals, Votes Today, Biobank Incentives, Active Research Projects, Samples Indexed)
- "Last updated" timestamp from `myco.updatedAt`
- Title bar links to `/pulse/myco`
- "Token details →" link to `/token`

---

## 6) Mock data

- **Commodities**: Added CORN, SOY to `lib/mock-data.ts`
- Existing mock data already meets targets: 50+ tickers, 12 news, 8 podcasts, 12 learn, 10 research

---

## Files changed

| File | Changes |
|------|---------|
| `components/pulse/MarketTapeStrip.tsx` | **New** — Market tape strip |
| `app/pulse/page.tsx` | MarketTapeStrip, slice counts, COMMODITIES_SYMBOLS |
| `lib/mock-data.ts` | CORN, SOY commodities |
| `components/pulse/BigMoversModule.tsx` | 10 rows |
| `components/pulse/BigMoversRow.tsx` | Asset badge, arrow + sign |
| `components/pulse/ResearchFundingModule.tsx` | lastUpdated, Token details link |
| `components/pulse/TickerRow.tsx` | Arrow + sign for change |
| `components/pulse/PulseModule.tsx` | Density (p-1, leading-tight) |
| `components/pulse/NewsHeadline.tsx` | Hairline, leading-tight |
| `components/pulse/PodcastRow.tsx` | Hairline, leading-tight |
| `components/pulse/LessonRow.tsx` | Hairline, leading-tight |
| `components/pulse/ResearchRow.tsx` | Hairline, leading-tight |
| `components/pulse/CalendarEventsModule.tsx` | Hairline, leading-tight |
| `components/pulse/MycoEcosystemCompact.tsx` | Arrow + sign, tabular-nums |
| `components/pulse/QuickLinksModule.tsx` | gap-0.5 |
| `components/pulse/StatusModule.tsx` | leading-tight |
| `components/pulse/PanelCarousel.tsx` | Removed min-h, leading-tight |

---

## Next steps

- Run `npm run dev` and verify `/pulse` at http://localhost:3000
- Build failed with V8 memory error — may need `NODE_OPTIONS=--max-old-space-size=4096` or similar for production build
