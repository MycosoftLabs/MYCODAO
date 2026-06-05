# Pulse Studio Sections Restore — Jun 05, 2026

**Status:** Complete  
**Related:** `PULSE_LIVE_API_WIRING_COMPLETE_JUN05_2026.md`, Codex handoff for live API wiring

## What changed

Restored full AI Studio broadcast UI after Phase 2 API wiring stripped empty-state panels. Live `/api/*` routes are still called first; **`myco-pulse/src/data/studioPresets.ts`** fills gaps until Codex wires production keys.

| Area | Restoration |
|------|-------------|
| **News** | Full CNBC layout (bumpers, NEWS NOW, Closing Bell, marquee) + studio headlines when `/api/news` empty |
| **Whale Watch** | Ledger table, Polymarket cards, Neural Intel brief (studio text) |
| **Dashboard** | Ticker groups, chart history, podcasts, Streamlabs stats, DAO proposals — presets when live empty |
| **Stability** | `PulseErrorBoundary` on root render |

## Codex wiring targets

- `fetchStreamlabsStats` → real Streamlabs / MYCODAO proxy
- `generateNeuralReport` → MAS `/api/pulse/mas-task` or Gemini
- `getWhaleActivity` → MINDEX/MAS whale indexer
- `mergeNewsWithStudio` / `mergeEpisodesWithStudio` — remove preset merge when keys set

## Verify

```powershell
cd MYCODAO/myco-pulse
npm run lint
npm run build
```

Live: `https://pulse.mycodao.com/pulse` — News tab shows bumpers; Whale Watch tabs populated; no black screen.

## Deploy

```powershell
.\scripts\deploy-pulse-vm.ps1 -PrivateKeyOpenSSH "$env:USERPROFILE\.ssh\mycodao_pulse_ed25519"
```
