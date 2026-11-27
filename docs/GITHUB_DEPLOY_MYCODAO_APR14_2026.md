> **AWS topology correction 2026-11-27: production is AWS-only; this file's legacy on-prem references are not deployment authority. See [AWS_INFRA_REFERENCE.md](../AWS_INFRA_REFERENCE.md) for its replacement and disposition. Loopback development and physical-device fixtures are separate.**

# GitHub deploy — MycoDAO (Apr 14, 2026)

## Source of truth

- **`main`** branch: production deploys pull from GitHub.

## Manual deploy (Proxmox VM)

```bash
cd /opt/mycodao   # or your deploy path
git fetch origin && git reset --hard origin/main
npm ci
npm run clean:build
# Docker:
docker compose up -d --build
# Or systemd running `npm run start` after build — match one model only.
```

## CI

- Workflow **`.github/workflows/ci.yml`**: runs `npm ci`, `npm run lint`, `npm run build` on push/PR.

## Optional: automated deploy

- Add a **GitHub Actions** job that SSHs to the VM (stored **SSH key** in repo secrets), runs the script above, and restarts the container.
- Use a **deploy secret** and **known_hosts** pinning; never commit SSH passwords.
