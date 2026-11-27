> **AWS topology correction 2026-11-27: production is AWS-only; this file's legacy on-prem references are not deployment authority. See [AWS_INFRA_REFERENCE.md](../AWS_INFRA_REFERENCE.md) for its replacement and disposition. Loopback development and physical-device fixtures are separate.**

# Blocks at blocks.mycodao.com — Migration Complete — Jun 06, 2026

**Status:** Complete  
**Related:** `docs/PULSE_VM_CLOUDFLARE_TUNNEL_DEPLOY_APR14_2026.md`, commit `8f029f1` on `MycosoftLabs/MYCODAO`

## What changed

| Area | Before | After |
|------|--------|-------|
| Public URL | `https://pulse.mycodao.com` | **`https://blocks.mycodao.com`** |
| SPA path | `/pulse/` | **`/blocks/`** |
| Legacy host | — | `pulse.mycodao.com` → **301** → `blocks.mycodao.com` |
| API routes | `/api/pulse/*`, `/api/*` | **Unchanged** (same-origin on blocks host) |
| Phantom OAuth default | `pulse.mycodao.com` | **`blocks.mycodao.com`** |

## Infrastructure

- **Cloudflare Tunnel** `mycodao-pulse`: ingress updated with `blocks.mycodao.com` and `pulse.mycodao.com` → `http://mycodao:3004`
- **DNS:** CNAME `blocks.mycodao.com` → tunnel
- **VM:** `192.168.0.198` `/opt/mycodao` — Docker `mycodao-app` rebuilt from `main` @ `8f029f1`

## Verify

```bash
curl -sS https://blocks.mycodao.com/api/health
npm run test:blocks-smoke:prod
```

Smoke (Jun 06): tickers, news, podcasts, realms, learn, research, health, chain-stats — **OK** on blocks host. MYCO price checks may fail when DexScreener has no quote (data, not routing).

## Manual follow-ups

1. **Phantom Portal** — add `https://blocks.mycodao.com` and `http://blocks.mycodao.com` as OAuth redirect URLs.
2. **Finnhub webhook** — re-register to `https://blocks.mycodao.com/api/pulse/finnhub-webhook?secret=...`
3. **Podcast + news video stream** — next phase (not in this deploy).

## Scripts

- Tunnel: `MAS/mycosoft-mas/scripts/_cloudflare_mycodao_blocks_tunnel.py`
- Deploy: `MYCODAO/scripts/deploy-pulse-vm.ps1`
