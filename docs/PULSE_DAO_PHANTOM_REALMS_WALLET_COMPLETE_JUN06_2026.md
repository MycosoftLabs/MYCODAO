# Pulse DAO — Phantom Connect + Realms Wallet Tool — Complete

**Date:** June 6, 2026  
**Status:** Complete  
**Related:** [REALMS_V2_DAO_HUB_COMPLETE_JUN05_2026.md](./REALMS_V2_DAO_HUB_COMPLETE_JUN05_2026.md), [Realms integrate](https://docs.realms.today/developer-resources/integrate-realms), [Phantom Connect](https://docs.phantom.com/phantom-connect)

## Scope

Make the Pulse **Organizations** tab a functional DAO tool with:

- **Phantom Connect** (Google, Apple, injected Phantom/Solflare) via `@phantom/react-sdk`
- **Wallet-adapter fallback** for extension wallets already in the Solana stack
- **Realms participation** for the connected wallet (deposits, open votes) via MYCODAO API
- **Phantom Portal** domain verification for `pulse.mycodao.com`

## Delivered

### Phantom Portal

| Item | Value |
|------|--------|
| App ID | `0b78c207-6c6c-4ab7-8350-8f02552f3298` |
| DNS TXT | `_phantom_portal-challenge.pulse.mycodao.com` → `5986ef1eb81c398a63f6ae4eacac27c7590fc49a9a0ba519fb33d135f0b00bd3` |
| Redirect URL (code) | `https://pulse.mycodao.com` origin only (or `VITE_PHANTOM_REDIRECT_URL`) — OAuth callback preserved via `/` → `/pulse/` redirect |
| Allowed origins | localhost:3000/3004, pulse.mycodao.com, mycodao.com (per Portal config) |

DNS TXT verified via `nslookup` on LAN (June 6, 2026). Re-check in Phantom Portal after propagation if verification was attempted earlier.

### Packages (`myco-pulse`)

- `@phantom/react-sdk`
- `@realms-today/spl-governance` (installed; participation uses Realms V2 HTTP API today)

### New / updated files

| File | Purpose |
|------|---------|
| `myco-pulse/src/config/phantom.ts` | App ID, redirect resolver, Solana-only address types |
| `myco-pulse/src/components/PhantomConnectProvider.tsx` | `PhantomProvider` wrapper |
| `myco-pulse/src/hooks/useDaoWallet.ts` | Unified Phantom Connect + wallet-adapter session |
| `myco-pulse/src/components/DaoWalletConnect.tsx` | Connect / disconnect UI + status chip |
| `myco-pulse/src/components/RealmsDaoHub.tsx` | `DaoSessionBar`, `DaoWalletParticipationCard`, wallet-aware proposals |
| `myco-pulse/src/main.tsx` | Provider order: Phantom → Solana → App |
| `lib/adapters/realms.ts` | `fetchWalletDaoParticipation()` |
| `app/api/realms/daos/[pk]/wallet/[wallet]/route.ts` | Wallet participation API |

### Organizations UI (DAO tool)

- Header: **DaoWalletConnect** (replaces legacy `WalletMultiButton`)
- **DAO wallet session** bar: Realms SDK + Phantom Connect doc links, live participation summary
- **Active** sidebar: **Your participation** card (deposits, open votes, Realms deposit CTA)
- Proposals: **DaoWalletStatusChip** + vote links to Realms

## Verify

```powershell
# Wallet participation API
Invoke-RestMethod "http://localhost:3004/api/realms/daos/At93fiCMzEkZWBAHxSNjfk7zUHnF3JcxyCyPjZELjK9Y/wallet/<WALLET_PK>"

# Phantom DNS
nslookup -type=TXT _phantom_portal-challenge.pulse.mycodao.com

# Build Pulse
cd MYCODAO/myco-pulse
npm run build
```

UI: Pulse → **DAO** → Connect wallet → open MycoDAO → sidebar shows your deposits / open votes when wallet has Realms memberships.

## Env (optional)

```env
VITE_PHANTOM_APP_ID=0b78c207-6c6c-4ab7-8350-8f02552f3298
VITE_PHANTOM_REDIRECT_URL=https://pulse.mycodao.com
VITE_SOLANA_RPC_URL=
VITE_PULSE_API_ORIGIN=http://127.0.0.1:3004
```

## Known gaps

- On-chain vote **signing** still happens on Realms (Pulse deep-links; no mock votes)
- `@realms-today/spl-governance` on-chain reads not yet used — HTTP API sufficient for deposits list
- Gated Realms user API (`/api/v1/user/:wallet`) optional when API key available

## Out of scope

- No changes to `WEBSITE/website` (mycosoft.com)
