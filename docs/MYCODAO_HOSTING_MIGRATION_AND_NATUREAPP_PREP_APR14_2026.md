# MycoDAO hosting migration & NatureApp integration prep — Apr 14, 2026

**Status:** Preparation  
**Local repo:** `C:\Users\admin2\Desktop\MYCOSOFT\CODE\MYCODAO`  
**Canonical GitHub (target):** [MycosoftLabs/MYCODAO](https://github.com/MycosoftLabs/MYCODAO)  
**Dashboard source (fork):** [nodefather/MycoDAO](https://github.com/nodefather/MycoDAO) (fork of [abelardomyco/MycoDAO](https://github.com/abelardomyco/MycoDAO))

---

## Business model & system boundaries (canonical)

| Party | Role |
|--------|------|
| **MYCODAO (the DAO / its operating entity)** | **Separate business** from Mycosoft. Owns product vision, tokenomics, and **MYCO on Solana** as the **core product** (governance and treasury per DAO rules). |
| **Mycosoft** | **Service provider / contractor**: designs, builds, and operates the **integration** of **MYCA**, **MINDEX**, **NatureOS**, and related backend surfaces **into** MYCODAO’s apps and dashboards. |
| **NatureApp** | End-user experience (formerly **MYCO app**). Shows **live nature / environmental data** using a **CREP-like** backend — same *class* of capability as Mycosoft’s CREP (Common Relevant Environmental Picture): live layers, nature-relevant feeds, maps/timelines as specified — implemented under contract for the DAO, not “Mycosoft product” branding in end-user UI unless agreed. |

**Integration contract (conceptual):** MYCODAO frontends and token logic remain **DAO-owned**; Mycosoft delivers APIs, pipelines, MYCA orchestration, MINDEX species/research data, NatureOS platform hooks, and CREP-class live nature feeds **as services** bound by statement of work / licensing — not a merger of corporate entities.

---

## 1. What is already local

- Next.js **14** app, dev port **3004** (`npm run dev`).
- Production `basePath`: `/mycodao.financial` — see `next.config.mjs`, `middleware.js`, `lib/pulse-provider.tsx`.
- App routes include `/`, `/pulse` (and sub-routes), `/token`, and `app/api/*` (tickers, news, podcasts, research, learn, myco).
- This codebase is the **dashboard shell** to extend for IP automation, funding, and rewards — not the Webflow marketing site.

---

## 2. Webflow vs self-host (mycodao.com)

| Approach | What it means | Best when |
|----------|----------------|-----------|
| **A. Keep Webflow for marketing** | DNS keeps pointing to Webflow; **dashboard** deploys separately (subdomain or path on your infra). | You want fastest path: marketing unchanged, app under `app.mycodao.com` or reverse-proxy path. |
| **B. Webflow “host files on our server”** | Webflow **Enterprise** or export workflows; you still need Webflow for Designer updates unless you use **DevLink** syncing into a repo. | Team wants Designer + code parity; budget for Webflow tier + DevLink. |
| **C. Export static Webflow zip** | Designer → Export code (limited; CMS/forms need rebuild). | One-time migration off Webflow; accept manual HTML/CSS/JS cleanup. |
| **D. Rebuild in Next.js (this repo or WEBSITE)** | Match [mycodao.com](https://www.mycodao.com/) and [projects/myco-app-mycodex](https://www.mycodao.com/projects/myco-app-mycodex) in React; assets from Figma. | Full control, MYCA/MINDEX/NatureOS integration, no Webflow billing lock-in. |

**Practical recommendation:** Use **D for parity with Mycosoft stack** OR **A** (Webflow marketing + Next dashboard on subdomain) for a short phase, then consolidate when pages are rebuilt.

**Preview link** ([Webflow preview](https://preview.webflow.com/preview/mycodao?utm_medium=preview_link&utm_source=designer&utm_content=mycodao&preview=db626e492bb27b17661fe4844a5e9e18&workflow=preview)) is not a substitute for export — use **Designer export** or **DevLink** with project access.

---

## 3. Figma assets

- **Design file:** [MycoDAO Master File (dev)](https://www.figma.com/design/zSDD4EXpcwwS4qWWqmuYA1/MycoDAO-Master-File?node-id=210-33415&m=dev&t=Dl7aeaVOBqHd5JBP-1)
- **Prototype:** [Figma prototype](https://www.figma.com/proto/zSDD4EXpcwwS4qWWqmuYA1/MycoDAO-Master-File?node-id=2431-3577&t=v8vqnWuSuB2WaYRf-1)

**Actions (manual or Figma MCP when authenticated):**

1. Export icons/illustrations as SVG/PNG (2x) into `public/assets/mycodao/`.
2. Note typography tokens (font files → `public/fonts` or next/font).
3. Map screens to Next routes; align spacing/colors with existing Tailwind theme in this repo.

---

## 4. Product direction (aligned to your brief)

- **MYCO (Solana):** Core DAO token — economics, mint/burn, governance, and disclosures are **MYCODAO** responsibility; Mycosoft implements wallet UX, program integration points, and backend settlement **as contracted**.
- **Dashboard:** IP-asset automation, science funding, and rewards denominated in **MYCO** (plus **SOL** / **USDC** where policy requires).
- **NatureApp:** Rewards for **species imagery** and **tissue-to-lab** workflows; **live nature data** via **CREP-like** feeds (maps, timelines, environmental layers) powered by Mycosoft-delivered backend services.
- **Backends (contractor-delivered):** **MYCA** (MAS orchestrator), **MINDEX** (species / research data), **NatureOS** (platform APIs, devices, SignalR as needed). Configure with env-based URLs (`MAS_API_URL`, `MINDEX_API_URL`, NatureOS base URL) — no hardcoded infrastructure IPs in committed UI.

---

## 5. Git remotes (after clone)

Configured locally:

- `nodefather` → fork with dashboard code  
- `mycosoftlabs` → [MycosoftLabs/MYCODAO](https://github.com/MycosoftLabs/MYCODAO) (push target)  
- `abelardo` → upstream [abelardomyco/MycoDAO](https://github.com/abelardomyco/MycoDAO)

**First push to MycosoftLabs** (README-only remote may require merge or `--allow-unrelated-histories` if both have commits):

```powershell
cd C:\Users\admin2\Desktop\MYCOSOFT\CODE\MYCODAO
git fetch mycosoftlabs
git push mycosoftlabs main
```

Resolve conflicts if the org repo already has a README commit.

---

## 6. Next implementation phases (suggested)

1. **Repo:** Push this tree to `MycosoftLabs/MYCODAO`; branch strategy for NatureApp features.  
2. **Content:** Import Webflow export or rebuild top-level marketing pages in Next (same repo or monorepo).  
3. **Design:** Import Figma assets; update timelines/maps/components per new product spec.  
4. **Integrate:** Replace stub/API routes in `app/api/*` with proxies to MAS/MINDEX/NatureOS; add auth (e.g. Supabase or existing Mycosoft pattern).  
5. **Wallet/rewards:** Phantom/Solana flows for SOL/USDC; MYCO token policy documented with treasury/compliance.  
6. **Deploy:** Container or Node host on your VM; DNS for `mycodao.com` / subdomains; TLS (Caddy/Cloudflare).

---

## 7. References

- Live site: [mycodao.com](https://www.mycodao.com/)  
- Project page: [myco-app-mycodex](https://www.mycodao.com/projects/myco-app-mycodex)  
- Fork used for dashboard: [nodefather/MycoDAO](https://github.com/nodefather/MycoDAO)
