> AWS topology correction 2026-11-27: local production servers, LAN addresses and VM/Proxmox/NAS deployment instructions are retired. Use [AWS_INFRA_REFERENCE.md](../AWS_INFRA_REFERENCE.md). Preserve historical evidence and optional device/external connectors.

# Cloudflare — mycodao.com and pulse.mycodao.com (Apr 14, 2026)

## Webflow + Pulse (do not break marketing)

- **`mycodao.com`** and **`www.mycodao.com`** should **keep** whatever DNS you use for the **Webflow** (or current marketing) site. **Do not** change apex/`www` records to point at the Pulse VM or tunnel unless you intend to migrate the whole site.
- **`pulse.mycodao.com`** is a **separate** hostname: use a **Cloudflare Tunnel** (recommended, see `docs/PULSE_CLOUDFLARE_TUNNEL_SETUP_APR14_2026.md`) or an **A** record to a public IP with Caddy (`tls` profile). Only **`pulse`** is added for the Next.js app.

## Zone

- Add **`mycodao.com`** to your Cloudflare account (or transfer nameservers from the registrar / Webflow when ready).

## DNS

| Name | Type | Content | Proxied |
|------|------|-----------|---------|
| `pulse` | CNAME (tunnel) or A | Tunnel hostname from Zero Trust, or VM public IP | Yes (orange cloud) for A; tunnel DNS is managed by Cloudflare |
| `@` | A or CNAME | **Webflow / marketing — leave as-is** | Per current setup |
| `www` | CNAME | **Webflow / marketing — leave as-is** | Per current setup |

For **origin on LAN** only: use **Cloudflare Tunnel** (`cloudflared`) from the VM to Cloudflare so no public IP is required — see **`docs/PULSE_CLOUDFLARE_TUNNEL_SETUP_APR14_2026.md`**.

## SSL/TLS

- **Full (strict)** when the origin presents a valid certificate (Caddy Let’s Encrypt or Cloudflare Origin Certificate on the VM).

## Caching

- **Cache Rules**: bypass cache for HTML document path `/` and `/pulse` (or all `text/html`).
- **Cache** long-lived assets: `/_next/static/*` with long edge TTL.

## Firewall

- If exposing the VM: restrict **80/443** to Cloudflare IP ranges (or use Tunnel only).
