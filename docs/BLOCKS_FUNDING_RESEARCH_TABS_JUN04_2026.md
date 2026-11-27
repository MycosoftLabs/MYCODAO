> **AWS topology correction 2026-11-27: production is AWS-only; this file's legacy on-prem references are not deployment authority. See [AWS_INFRA_REFERENCE.md](../AWS_INFRA_REFERENCE.md) for its replacement and disposition. Loopback development and physical-device fixtures are separate.**

# BLOCKS Funding & Research Tabs — Jun 04, 2026

**Status:** Complete (local build)  
**App:** `myco-pulse` → `public/blocks/`  
**URLs:** http://192.168.0.241:3000/blocks/ · https://blocks.mycodao.com/blocks/

---

## Delivered

### Navigation

| Order | Tab | Notes |
|-------|-----|--------|
| 1 | News | unchanged |
| 2 | Pulse | unchanged |
| 3 | **Podcasts** | moved **above** Organizations |
| 4 | Organizations | DAO / Realms |
| 5 | **Funding** | new — DeSci launchpad |
| 6 | **Research** | new — papers & programs |
| 7+ | Markets, Trade, FungIP, Learn, MYCO | unchanged |

### Funding tab

- **BLOCK · DeSci Launchpad** hero — MycoDAO treasury, incubation, curation, auction (no third-party incubator branding).
- **Live stats** from `/api/funding` + MYCO snapshot (grant pool, proposals, biobank, spot).
- **Sections:** Auction · Curation · Incubation · Live · Funding tools.
- **Science markets grid** — pipeline cards from `desciCatalog.ts` (Project Oyster, FungIP, LAB-IN-A-BOX, FCI, grants, network).
- **ResearchHub panel** — live feed when `RESEARCHHUB_API_BASE` is set; otherwise link-out to [ResearchHub Popular](https://www.researchhub.com/popular).

### Research tab

- **Indexed research** — existing `/api/research` (MINDEX / OpenAlex).
- **ResearchHub popular** — `/api/researchhub`.
- **MycoDAO science programs** — same catalog as Funding, focused on docs/science (not auctions).

### APIs (MYCODAO Next.js)

| Route | Adapter |
|-------|---------|
| `GET /api/funding` | `lib/adapters/funding.ts` |
| `GET /api/researchhub` | `lib/adapters/researchhub.ts` |

### Env (VM)

```env
# ResearchHub Django API base (production backend URL — not the Next.js site)
RESEARCHHUB_API_BASE=https://<researchhub-api-host>
```

Docs: [ResearchHub Docs](https://docs.researchhub.com/)

---

## Verify

1. `cd myco-pulse && npm run build`
2. Open BLOCKS → **Funding** and **Research**
3. Confirm Podcasts appears before Organizations in sidebar and bottom nav
4. After deploy, set `RESEARCHHUB_API_BASE` and confirm papers populate (no mock rows)

---

## Files

- `myco-pulse/src/components/PulseShellNav.tsx`
- `myco-pulse/src/components/FundingView.tsx`
- `myco-pulse/src/components/ResearchView.tsx`
- `myco-pulse/src/data/desciCatalog.ts`
- `myco-pulse/src/lib/pulseApi.ts`
- `app/api/funding/route.ts`
- `app/api/researchhub/route.ts`
- `lib/adapters/funding.ts`
- `lib/adapters/researchhub.ts`
- `lib/types.ts`
