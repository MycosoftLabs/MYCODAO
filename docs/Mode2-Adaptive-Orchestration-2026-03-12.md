# Mode 2 Adaptive Multi-Module Orchestration — 2026-03-12

## Summary

Mode 2 rotation is now an adaptive orchestration system with two layers: **editorial selection** (which modules to show) and **layout packing** (how to fill the rotatable region with no gaps). Multiple modules can rotate in/out at once; size metadata (supportedSizes, preferredSize, canExpand, packingPriority) drives packing.

## 1. Architecture

### Editorial layer (`lib/dashboard-editorial.ts`)

- **Input:** `MODULE_DEFINITIONS`, registry (with `lastShownAt`), optional per-module scores (urgency, freshness, relevance, impact).
- **Output:** Ordered list of `ModuleId` (candidates for placement).
- **Logic:** Pinned first; then sort by composite editorial score: editorial weight, optional live scores (urgency, freshness, relevance, impact), and staleness bonus (longer since `lastShownAt` → higher priority to show). Used so rotation favors fresh content and evens exposure.

### Packing layer (`lib/dashboard-packing.ts`)

- **Input:** Ordered candidate IDs from editorial, definitions, `totalWidth` (12), optional `allowedSizes` (default `["1x1", "2x1", "3x1"]` for single row).
- **Output:** `Placement[]`: `{ moduleId, sizeKey, colSpan }` with no gaps.
- **Logic:** Each module contributes one of its `supportedSizes` (as column width). DP finds the **smallest** number of modules `k` that can partition `totalWidth` (so we prefer fewer, larger blocks). Backtrack to get one valid width assignment; map width to `sizeKey` for rendering.

### Size metadata

- **supportedSizes:** e.g. `["1x1", "2x1", "3x1"]` — allowed slot sizes for packing.
- **preferredSize:** e.g. `"3x1"` — preferred when it fits.
- **canExpand:** reserved for future (e.g. absorb remaining gap).
- **packingPriority:** used in editorial ordering and in partitioning.

All rotatable modules now have `supportedSizes: ["1x1", "2x1", "3x1"]` and `preferredSize: "3x1"` in `MODULE_DEFINITIONS`.

## 2. Mode 2 integration

- **Context** (`lib/dashboard-mode-context.tsx`): Added `getPlacements(availableWidth: number)`. It runs `selectEditorialCandidates()` then `packPlacements()` and returns placements. `getRotatingSlotIds(slotCount)` kept for compatibility.
- **DashboardMode2:** Row 3 is the rotatable region. It uses `getPlacements(12)` instead of a fixed 4 slots. Each placement is rendered with `col-span-12` on mobile and `md:col-span-{1|2|3}` so the row always sums to 12 columns with no gaps. On each rotation tick, new placements are computed and `setModuleShown` is called for each placed module so `lastShownAt` updates.

## 3. Layout

- Mode 1: Unchanged (fixed grid, same cell count).
- Mode 2: Same 5-row grid; row 3 is one logical row of 12 columns filled by placements. Count of modules and their widths (1, 2, or 3 cols) vary by partition (e.g. 4×3, 3+3+2+2+2, 6×2). No reserved gaps.
- Mode 3: Unchanged; can later reuse the same packing and editorial layers for a larger region.

## 4. Files

| File | Role |
|------|------|
| `lib/dashboard-editorial.ts` | Editorial selection (candidates order). |
| `lib/dashboard-packing.ts` | No-gap packing (placements with colSpan). |
| `lib/dashboard-module-types.ts` | `PACKING_SIZES`, definitions updated with supportedSizes/preferredSize. |
| `lib/dashboard-mode-context.tsx` | `getPlacements(availableWidth)`. |
| `components/pulse/DashboardMode2.tsx` | Uses `getPlacements(12)`, renders by placement with variable col-span. |

## 5. Optional next steps

- Pass intelligence-derived scores into `selectEditorialCandidates` (e.g. from `moverInsights` / `headlineInsights`) via `moduleScores`.
- Support 2-row rotatable region and `2x2` in packing for Mode 3 or expanded Mode 2.
- Use `canExpand` so one module can grow to fill a small remaining gap.
