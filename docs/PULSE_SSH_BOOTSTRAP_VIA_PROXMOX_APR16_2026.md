> **AWS topology correction 2026-11-27: production is AWS-only; this file's legacy on-prem references are not deployment authority. See [AWS_INFRA_REFERENCE.md](../AWS_INFRA_REFERENCE.md) for its replacement and disposition. Loopback development and physical-device fixtures are separate.**

# Pulse VM SSH access via Proxmox + virt-customize — Apr 16, 2026

**Problem:** Guest **192.168.0.198** (`mycodao-pulse`, VMID **102** on **192.168.0.90**) may allow **public-key only** for `mycosoft`, so LAN deploy from a PC with no authorized key fails.

**Approach:** On the Proxmox host (root SSH, `PROXMOX_PASSWORD` in `.credentials.local`), inject a deploy public key into the guest disk with **`virt-customize`** while the VM is **stopped** (safest). QEMU guest agent was not required.

## One-time key generation (dev PC)

From the MYCODAO repo root (key is **gitignored**):

```powershell
mkdir .ssh-pulse-deploy -Force
ssh-keygen -t ed25519 -f .ssh-pulse-deploy/id_ed25519 -N '""'
```

## Inject key (on Proxmox as root)

Replace `PUBKEY_FILE` with the path to `.ssh-pulse-deploy/id_ed25519.pub` (copy file to PVE `/tmp` or paste contents into `/tmp/pulse_deploy.pub`).

```bash
qm stop 102 --skiplock
sleep 3
virt-customize -a /dev/pve/vm-102-disk-0 --ssh-inject mycosoft:file:/tmp/pulse_deploy.pub
qm start 102
```

Then from the dev PC:

```powershell
ssh -i .ssh-pulse-deploy/id_ed25519 mycosoft@192.168.0.198 hostname
```

## Deploy after access

```powershell
.\scripts\deploy-pulse-vm.ps1
```

The script prefers **OpenSSH** `ssh` + `.ssh-pulse-deploy\id_ed25519` when present, and normalizes CRLF so remote `bash` does not fail.

## Cloudflare tunnel token

`CLOUDFLARE_TUNNEL_TOKEN` must be set in **`/opt/mycodao/.env.production`** on the guest for `pulse.mycodao.com`. Without it, `cloudflared` may not connect. See `docs/PULSE_CLOUDFLARE_TUNNEL_SETUP_APR14_2026.md`.

## Related

- `docs/PULSE_VM_CLOUDFLARE_TUNNEL_DEPLOY_APR14_2026.md`
- `scripts/deploy-pulse-vm.ps1`
