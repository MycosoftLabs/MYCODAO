# Pulse Layout Density — 2025-02-15

## Summary

Reduced empty space and made the Market Pulse dashboard denser and more efficient.

## Changes

### Page layout (`app/pulse/page.tsx`)
- Single-row header with compact title and back link
- Removed duplicate bottom row; single grid: carousel + 4 sections (Crypto, Precious Metals, Commodities, Bio)
- 5-column grid on large screens: PanelCarousel (1 col) + 4 section columns
- Reduced padding: `px-3 py-2`, `mb-1.5`, `gap-2`
- Tighter section cards: `p-1.5`, `space-y-0.5` for tickers

### Layout (`app/pulse/layout.tsx`)
- `pb-16` → `pb-10` for bottom bar clearance

### BreakingNewsBand
- `py-2 px-4` → `py-1 px-2`, `gap-3` → `gap-2`
- Smaller text: `text-[9px]`, `text-[10px]`, `text-[11px]`

### PanelCarousel
- `min-h-[200px]` → `min-h-[120px]`, `p-4` → `p-2`
- Compact panel content: `space-y-0.5`, `text-[10px]` headings
- Smaller nav buttons: `px-1.5 py-0.5`, `text-[10px]`
- Footer: `px-2 py-1`

### TickerCard (compact mode)
- `p-1 py-0.5` when compact
- Smaller fonts: `text-[10px]` symbol/price, `text-[9px]` change

### BottomBar
- `px-4 py-2` → `px-2 py-1`
- `gap-4` → `gap-2`, `text-xs` → `text-[10px]`
- Tab links: `px-2 py-1`, `text-[10px]`

### NewsCard
- Compact mode: `p-1.5`, `text-[9px]` meta, `text-[11px]` title

### MycoEcosystemSpotlight
- `p-4` → `p-2`, smaller headings and text
- `text-[10px]`, `text-[9px]` for grid items

## Hydration fix (2025-02-15)

- **BottomBar**: `new Date()` for time/date caused server/client mismatch. Now renders `--:--:--` / `---` until `useEffect` runs, then shows live time (updates every second).

## Result

- Single dense view: no duplicate sections
- Less vertical and horizontal padding throughout
- Smaller typography for a Bloomberg-style compact dashboard
