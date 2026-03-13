# MycoDAO Project Build Update

**Report Date:** February 15, 2025  
**Project:** MycoDAO  
**Location:** `c:\Users\Abelardo\Desktop\Websites\mycodao`

---

## Summary

This update covers: multi-mode Pulse dashboard, bottom tickers, black bumper frame (with thicker bottom edge), dev/basePath and 404 fixes, and related docs.

---

## 1. Pulse Dashboard Modes

- **Mode 1 (Fixed Terminal):** Default. Dense 12-column grid; all modules visible. No top tickers.
- **Mode 2 (Rotating Modular Terminal):** Rows 1–2 fixed; row 3 has four rotatable slots (registry-based rotation: longest-visible out first, priority, pinned, freshness). Rows 4–5 fixed.
- **Mode 3 (Broadcast / Expanded Focus):** One large focus area (MYCO, Podcast, News, Chart) with next/prev; compact side panel (Status, Top Movers).

**Shared architecture:** `DashboardModeProvider` (`lib/dashboard-mode-context.tsx`), module registry (`lib/dashboard-module-types.ts`), news classification (`lib/news-intelligence.ts`). Mode switcher (1/2/3) in BottomBar.

---

## 2. Bottom Tickers

- **Location:** Bottom of viewport (in pulse layout), above BottomBar.
- **Market Tape:** BTC, ETH, SOL, SPY, QQQ, DXY, GOLD, OIL, VIX, MYCO — compact, terminal-style.
- **Catalyst / News Tape:** Headlines from classified news (nowMoving, upcomingCatalyst, ecosystem).
- **Component:** `components/pulse/BottomTickers.tsx`; data from `usePulse()` + `classifyNews()` in `PulseBottomSection`.

---

## 3. Black Bumper Frame

- **Purpose:** Visible perimeter so the whole dashboard (including bottom ticker and bar) stays in view.
- **Implementation:** Outer wrapper in `app/pulse/layout.tsx`: black border, `h-screen max-h-dvh`, `overflow-hidden`.
- **Border widths:** Top and sides **6px**; **bottom 12px** (thicker so bottom strip is clearly inside the frame).
- **Layout:** Inner flex column with `flex-1 min-h-0` for main content and `shrink-0` wrapper for BottomTickers + BottomBar so they are never squeezed off.

---

## 4. Dev / 404 Fixes

- **basePath:** In dev, `basePath` is `""` so the app runs at `http://localhost:3004/`. In production, `basePath` remains `/mycodao.financial`. (`next.config.mjs`.)
- **API base:** Pulse provider uses `window.location.origin` in dev and `origin + "/mycodao.financial"` in production for API requests. (`lib/pulse-provider.tsx`.)
- **Middleware:** In dev, `/mycodao.financial` and `/mycodao.financial/*` redirect to `/` and `/*` so old links work. (`middleware.js`.)
- **layout.css:** `public/layout.css` added as a minimal fallback so requests to `/layout.css` return 200 instead of 404.
- **usePulse:** When used outside `PulseProvider`, returns a safe default (loading, empty arrays) instead of throwing, so the app can still render.

---

## 5. Key Files

| Area | Path |
|------|------|
| Pulse layout (bumper, bottom section) | `app/pulse/layout.tsx` |
| Pulse page (mode switch) | `app/pulse/page.tsx` |
| Mode context | `lib/dashboard-mode-context.tsx` |
| Module registry | `lib/dashboard-module-types.ts` |
| News classification | `lib/news-intelligence.ts` |
| Bottom tickers | `components/pulse/BottomTickers.tsx` |
| Bottom bar (mode switcher) | `components/pulse/BottomBar.tsx` |
| Mode 1/2/3 | `components/pulse/DashboardMode1.tsx`, `DashboardMode2.tsx`, `DashboardMode3.tsx` |
| Dev redirect | `middleware.js` |
| Config | `next.config.mjs` |

---

## 6. Build & Run

```bash
npm install
npm run dev    # http://localhost:3004/  (dev: no basePath)
npm run build
npm run start  # production: use /mycodao.financial if basePath set)
npm run docs:pdf   # Generate PDF from update report
```

---

## 7. Documentation

| Doc | Description |
|-----|-------------|
| `docs/Dashboard-Modes-2025-02-15.md` | Multi-mode dashboard design and wiring |
| `docs/Agent-Handoff.md` | Latest work and project context |
| `docs/update-reports/Project-Build-Report-2025-02-15.md` | Full project build report |
| `docs/update-reports/Project-Build-Update-2025-02-15.md` | This update |

---

*Generated for MycoDAO project build update.*
