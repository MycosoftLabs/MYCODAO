> **AWS topology correction 2026-11-27: production is AWS-only; this file's legacy on-prem references are not deployment authority. See [AWS_INFRA_REFERENCE.md](../AWS_INFRA_REFERENCE.md) for its replacement and disposition. Loopback development and physical-device fixtures are separate.**

# BLOCKS Idle Bumper + Blue-Green Deploy — Complete (Jun 04, 2026)

**Date:** Jun 04, 2026  
**Status:** Complete  
**Host:** VM 192.168.0.198 — https://blocks.mycodao.com

## What was delivered

### 1. Off-air idle bumper (fixes stale YouTube after producer stop)

**Problem:** Turning the producer off (`programMode: schedule`, no override) still played the old YouTube embed because:

- Server fell through to `envFallback()` (`NEXT_PUBLIC_PULSE_NEWS_*` env vars).
- Client merged API `null` embed with build-time fallback in `useNewsProgram`.
- `NewsLiveStage` rendered a black box instead of a branded idle frame.

**Fix:**

| Layer | Change |
|-------|--------|
| `lib/news-bumper.ts` | Canonical bumper path `/blocks/broadcast/news-idle-bumper.png` |
| `lib/server/news-channel-program.ts` | When producer is off-air, skip env fallback; use schedule or idle bumper; add `playbackActive` + `bumperUrl` to API |
| `myco-pulse/src/hooks/useNewsProgram.ts` | Trust API when loaded — no build-time embed merge when `playbackActive` is false |
| `myco-pulse/src/components/NewsLiveStage.tsx` | Full-bleed bumper image when idle; unmount iframe/video |
| Assets | `Discord_Server Header.png` → `myco-pulse/public/broadcast/news-idle-bumper.png` + `public/broadcast/` |

**Verify off-air:**

```bash
curl -s https://blocks.mycodao.com/api/news/program | jq '.playbackActive, .bumperUrl, .embedUrl'
# Expected when producer off: false, "/blocks/broadcast/news-idle-bumper.png", null
```

Open News tab — Discord server header bumper fills the stage; no YouTube iframe.

### 2. Blue-green zero-downtime deployment

Mirrors mycosoft.com production pattern:

| File | Purpose |
|------|---------|
| `docker-compose.blue-green.yml` | `mycodao-proxy` (nginx :3004) + `mycodao-blue` / `mycodao-green` slots |
| `deploy/nginx/nginx.conf` | Proxy base config with Docker DNS resolver |
| `deploy/nginx/conf.d/blocks.conf.template` | Rendered per cutover (`__ACTIVE_SLOT__`) |
| `scripts/blue-green-deploy.sh` | Bootstrap, cutover, rollback, verify |

**First-time on VM:**

```bash
cd /opt/mycodao
chmod +x scripts/blue-green-deploy.sh
DEPLOY_DIR=/opt/mycodao bash scripts/blue-green-deploy.sh --bootstrap
```

**Routine deploy (zero downtime):**

```bash
DEPLOY_DIR=/opt/mycodao bash scripts/blue-green-deploy.sh --cutover
```

**Rollback:**

```bash
DEPLOY_DIR=/opt/mycodao bash scripts/blue-green-deploy.sh --rollback
```

State file: `/opt/mycodao/state/active-slot` (`blue` or `green`).  
Cloudflared tunnel targets `mycodao-proxy:3004` — unchanged public port.

`scripts/apply_blocks_nas_production.py` now bootstraps blue/green on first deploy, then uses `--cutover` on subsequent runs.

## Related prior work (same release)

- Funding market table, Project Oyster / MushroomGO thumbnails (funding page).
- NAS producer APIs on VM 198.

## Lessons learned

- Producer "schedule" mode means **off-air** for playback resolution — env YouTube must not apply in that state.
- Client-side build-time embed fallback must respect server `playbackActive` or stale streams persist in the iframe.
- Blue/green on BLOCKS uses **on-VM docker build** (not GHCR) with tagged slot images `mycodao:blue-*` / `mycodao:green-*`.
