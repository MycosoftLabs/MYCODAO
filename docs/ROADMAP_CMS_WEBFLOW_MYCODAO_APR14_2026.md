> AWS topology correction 2026-11-27: local production servers, LAN addresses and VM/Proxmox/NAS deployment instructions are retired. Use [AWS_INFRA_REFERENCE.md](../AWS_INFRA_REFERENCE.md). Preserve historical evidence and optional device/external connectors.

# Roadmap — Webflow exit, Figma parity, MYCA CMS (Apr 14, 2026)

## Out of current Pulse MVP

This document tracks **follow-on** work after the dashboard and self-hosted Pulse are stable.

## Phase 1 — Marketing site off Webflow

- Content inventory and URL map from Webflow.
- Rebuild in **Next.js** (same repo or monorepo) against **Figma** specs; refresh copy and data older than ~12 months.
- **`mycodao.com`** apex and **www** redirects decided explicitly.

## Phase 2 — CMS and MYCA automation

- Editorial model: drafts in **git**, **MINDEX**, or a headless CMS; **MYCA** (MAS VM) orchestrates ingest from Claude / Cursor / ChatGPT / Perplexity **with human review** before publish.
- Auth, RBAC, and audit log for any auto-published content.

## Phase 3 — Trading engine VM

- Separate VM for execution/risk engines; Pulse UI talks over **authenticated LAN APIs**; **MAS** for policy and automation; **MINDEX** for historical series.

## Dependencies

- Stable **`FINNHUB_API_KEY`** or internal OHLC on MINDEX for production charts.
- Cloudflare + DNS cutover only after TLS and smoke tests on **pulse.mycodao.com**.
