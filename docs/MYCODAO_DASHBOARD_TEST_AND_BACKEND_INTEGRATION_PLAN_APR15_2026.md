> **AWS topology correction 2026-11-27: production is AWS-only; this file's legacy on-prem references are not deployment authority. See [AWS_INFRA_REFERENCE.md](../AWS_INFRA_REFERENCE.md) for its replacement and disposition. Loopback development and physical-device fixtures are separate.**

# MYCODAO dashboard test & backend integration plan — Apr 15, 2026

**Goal:** Run and extend **Abelardo’s MYCODAO Next dashboard** (port **3004**), connect it to **real** MAS / MINDEX / NatureOS APIs, without affecting **mycosoft.com** local dev on **localhost:3010**.

**Non-goals:** No edits to `WEBSITE/website` for this effort unless Morgan explicitly scopes that. No shared Next dev process with the main site.

---

## 1. Isolation rules (do not harm 3010)

| Rule | Detail |
|------|--------|
| **Port** | MYCODAO dev is **`npm run dev` → 3004** only (`package.json`). Never bind MYCODAO to 3010. |
| **Process** | Run MYCODAO in its **own** external terminal (or a second window), not the same tab as the mycosoft.com dev server. |
| **Repo** | Work in **`C:\Users\admin2\Desktop\MYCOSOFT\CODE\MYCODAO`** only for dashboard changes. |
| **Kill / free port** | If troubleshooting ports, only touch **3004** for MYCODAO — do **not** stop the process on **3010** unless Morgan asks. |
| **Env files** | MYCODAO uses **`.env.local`** in the MYCODAO folder — separate from website `.env.local`. |

**Quick check before starting MYCODAO:**

- mycosoft.com dev: `http://localhost:3010` — leave running.
- MYCODAO dev: `http://localhost:3004/` and `http://localhost:3004/pulse` — start separately.

---

## 2. Backend targets (real data)

Use the same **VM URLs** as the rest of the Mycosoft stack (from each project’s env pattern — no secrets in repo):

| System | Typical base (LAN) | Used for |
|--------|---------------------|----------|
| **MAS** | `http://mas-internal.mycosoft.com:8001` | MYCA orchestrator, agents, device registry, proxies |
| **MINDEX** | `http://mindex-internal.mycosoft.com:8000` | Species, research data, search-backed APIs |
| **NatureOS** | Your deployed core-api base URL | Platform APIs, SignalR, device flows as applicable |

Set in **MYCODAO** `.env.local` (already stubbed in `.env.example`):

- `MAS_API_URL`
- `MINDEX_API_URL`
- `NATUREOS_API_URL` (when NatureOS core-api URL is fixed for this client)

Server-side routes in `app/api/*` should read these with `process.env.*` and forward requests (never bake VM IPs into client bundles unless `NEXT_PUBLIC_*` is intentional).

---

## 3. Phased execution

### Phase A — Smoke test (no backend change)

1. `cd MYCODAO` → `npm install` (once).
2. Start dev on **3004** in a **dedicated** terminal.
3. Open `/`, `/pulse`, `/token`; confirm UI loads and existing mock/feed behavior matches current code.
4. Confirm **3010** still serves mycosoft.com while **3004** is up (two Node processes — expected).

### Phase B — Backend connectivity (read-only health)

1. From the dev machine, `Invoke-RestMethod` / `curl` MAS and MINDEX `/health` (or documented health routes).
2. If unreachable, fix **network/firewall** before changing MYCODAO code.
3. Document actual base URLs in MYCODAO `.env.local` (gitignored).

### Phase C — Replace stubs with real proxies (incremental)

Order suggested (lowest risk first):

1. **`app/api/myco`** (or equivalent) → MINDEX/MAS endpoint for MYCO-relevant snapshot (contract with backend team).
2. **`app/api/research`** → MINDEX research/search routes.
3. **`app/api/news`** / **`podcasts`** / **`learn`** — only if product requires live feeds; else keep external keys or disable modules in UI.
4. **Tickers** — only wire to real sources if DAO product requires; avoid fake numbers (align with no-mock policy).

Each step: one route, test in browser Network tab, then next.

### Phase D — Auth & boundaries

- If dashboards need **logged-in** Mycosoft/DAO users: agree on **Supabase**, **MAS JWT**, or **API keys** for server-side routes only.
- Do not expose MINDEX/MAS **admin** keys to the browser.

### Phase E — Deploy path (later)

- Build MYCODAO as its **own** container or Node service on a **separate** host/port from mycosoft.com production.
- DNS: e.g. `app.mycodao.com` → MYCODAO; `mycosoft.com` unchanged.

---

## 4. Verification checklist

- [ ] **3010** still responds while **3004** is running.
- [ ] No `package.json` script in MYCODAO defaults to port 3010.
- [ ] At least one **Pulse** or **API** path returns **non-placeholder** data from MINDEX or MAS.
- [ ] `.env.local` remains **gitignored**; only `.env.example** documents variable names.

---

## 5. Related docs

- `docs/MYCODAO_HOSTING_MIGRATION_AND_NATUREAPP_PREP_APR14_2026.md` — DAO vs Mycosoft contractor model.
- `docs/DASHBOARD_PHASE1_AND_FIGMA_NEXT_PHASE_APR14_2026.md` — dashboard structure + Figma phase.

---

## 6. Explicit “do not”

- Do **not** merge MYCODAO into `WEBSITE/website` without a product decision (separate deployable is fine).
- Do **not** stop or reconfigure the **3010** dev server as part of MYCODAO work.
- Do **not** commit API keys or Figma tokens; keep in `.env.local` only.
