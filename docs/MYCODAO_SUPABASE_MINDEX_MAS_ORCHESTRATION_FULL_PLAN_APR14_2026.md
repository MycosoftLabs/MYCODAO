> **AWS topology correction 2026-11-27: production is AWS-only; this file's legacy on-prem references are not deployment authority. See [AWS_INFRA_REFERENCE.md](../AWS_INFRA_REFERENCE.md) for its replacement and disposition. Loopback development and physical-device fixtures are separate.**

# MycoDAO Supabase · MINDEX · MAS orchestration — full plan — Apr 14, 2026

**Status:** Plan (implementation follows waves below)  
**Companion:** `../../MAS/mycosoft-mas/docs/MYCODAO_AGENT_CLUSTER_MYCA_ORCHESTRATION_APR14_2026.md`

---

## 1. Goal

Wire **MycoDAO Pulse** so that:

- **Supabase** is the operational source of truth for **auth**, **user/agent preferences**, **trading-adjacent telemetry** (non-secret), **news/market/insight references**, and **DAO governance rows** aligned with MycoDAOAgent evolution.
- **MINDEX** holds **analytics-grade mirrors**, **aggregates**, and **cross-product joins** (species, compliance, CREP-adjacent signals where applicable).
- **MYCA / MAS (192.168.0.188:8001)** orchestrates **clusters of agents** tagged `cluster: mycodao` for routing, risk gates, scheduled reporting, and ETL triggers — without embedding broker secrets in any browser bundle.

---

## 2. High-level architecture

```
Pulse (Next.js) ──SSR/API routes──► Supabase (Auth + Postgres + RLS)
       │                                    │
       │ server-only                        │ triggers / queues
       ▼                                    ▼
MAS orchestrator ◄────────────────► ETL / Edge functions / n8n (MAS VM 188)
       │                                    │
       ▼                                    ▼
MINDEX API (189:8000) ◄────────── mirrors, facts, fund aggregates
```

- **Pulse** never uses Supabase **service role** in the browser; only **anon** + user JWT for RLS-protected reads/writes where designed.
- **MAS** uses **service role** or **internal** Supabase credentials **only on server/VM**, same as other integrations.
- **Broker / exchange** keys stay in **MAS env**, **Pulse server env**, or **vault** — never `NEXT_PUBLIC_*`.

---

## 3. Supabase: proposed `mycodao` schema (Postgres)

Use a dedicated schema `mycodao` (not mixed with public app tables) for clarity and migrations.

| Area | Tables (illustrative) | Notes |
|------|------------------------|--------|
| **Profiles** | `mycodao.profiles` (1:1 `auth.users`) | `display_name`, `risk_tier`, `prefs_json`, `created_at` |
| **Agent ops** | `mycodao.agent_runs` | `id`, `user_id`, `task_type`, `payload_ref`, `status`, `mas_task_id`, `error`, timestamps |
| **Trading telemetry** | `mycodao.trading_events` | **Non-secret** fills, intents, paper/live flag, symbol, **hashed** idempotency key |
| **Markets** | `mycodao.market_snapshots` | Normalized quotes/refs from feeds (no API keys) |
| **News** | `mycodao.news_items` | URL, title, source, `published_at`, optional embedding id |
| **Insights** | `mycodao.insights` | Agent- or rules-generated summaries; links to MINDEX ids |
| **DAO / fund** | `mycodao.fund_snapshots`, `mycodao.governance_proposals` | Align with MycoDAOAgent; PnL from **verified** feeds only |
| **Audit** | `mycodao.audit_log` | Append-only critical actions |

**RLS:** Enable on all user-visible tables; policies keyed on `auth.uid()`. Service role bypasses for ETL from trusted workers only.

---

## 4. MINDEX: mirrors and ETL

- **Mirror tables** (or materialized views) for: agent run summaries, fund snapshots, news refs — keyed by `supabase_id` / external id for idempotent upsert.
- **ETL job** (Python on MAS or MINDEX VM): poll Supabase changes (or Supabase → webhook → MAS → MINDEX) with **internal auth** to MINDEX API.
- **No mock PnL:** empty states or “awaiting feed” until real broker/account APIs are connected server-side.

---

## 5. MAS / MYCA

- **Task types:** `mycodao.<domain>.<action>` (see companion agent doc).
- **MycoDAOAgent:** governance + treasury fields migrate from JSON cache to Supabase + MINDEX mirrors.
- **New/extended agents:** TradingCoordinator, Risk, NewsBridge, FundReporter (logical names; may be fewer classes with typed handlers).
- **n8n:** scheduled jobs on **MAS VM 188** only (not MYCA 191).

---

## 6. Pulse integration phases

| Phase | Scope |
|-------|--------|
| **P0** | Env vars, Supabase client (server + browser), auth callback routes, `mycodao` schema migration |
| **P1** | Bind dashboard reads/writes to real tables; remove any placeholder “portfolio” data |
| **P2** | MAS webhook + agent_runs correlation; MINDEX sync job live |
| **P3** | Fund reporting, alerts, optional realtime channels |

---

## 7. Security checklist

- [ ] No service role in client.
- [ ] No broker secrets in `NEXT_PUBLIC_*`.
- [ ] RLS tested for cross-user denial.
- [ ] Audit log for sensitive settings changes.

---

## 8. Open decisions

- Single Supabase project vs dedicated project for MycoDAO-only isolation.
- Which broker/paper API first (server-side only).
- Legal/compliance review before “fund” language in production UI.

---

## 9. Wave verification (W1)

- [ ] User can sign in; row appears in `mycodao.profiles`.
- [ ] Pulse reads only allowed columns under RLS.
- [ ] MAS can insert `agent_runs` via server path without exposing keys.

---

*End — Apr 14, 2026.*
