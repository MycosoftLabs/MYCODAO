# Pulse Viewport Terminal Layout — 2025-02-15

## Summary

Converted `/pulse` from a normal webpage to a true terminal-style dashboard that fits entirely within 100vh with no vertical scrolling.

---

## 1) Viewport lock

- **Layout**: `h-screen flex flex-col overflow-hidden` (pulse layout)
- **Page**: `h-full flex flex-col min-h-0 overflow-hidden`
- **Main grid**: `flex-1 min-h-0 overflow-hidden`

---

## 2) Compressed spacing

- **Title bars**: `text-[10px] font-semibold`, `py-[2px]`, `px-[2px]`
- **Rows**: `text-[10px]`, `py-[1px]`
- **Module padding**: `p-[2px]`
- **Grid gap**: `gap-[2px]`
- **Margins**: Removed (mt-0, etc.)

---

## 3) CSS Grid

- `gridTemplateRows: repeat(5, minmax(0, 1fr))` — rows shrink evenly
- All grid items: `min-h-0 overflow-hidden`

---

## 4) Module heights

- No `min-height` on modules
- Modules stretch only inside the grid
- `overflow-auto` on module content for internal scroll when needed

---

## 5) Ticker rows

- **TickerRow**: `grid grid-cols-[auto_1fr_auto_50px]` — symbol | price | change | sparkline
- **BigMoversRow**: `grid grid-cols-[auto_auto_auto_auto_50px]` — symbol+badge | price | change | session | sparkline
- **Sparkline**: width 48px (40–60px range)

---

## 6) Module headers

- `uppercase`, `tracking-wide`, `text-[10px]`, `font-semibold`

---

## 7) Line height

- `leading-tight`, `tabular-nums` applied globally in pulse dashboard

---

## 8) Fixed-height bars

- **Header**: `h-[20px]`
- **BreakingNewsBand**: `h-[20px]`
- **MarketTapeStrip**: `h-[20px]`
- **BottomBar**: `h-[20px]` (no longer fixed position; part of flex column)

---

## Files changed

| File | Changes |
|------|---------|
| `app/pulse/layout.tsx` | h-screen flex column, overflow hidden |
| `app/pulse/page.tsx` | Flex structure, grid, min-h-0 on items, spacing |
| `components/pulse/BreakingNewsBand.tsx` | h-[20px], px-[2px] |
| `components/pulse/MarketTapeStrip.tsx` | h-[20px], px-[2px] |
| `components/pulse/BottomBar.tsx` | h-[20px], shrink-0, removed fixed |
| `components/pulse/PulseModule.tsx` | py-[2px], p-[2px], text-[10px] |
| `components/pulse/TickerRow.tsx` | Grid layout, py-[1px], sparkline 48px |
| `components/pulse/BigMoversRow.tsx` | Grid layout, py-[1px], sparkline 48px |
| `components/pulse/NewsHeadline.tsx` | py-[1px], text-[10px] |
| `components/pulse/PodcastRow.tsx` | py-[1px], text-[10px] |
| `components/pulse/LessonRow.tsx` | py-[1px], text-[10px] |
| `components/pulse/ResearchRow.tsx` | py-[1px], text-[10px] |
| `components/pulse/CalendarEventsModule.tsx` | py-[1px], text-[10px] |
| `components/pulse/ResearchFundingModule.tsx` | py-[1px], text-[10px] |
| `components/pulse/StatusModule.tsx` | text-[10px] |
| `components/pulse/QuickLinksModule.tsx` | text-[10px] |
| `components/pulse/MycoEcosystemCompact.tsx` | py-[1px], text-[10px] |
| `components/pulse/PanelCarousel.tsx` | p-[2px], shrink-0 footer |
| `components/pulse/BigMoversModule.tsx` | py-[2px], text-[10px] on buttons |
