> **AWS topology correction 2026-11-27: production is AWS-only; this file's legacy on-prem references are not deployment authority. See [AWS_INFRA_REFERENCE.md](../AWS_INFRA_REFERENCE.md) for its replacement and disposition. Loopback development and physical-device fixtures are separate.**

# Pulse — Cloudflare Tunnel for pulse.mycodao.com — April 14, 2026

## What this does

- **`https://pulse.mycodao.com`** reaches the MycoDAO Next.js app (Pulse dashboard) via **Cloudflare Tunnel** (`cloudflared`).
- **Does not change** the marketing site: leave **`mycodao.com`** and **`www.mycodao.com`** pointing at **Webflow** as they do today. Only the **`pulse`** hostname is added for the app.

## Architecture

| Hostname | Traffic |
|----------|---------|
| `mycodao.com`, `www.mycodao.com` | Unchanged — Webflow (or your current CNAME/A). **Do not** repoint these for Pulse. |
| `pulse.mycodao.com` | Cloudflare Tunnel → Docker service `mycodao:3004` (HTTP inside the bridge network). |

Edge HTTPS is terminated at Cloudflare. The tunnel is encrypted; the origin can use HTTP to the app container.

Visiting `https://pulse.mycodao.com/` **redirects to `/pulse`** (see root `middleware.js`).

## API automation (optional)

From the **Mycosoft MAS** repo, `scripts/_cloudflare_mycodao_pulse_tunnel.py` can create/update tunnel **`mycodao-pulse`**, set ingress **`pulse.mycodao.com` → `http://mycodao:3004`**, and create/update the **CNAME** `pulse` → `<tunnel-id>.cfargotunnel.com`.

**Requires:** `CLOUDFLARE_API_TOKEN` with **Account / Cloudflare Tunnel / Edit** (required for tunnel API; DNS-only tokens get HTTP 403) **and** **Zone / DNS / Edit** for `mycodao.com`. **The zone `mycodao.com` must exist on that account.** Account id is read from the zone if omitted. Optional: `CLOUDFLARE_ZONE_ID_MYCODAO`.

**Workspace note:** If your main `CLOUDFLARE_API_TOKEN` is restricted to **mycosoft.com** / **mycosoft.org** only, add **`CLOUDFLARE_API_TOKEN_MYCODAO=...`** to `MAS/mycosoft-mas/.credentials.local` with a token whose **Zone / Resources** includes **mycodao.com** (or **All zones**) plus **Account / Cloudflare Tunnel / Edit**. The script `scripts/_cloudflare_mycodao_pulse_tunnel.py` prefers `CLOUDFLARE_API_TOKEN_MYCODAO` when set.

If you **edit** an existing token’s permissions in the dashboard, you must often **create a new token** and **paste the new secret** into the file — the old secret string does not gain new permissions.

The Cursor **Cloudflare MCP** in this workspace is oriented to **Workers** routes and secrets; **zone DNS and Zero Trust tunnels** are handled via the **Cloudflare REST API** (as in the script above).

## One-time: create the tunnel (Cloudflare Zero Trust)

1. Log in to [Cloudflare One](https://one.dash.cloudflare.com/) → **Networks** → **Tunnels** → **Create a tunnel**.
2. Choose **Cloudflared** → name it (e.g. `mycodao-pulse`).
3. **Public hostname**
   - **Subdomain:** `pulse`
   - **Domain:** `mycodao.com`
   - **Path:** (leave empty for all paths)
   - **Service type:** HTTP
   - **URL:** `http://mycodao:3004`  
     Use this exact hostname if **`cloudflared` runs in the same Docker Compose stack** as the `mycodao` service (same user-defined bridge network).
   - If you run `cloudflared` on the **host OS** instead (not in Compose), use `http://127.0.0.1:3004` (or `localhost:3004`).
4. Save. Cloudflare will offer to create/update the **DNS** record for `pulse.mycodao.com` as a **CNAME** to the tunnel — **only** this name is touched; apex/`www` stay as-is for Webflow.
5. Copy the **tunnel token** (or use the install command’s token) for the next step.

## Server: run the tunnel with Docker

1. In `.env.production` on the VM (or `.env` loaded by Compose), set:

   ```bash
   CLOUDFLARE_TUNNEL_TOKEN=<paste token from dashboard>
   ```

2. Start app + tunnel (no Caddy required for public HTTPS when using the tunnel):

   ```bash
   docker compose up -d --build
   docker compose --profile tunnel up -d
   ```

3. Check logs: `docker compose logs -f cloudflared`

Do **not** commit `CLOUDFLARE_TUNNEL_TOKEN`.

## Local quick test (optional)

Install [`cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) on your PC, then with the app running on port 3004:

```bash
cloudflared tunnel --url http://localhost:3004
```

Use a **temporary** Cloudflare try hostname or a **separate** dev tunnel in Zero Trust; production should use the token + Compose service URL `http://mycodao:3004` on the VM.

## TLS profile vs tunnel

- **`--profile tls`** (Caddy): use when you want Let’s Encrypt on the VM and public DNS **A** record to your IP.
- **`--profile tunnel`** (`cloudflared`): use when the origin has **no** public inbound ports; Cloudflare connects outbound. You typically **do not** need both for the same hostname — pick one for `pulse.mycodao.com`.

## Verify

```bash
npm run test:pulse-smoke:prod
```

## Troubleshooting: nothing loads at https://pulse.mycodao.com

Two things must both be true:

1. **DNS** — `pulse.mycodao.com` must resolve publicly (not NXDOMAIN). In the **mycodao.com** zone on Cloudflare, add the hostname from the tunnel (often a **CNAME** to `*.cfargotunnel.com` created automatically when you save the public hostname in Zero Trust). Confirm with `nslookup pulse.mycodao.com 8.8.8.8`.

2. **Tunnel running with a token** — On the VM, `/opt/mycodao/.env.production` must set **`CLOUDFLARE_TUNNEL_TOKEN=<token>`** (from Zero Trust → your tunnel → **Configure**). Then:

   ```bash
   cd /opt/mycodao && docker compose --profile tunnel up -d
   docker compose logs cloudflared --tail 50
   ```

   If the token is missing or wrong, `cloudflared` exits with errors like *requires the ID or name of the tunnel* or *token* issues — the edge never connects, so the hostname shows nothing or an error.

The Pulse app on the VM (`http://127.0.0.1:3004` or `http://192.168.0.198:3004`) can be healthy while the **public** URL still fails until DNS + tunnel are fixed.

## Related

- `docker-compose.yml` — `tunnel` profile (`cloudflare/cloudflared`).
- `docs/CLOUDFLARE_MYCODAO_APR14_2026.md` — zone/DNS overview.
- `docs/PULSE_MYCODAO_COM_DEPLOY_AND_TEST_APR14_2026.md` — VM bootstrap and Caddy alternative.
