# MycoDAO Branding Pass — 2025-02-15

## Summary

Subtle MycoDAO visual branding without a crypto aesthetic. Restrained accent colors used only for highlights.

---

## 1) MycoDAO wordmark

- **Location**: Top-left of `/pulse` header
- **Style**: Tiny (9px), muted gold, "MycoDAO" text wordmark
- **Layout**: `MycoDAO | Market Pulse` — wordmark first, then separator, then page title
- No logo file exists; text wordmark used

---

## 2) Restrained accent colors

Defined in `app/globals.css`:

```css
:root {
  --accent-green: #2d4a3e;   /* deep forest green */
  --accent-gold: #8b7355;    /* muted gold */
}
```

**Used ONLY for:**
- **LIVE**: Deep green (StatusModule, BottomBar)
- **MYCO**: Muted gold (MYCO links, token links, Bio Assets MYCO link)
- **Selected tab**: Muted gold (Big Movers filter tabs, BottomBar nav, Gainers = deep green)

---

## 3) Removed / reduced accent usage

- Breaking News "Breaking" → stone-400
- QuickLinks hover → stone-300
- Research category → stone-500
- PulseModule decorative line → stone-600
- PulseErrorBoundary, Learn link → stone
- Module borders (accent) → stone-600

---

## 4) No large background graphics

- No texture or background graphics added
- Existing `bg-stone-950`, `bg-stone-900` retained

---

## Files changed

| File | Changes |
|------|---------|
| `app/globals.css` | Added `--accent-green`, `--accent-gold` |
| `app/pulse/page.tsx` | MycoDAO wordmark, header layout |
| `components/pulse/StatusModule.tsx` | LIVE → deep green |
| `components/pulse/BottomBar.tsx` | LIVE → deep green, selected tab → muted gold |
| `components/pulse/BigMoversModule.tsx` | Selected filter → muted gold, Gainers → deep green |
| `components/pulse/PulseModule.tsx` | Accent title → muted gold, decorative line → stone |
| `components/pulse/BreakingNewsBand.tsx` | Breaking → stone-400 |
| `components/pulse/QuickLinksModule.tsx` | Hover → stone-300 |
| `components/pulse/ResearchRow.tsx` | Category → stone-500 |
| `components/pulse/TickerRow.tsx` | MYCO link → muted gold |
| `components/pulse/BigMoversRow.tsx` | MYCO link → muted gold |
| `components/pulse/ResearchFundingModule.tsx` | Links → muted gold |
| `components/pulse/MycoEcosystemCompact.tsx` | Token link → muted gold |
| `components/pulse/MycoEcosystemSpotlight.tsx` | MYCO Ecosystem title, link → muted gold |
| `components/pulse/TickerCard.tsx` | MYCO link → muted gold |
| `components/pulse/PulseErrorBoundary.tsx` | Link → stone |
| `app/pulse/page.tsx` | Bio Assets MYCO link → muted gold |
| `app/pulse/myco/page.tsx` | Border → stone, Token link → muted gold |
| `app/token/page.tsx` | Myco link → muted gold |
| `app/pulse/learn/[id]/page.tsx` | Back link → stone |
