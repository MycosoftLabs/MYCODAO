> **AWS topology correction 2026-11-27: production is AWS-only; this file's legacy on-prem references are not deployment authority. See [AWS_INFRA_REFERENCE.md](../AWS_INFRA_REFERENCE.md) for its replacement and disposition. Loopback development and physical-device fixtures are separate.**

# Pulse VM + Cloudflare Tunnel deploy — Apr 14, 2026

**Goal:** `https://pulse.mycodao.com` → MycoDAO Docker on LAN VM (e.g. **192.168.0.198**) via **Cloudflare Tunnel**, without repointing apex `mycodao.com` / `www` (Webflow).

## Prerequisites

1. **Zero Trust tunnel** — Public hostname **`pulse.mycodao.com`** → service **`http://mycodao:3004`** (same Docker network as `cloudflared`). Copy **`CLOUDFLARE_TUNNEL_TOKEN`** (see `docs/PULSE_CLOUDFLARE_TUNNEL_SETUP_APR14_2026.md`).
2. **VM:** Docker + Compose; repo at **`/opt/mycodao`**; **`.env.production`** with at least `FINNHUB_API_KEY` (and `CLOUDFLARE_TUNNEL_TOKEN` for tunnel).
3. **DNS:** In Cloudflare Zero Trust, allow the tunnel to create/update the **CNAME** for `pulse` (or create manually to the tunnel target).

## Cloudflare API / MCP

- **Tunnel + hostname** are managed in **Zero Trust → Networks → Tunnels** (not standard Zone DNS API alone). The MCP **`zones_list`** tool can confirm the **`mycodao.com`** zone exists; tunnel DNS records often appear as automatic CNAMEs to `*.cfargotunnel.com`.
- **Do not** change apex/`www` records for Webflow.

## SSH when the guest is public-key only (Proxmox bootstrap)

If password auth is disabled and no key is on your PC, use **Proxmox + `virt-customize`** to inject a deploy key, then use **OpenSSH** + `.\scripts\deploy-pulse-vm.ps1` (auto-detects `.ssh-pulse-deploy/id_ed25519`). Full steps: **`docs/PULSE_SSH_BOOTSTRAP_VIA_PROXMOX_APR16_2026.md`**.

## SSH to the VM (password vs public key)

If the guest only allows **public-key** auth (common on hardened images), **password-based `plink -pw` will fail** with `No supported authentication methods available (server sent: publickey)`.

1. Generate or reuse an SSH key; for PuTTY use **`.ppk`** (PuTTYgen can convert OpenSSH `id_ed25519` → `.ppk`).
2. Append the **OpenSSH public key** line to **`/home/mycosoft/.ssh/authorized_keys`** on the VM (via Proxmox console, another admin machine, or a one-time password session).
3. Deploy from Windows:

```powershell
$env:VM_SSH_PRIVATE_KEY_PPK = "$env:USERPROFILE\.ssh\mycodao_198.ppk"
.\scripts\deploy-pulse-vm.ps1
# or: .\scripts\deploy-pulse-vm.ps1 -PrivateKeyPpk "C:\path\to\key.ppk"
```

**First connect:** `plink` needs the host key; the script pins **`-hostkey`** for **192.168.0.198**. If the VM is reinstalled, update **`$HostKey`** in `scripts/deploy-pulse-vm.ps1` from the fingerprint `plink` prints.

## One-command deploy (Windows, LAN)

From repo root:

- **Password:** loads from MAS `.credentials.local` or `VM_PASSWORD` / `VM_SSH_PASSWORD`.
- **Pubkey:** set `VM_SSH_PRIVATE_KEY_PPK` or pass **`-PrivateKeyPpk`**.

```powershell
.\scripts\deploy-pulse-vm.ps1
```

This **pulls `origin/main`**, rebuilds **`mycodao`**, starts **`docker compose up -d`**, then **`docker compose --profile tunnel up -d`**.

## Manual on VM

```bash
cd /opt/mycodao
git fetch origin && git checkout main && git reset --hard origin/main
docker compose build --no-cache mycodao
docker compose up -d
docker compose --profile tunnel up -d
docker compose logs -f cloudflared
```

**First-time bootstrap:** `deploy/vm-bootstrap.sh` — set **`MYCODAO_COMPOSE_PROFILE=tunnel`** for tunnel instead of Caddy TLS:

```bash
export MYCODAO_COMPOSE_PROFILE=tunnel
./deploy/vm-bootstrap.sh
```

## Verify

- `curl -sS https://pulse.mycodao.com/api/health`
- `npm run test:pulse-smoke:prod` (from dev PC)
- Deep check (optional): `https://pulse.mycodao.com/api/health?deep=1` (MAS/MINDEX reachability when env URLs are set)

## Related

- `docs/PULSE_CLOUDFLARE_TUNNEL_SETUP_APR14_2026.md`
- `docs/PULSE_MYCODAO_COM_DEPLOY_AND_TEST_APR14_2026.md`
- `docker-compose.yml` — `tunnel` profile
