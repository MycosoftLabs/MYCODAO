> **AWS topology correction 2026-11-27: production is AWS-only; this file's legacy on-prem references are not deployment authority. See [AWS_INFRA_REFERENCE.md](../AWS_INFRA_REFERENCE.md) for its replacement and disposition. Loopback development and physical-device fixtures are separate.**

# Deploy and clean build — MycoDAO (Apr 14, 2026)

## Stale chunk error (`Cannot find module './948.js'`)

Cause: incomplete or out-of-date **`.next`** output (interrupted dev server, branch switch, or mixed hot-reload state).

**Fix (local or CI):**

```bash
npm run clean
npm run build
npm run dev
```

Or one step: `npm run clean:build` then `npm run dev`.

For day-to-day dev after pulls or weird HMR state, prefer:

```bash
npm run dev:fresh
```

(`dev:fresh` runs `clean` then `next dev` — see `package.json`.)

Do not commit `.next/`. On the VM, always run a **fresh build** after `git pull`.

## Production build

- `next.config.mjs` uses **`output: "standalone"`** for Docker.
- **`NEXT_PUBLIC_BASE_PATH`**: leave empty for `https://pulse.mycodao.com/` at the site root.

## Docker

From repo root:

```bash
docker compose up -d --build
```

HTTPS for **pulse.mycodao.com** (Caddy on 80/443):

```bash
docker compose --profile tls up -d --build
```

Requires `deploy/Caddyfile` and DNS pointing at the host. See **`docs/PULSE_MYCODAO_COM_DEPLOY_AND_TEST_APR14_2026.md`**.

See `Dockerfile` and `docker-compose.yml`.

## Pulse local full stack (port 3004)

Env matrix and two-terminal smoke flow: **`docs/PULSE_LOCAL_FULL_STACK_ENV_MATRIX_APR14_2026.md`**.

## Proxmox VM (LAN)

- Create a VM (e.g. Ubuntu 22.04/24.04) next to existing **mycosoft.org** / **MQTT** VMs; static IP in `192.168.0.0/24`.
- **2–4 vCPU**, **4–8 GB RAM**, **≥40 GB** disk.
- Install **Docker** + **Docker Compose**; clone this repo to e.g. `/opt/mycodao`.
- Copy **`.env.example`** → **`.env.production`** on the server; set **`FINNHUB_API_KEY`** and optional MAS/MINDEX URLs.
- Optional TLS: uncomment **`caddy`** in `docker-compose.yml`, copy **`deploy/Caddyfile.example`** → **`deploy/Caddyfile`**, set hostname, `docker compose up -d`.
