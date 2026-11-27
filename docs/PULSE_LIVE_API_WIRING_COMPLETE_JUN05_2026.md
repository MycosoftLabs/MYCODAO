> **AWS topology correction 2026-11-27: production is AWS-only; this file's legacy on-prem references are not deployment authority. See [AWS_INFRA_REFERENCE.md](../AWS_INFRA_REFERENCE.md) for its replacement and disposition. Loopback development and physical-device fixtures are separate.**

# Pulse Live API Wiring Complete — Jun 05, 2026

**Date:** Jun 05, 2026  
**Status:** Complete  
**Related:** `docs/PULSE_AI_STUDIO_REPLACEMENT_COMPLETE_JUN04_2026.md`

## Scope

Wire the Myco Pulse AI Studio SPA (`myco-pulse/`) to **real MYCODAO `/api/*` routes** on `pulse.mycodao.com`, remove **Gemini and mock fallbacks**, show **empty states** when Streamlabs, RSS, podcast, or news keys are not configured, and deploy to the **MYCODAO VM** (192.168.0.198).

## Delivered

### API client (`myco-pulse/src/lib/pulseApi.ts`)

- `/api/tickers`, `/api/ohlc`, `/api/news`, `/api/myco`, `/api/podcasts`, `/api/pulse/config-status`
- DexScreener liquidity search (real only)
- Polymarket gamma activity (real only; empty on CORS failure)
- `fetchStreamlabsStats` → always `null` (no backend yet)

### Removed mock / Gemini

| File | Change |
|------|--------|
| `services/apiService.ts` | Rewritten — delegates to `pulseApi`, no `@google/genai` |
| `hooks/useRealTimeData.ts` | Loads from `/api/*` + Solana governance |
| `services/solanaGovernance.ts` | No `MOCK_PROPOSALS` fallback |
| `services/jupiterSwap.ts` | `getWhaleActivity()` returns `[]` |
| `components/CNBCNewsWidget.tsx` | `/api/news` + `/api/tickers` |
| `components/WhaleWatch.tsx` | No `generateNeuralReport`; empty-state intel tab |
| `App.tsx` | Tickers/charts from hook; config-status oracle line; podcast via `/api/podcasts` |

### Empty states (not fake data)

- **News:** message when `GNEWS_API_KEY` / `NEWS_API_KEY` unset
- **Podcasts:** message when `PODCAST_RSS_URLS` unset
- **Streamlabs:** `streamStats` null; overlay shows `---`
- **Whale ledger:** no mock rows
- **Markets:** empty when `/api/tickers` returns `[]`

## Verify locally

```powershell
cd D:\Users\admin2\Desktop\MYCOSOFT\CODE\MYCODAO
npm run build
# Dev: next on 3004 + pulse assets in public/pulse
```

- `GET http://localhost:3004/api/tickers`
- `GET http://localhost:3004/api/pulse/config-status`
- Open `http://localhost:3004/pulse`

## Deploy (MYCODAO VM 198)

**Deployed Jun 05, 2026** — commits `3888779`, `60b296b`, `bf434ee` on `MycosoftLabs/MYCODAO` `main`.

```powershell
.\scripts\deploy-pulse-vm.ps1 -PrivateKeyOpenSSH "$env:USERPROFILE\.ssh\mycodao_pulse_ed25519"
```

Live verification:

| URL | Result |
|-----|--------|
| `https://pulse.mycodao.com/api/health` | `ok: true` |
| `https://pulse.mycodao.com/api/tickers` | 20 tickers |
| `https://pulse.mycodao.com/api/pulse/config-status` | shows unset keys (news/RSS/Streamlabs) |
| `https://pulse.mycodao.com/pulse` | HTTP 200 SPA |

## Known gaps

- Streamlabs integration — no API route; UI shows not configured
- On-chain whale index — needs MAS/MINDEX indexer endpoint
- Polymarket from browser may hit CORS — consider MYCODAO proxy route later
- Some dashboard widgets still use static demo copy (DAO interaction log, FungIP feed) — not price/mock market data

## Lessons learned

- Pulse SPA must call **same-origin** `/api/*` so production and VM deploy share one backend surface
- Empty arrays beat Gemini fallbacks for ops honesty when keys are missing
