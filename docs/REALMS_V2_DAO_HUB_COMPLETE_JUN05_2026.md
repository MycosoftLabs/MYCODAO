# Realms V2 DAO Hub — Complete

**Date:** June 5, 2026  
**Status:** Complete  
**Related:** Pulse DAO tab, [Realms V2 explore](https://v2.realms.today/explore), [launchpad](https://v2.realms.today/launchpad), [V2 interface docs](https://docs.realms.today/realms-v2/v2-interface)

## Scope

Integrate **Realms V2** into MYCODAO Pulse so users can:

- Browse all DAOs from `v2.realms.today/explore` (search by name or address)
- Connect **Phantom / Solflare** (Solana wallet adapter)
- Save favorite DAOs locally and open any DAO for proposals + participation
- Create new DAOs via embedded **launchpad** (`v2.realms.today/launchpad`)
- Deep-link to Realms for on-chain voting (no simulated votes in Pulse)

## Delivered

### Backend (MYCODAO Next.js, port 3004)

| Route | Purpose |
|-------|---------|
| `GET /api/realms/daos?q=&limit=&offset=` | Cached proxy of Realms `GET /api/v1/daos` with client-side search |
| `GET /api/realms/daos/:pk?proposals=1` | DAO detail + live proposals from Realms V2 API |

- `lib/adapters/realms.ts` — 30 min cache, maps explore/treasury URLs to `v2.realms.today`
- `app/api/pulse/config-status` — `REALMS_V2_API_URL` flag + explore/launchpad URLs

### Frontend (Pulse SPA)

- `myco-pulse/src/components/RealmsDaoHub.tsx` — **Organizations** hub: square logo tiles (Directory | Saved | Active | Create)
- Logo metadata merged from `v2.realms.today/realms/mainnet-beta.json` (`ogImage` → `logoUrl`); MycoDAO override at `/org-logos/mycodao.png`
- `myco-pulse/src/lib/realmsSavedDaos.ts` — `localStorage` saved DAO list
- `myco-pulse/src/lib/pulseApi.ts` — `fetchRealmsDaos`, `fetchRealmsDaoDetail`
- `App.tsx` — `DAOView` → `<RealmsDaoHub />`; treasury links → `v2.realms.today`
- `apiService.fetchDAOProposals` — MycoDAO proposals via Realms API (not mock RPC)
- `solanaGovernance.ts` — canonical SPL program ID `GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw`

### Wallet (updated June 6, 2026)

- **Phantom Connect** — `@phantom/react-sdk`, app ID `0b78c207-6c6c-4ab7-8350-8f02552f3298`, DNS verified on `pulse.mycodao.com`
- `PhantomConnectProvider` → `SolanaProvider` (Phantom + Solflare adapters, mainnet)
- `DaoWalletConnect` + `useDaoWallet` on Organizations hub; `DaoSessionBar` + participation sidebar
- `GET /api/realms/daos/:pk/wallet/:wallet` — memberships + open voting proposals
- See [PULSE_DAO_PHANTOM_REALMS_WALLET_COMPLETE_JUN06_2026.md](./PULSE_DAO_PHANTOM_REALMS_WALLET_COMPLETE_JUN06_2026.md)

## Verify

```powershell
# API (Next on 3004)
Invoke-WebRequest "http://localhost:3004/api/realms/daos?q=myco&limit=3" -UseBasicParsing
Invoke-WebRequest "http://localhost:3004/api/realms/daos/At93fiCMzEkZWBAHxSNjfk7zUHnF3JcxyCyPjZELjK9Y?proposals=1" -UseBasicParsing

# Build Pulse
cd MYCODAO/myco-pulse
npm run build
```

UI: Pulse → **DAO** tab → search DAOs, save, connect wallet, open MycoDAO proposals, launchpad iframe.

## Env (optional)

```env
REALMS_V2_API_URL=https://v2.realms.today/api/v1
REALMS_DAO_CACHE_TTL_MS=1800000
```

Default public API works without a gated Realms API key ([docs](https://docs.realms.today/developer-resources/api)).

## Known gaps / follow-up

- Gated Realms API (`/api/v1/user/:walletPk`) not wired — optional when API key available
- On-chain vote signing in Pulse not implemented; users vote on Realms after wallet connect
- Optional: Backpack/Coinbase wallet adapters; `@realms-today/spl-governance` on-chain voter reads

## Out of scope

- No changes to `WEBSITE/website` (mycosoft.com)
