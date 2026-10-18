# MycoDAO v2 status (Oct 17, 2026)

**Status:** Built and browser-tested locally. Not committed, not deployed. Plan: `C:\Users\Owner1\.cursor\plans\mycodao_v2_blocks_site_mindex_oct17_2026.plan.md`. Review inputs: `MycoDAO_Product_Review_2026-10-17` (tasks M01–M36).

## Local URLs (worktree `_wt/mycodao-fungi-blocks-oct15`, `next dev` on 3020)

- Blocks v2: `http://127.0.0.1:3020/v2` (Pulse, markets, MYCO, catalog, projects, community, FungIP, rewards)
- Site v2: `http://127.0.0.1:3020/site-v2` (home, science, projects, Project Oyster, token, FungIP)
- Blocks v1 (filler removed): `http://127.0.0.1:3020/blocks/`
- API: `http://127.0.0.1:3020/api/mycodao/v1/*` (`/openapi.json`)

## Delivered

| Piece | Where |
|---|---|
| Contract + client for web and the MYCO iOS/Android app | `packages/mycodao-sdk` (`@mycodao/sdk`) |
| Gateway (MINDEX or local mirror, live adapters, rewards proxy with bearer auth, CORS) | `app/api/mycodao/v1/[...path]/route.ts`, `lib/server/mycodao-v1/*` |
| Seed records (real sources only; unverified items labeled) | `content/mycodao-v1/*.json` |
| Blocks v2 / site v2 UI | `app/v2/**`, `app/site-v2/**`, `components/v2/**` |
| v1 filler cleanup (M02) | `myco-pulse/src/**` (fake balance, canned AI copy, dead tokenomics, dead buttons, royalty/IP-NFT copy) |
| MINDEX API (schema `mycodao`, 10 read + 10 write endpoints, 71 tests) | MINDEX branch `cursor/mycodao-v1-api-oct17` (`6a65880`, `3c3e96c`), migration `0041_mycodao_v2_content_OCT17_2026.sql` |
| Docs | `docs/MYCO_APP_API_CONTRACT_OCT17_2026.md`, `docs/MYCODAO_CLAIM_REGISTER_OCT17_2026.md`, MINDEX `docs/MYCODAO_V1_API_OCT17_2026.md` |

## Known gaps

- MINDEX runs on AWS (`mindex-internal.mycosoft.com`, VPC-private). From the dev PC the gateway serves the labeled local mirror; on ECS it reads MINDEX.
- OpenAlex rate-limits this IP (v1 polls it); Pulse research is empty until it clears, then cached 15 minutes.
- DexScreener currently returns no MYCO pairs; the MYCO quote shows an honest empty state when no source answers.
- MycoPOD RSS has no published episodes yet.
- Rewards inside v2 reuses the v1 species-rewards components (`/api/species-tokens/*`); the app should use the SDK `rewards.*` calls.
- `myco-pulse` lint has 27 pre-existing errors in `ProducerDashboard.tsx` / `useNewsProducer.ts` (uncommitted producer work, not this change). Build passes.

## Needs Morgan

- Approve the MYCO spec (M07), confirm organization relationships with records (M03), supply Project Oyster evidence (M05).
- Approval to commit, apply migration 0041 on Aurora, seed, and deploy the Blocks image to ECS.
