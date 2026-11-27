> **AWS topology correction 2026-11-27: production is AWS-only; this file's legacy on-prem references are not deployment authority. See [AWS_INFRA_REFERENCE.md](../AWS_INFRA_REFERENCE.md) for its replacement and disposition. Loopback development and physical-device fixtures are separate.**

# pulse.mycodao.com — deploy and test — April 14, 2026

## What runs where

| URL | App |
|-----|-----|
| `https://pulse.mycodao.com/` | Redirects to **`/pulse`** (middleware) |
| `https://pulse.mycodao.com/pulse` | **Pulse dashboard** (main UI) |

`NEXT_PUBLIC_BASE_PATH` should stay **empty** for root hosting on this hostname (`next.config.mjs`).

## On the MycoDAO VM (Proxmox 90 guest, e.g. 192.168.0.198)

**Automated (recommended):** copy `deploy/vm-bootstrap.sh` to the guest, `chmod +x deploy/vm-bootstrap.sh`, run it once (installs Docker, clones to `/opt/mycodao` by default, creates `.env.production` from example if missing). Edit secrets in `.env.production`, then run the script again or `docker compose --profile tls up -d --build`.

**Manual:**

1. Install **Docker** + **Docker Compose plugin** (Ubuntu: `apt install docker.io docker-compose-plugin`).
2. Clone repo: e.g. `sudo git clone <repo> /opt/mycodao && cd /opt/mycodao`.
3. **`cp .env.example .env.production`** and set at minimum:
   - `FINNHUB_API_KEY` (market data)
   - `MINDEX_API_URL=http://mindex-internal.mycosoft.com:8000` and `MAS_API_URL=http://mas-internal.mycosoft.com:8001` (and tokens if your APIs require them)
   - Optional: `GNEWS_API_KEY`, `PODCAST_RSS_URLS`, etc.
4. **App only (port 3004):**
   ```bash
   docker compose up -d --build
   ```
5. **HTTPS for pulse.mycodao.com (Caddy + Let’s Encrypt):**
   - Point **DNS** `pulse.mycodao.com` A/AAAA record to this VM’s **public** IP (or use Cloudflare **Full (strict)** with valid origin cert).
   - Open **80** and **443** on the host firewall.
   - `deploy/Caddyfile` is committed; hostname is `pulse.mycodao.com` → `mycodao:3004`.
   ```bash
   docker compose --profile tls up -d --build
   ```
6. First deploy: Caddy may take a minute to obtain TLS. Check `docker compose logs -f caddy`.

## Cloudflare Tunnel (recommended for LAN / no public 80/443)

Keeps **`mycodao.com` / `www` on Webflow** — only **`pulse`** is configured in Zero Trust. Full steps: **`docs/PULSE_CLOUDFLARE_TUNNEL_SETUP_APR14_2026.md`**.

```bash
# In .env.production: CLOUDFLARE_TUNNEL_TOKEN=<token from Zero Trust>
docker compose up -d --build
docker compose --profile tunnel up -d
```

Public hostname in the tunnel UI: service **`http://mycodao:3004`** (same Docker network as the app).

## DNS (Cloudflare) — direct origin (no tunnel)

- **A** record: `pulse` → origin server IP (VM public).
- SSL mode: **Full (strict)** if origin presents a valid cert (Caddy LE), or **Flexible** only if you terminate TLS only at Cloudflare (not recommended for API security).

## Test from your PC

**Local** (app must be running: `npm run dev` or `npm run start` on 3004):

```bash
npm run test:pulse-smoke
```

**Production URL** (after TLS is live):

```bash
npm run test:pulse-smoke:prod
# same as:
node scripts/pulse-smoke-local.mjs https://pulse.mycodao.com
```

Smoke hits JSON APIs: `/api/tickers`, `/api/news`, etc. Failures usually mean the server is down, TLS not ready, or firewall blocking 443.

## Related

- `docker-compose.yml` — `tls` profile for Caddy.
- `deploy/Caddyfile` — reverse proxy to container `mycodao:3004`.
- `docs/DEPLOY_AND_CLEAN_BUILD_APR14_2026.md` — clean build / stale chunk fixes.
