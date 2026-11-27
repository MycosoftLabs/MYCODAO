> AWS topology correction 2026-11-27: local production servers, LAN addresses and VM/Proxmox/NAS deployment instructions are retired. Use [AWS_INFRA_REFERENCE.md](../AWS_INFRA_REFERENCE.md). Preserve historical evidence and optional device/external connectors.

# Pulse AI Studio Replacement — Complete

**Date:** June 4, 2026  
**Status:** Complete  
**URL:** https://pulse.mycodao.com/pulse  
**Source:** `myco-pulse/` (Google AI Studio export)

## What changed

The legacy Next.js Pulse dashboard (`app/pulse/*`, `components/pulse/*`) was replaced by the new **Myco Pulse** Vite SPA from AI Studio.

| Before | After |
|--------|-------|
| Next.js multi-page Pulse (`/pulse`, `/pulse/trade`, `/pulse/news`, …) | Single AI Studio dashboard at `/pulse` |
| `DashboardMode1/2/3` React components | `myco-pulse/src/App.tsx` + wallet/DEX widgets |
| In-app Next layout + bottom tickers | Standalone SPA with its own chrome |

**Preserved:** All existing Pulse API routes under `app/api/pulse/*`, trading, tickers, news, podcasts, etc. — ready for the next phase (wire real data, no mock).

## Architecture

```
myco-pulse/          ← AI Studio source (Vite + React 19 + Tailwind v4)
  npm run build  →   public/pulse/   (static assets)
next.config.mjs      rewrites /pulse → /pulse/index.html
Dockerfile           builds myco-pulse then next build
```

## Build & dev

```bash
# From MYCODAO repo root
npm run build:pulse    # Vite → public/pulse/
npm run build            # pulse + Next.js standalone
npm run dev:pulse        # build pulse then next dev (port 3004)
```

Local: http://localhost:3004/pulse

## Env (myco-pulse)

Copy `myco-pulse/.env.example` → `myco-pulse/.env.local` for build-time keys:

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY` or `VITE_GEMINI_API_KEY` (neural reports / news synthesis)

## Deploy

Same as before: rebuild Docker image on Pulse VM, restart container, purge Cloudflare if cached.

```powershell
.\scripts\deploy-pulse-vm.ps1
```

## Verification

- [x] `npm run build:pulse` succeeds (~2MB JS bundle + CSS)
- [x] `npx next build` succeeds after pulse build
- [x] `/pulse` rewrite serves `public/pulse/index.html`
- [ ] Production deploy to pulse.mycodao.com (run when ready to ship)

## Next phase (planned)

Replace mock / Gemini-generated fallbacks with live MycoDAO backends:

| Feature | Target backend |
|---------|----------------|
| Market tickers / OHLC | `GET /api/tickers`, `GET /api/ohlc`, DexScreener |
| News | `GET /api/news` |
| Podcasts / RSS | `GET /api/podcasts`, RSS.com feed |
| Stream / Streamlabs | `GET /api/pulse/stream` |
| Trading / DEX | `app/api/trading/*`, Jupiter swap service |
| Wallets | Solana wallet adapter (already in SPA) |
| MAS tasks | `POST /api/pulse/mas-task` |
| Finance | Trading VM / Alpaca or configured broker |

Primary files to wire: `myco-pulse/src/services/apiService.ts`, `hooks/useRealTimeData.ts`, `App.tsx` (static `ASSET_TICKERS` / `MOCK_CHART_DATA`).

## Files touched

- `myco-pulse/vite.config.ts` — `base: '/pulse/'`, outDir `public/pulse`
- `myco-pulse/postcss.config.mjs` — isolate Tailwind v4 from parent MYCODAO v3
- `package.json` — `build:pulse`, `dev:pulse`
- `next.config.mjs` — `/pulse` rewrites
- `Dockerfile` — pulse_deps stage + `npm ci --ignore-scripts`
- `tsconfig.json`, `.eslintrc.json`, `.eslintignore` — exclude nested apps + build output
- **Removed:** `app/pulse/` (old Next routes)

## Lessons learned

- Parent repo Tailwind v3 postcss must be blocked for Vite v4 Pulse builds (`postcss.config.mjs` with empty plugins + explicit `css.postcss` in vite config).
- `npm ci` in myco-pulse needs `--ignore-scripts` on Windows (Stellar SDK postinstall requires yarn).
- ESLint must ignore `app/natureapp/**` and `public/pulse/**` or production build fails on bundled JS.
