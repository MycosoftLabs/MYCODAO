# MYCO app API contract (Oct 17, 2026)

**Status:** Local. Same contract serves Blocks v2, site v2 and the future iOS/Android MYCO app.

- **Base URL:** `https://blocks.mycodao.com/api/mycodao/v1` (local: `http://127.0.0.1:3020/api/mycodao/v1`)
- **Spec:** `GET /openapi.json`
- **Types + client:** `packages/mycodao-sdk` (`createMycodaoClient({ baseUrl, getAccessToken })`). Copy or publish this package into the Expo app.
- **Content source:** MINDEX schema `mycodao` (`/api/mindex/mycodao/v1`) via the gateway. If MINDEX is unreachable the gateway serves `content/mycodao-v1/*.json` and every list says `source: "local_mirror"`. Live items (research, MycoPOD, markets, catalog) say `live_adapter`.

## Endpoints

| Area | Endpoint | Auth |
|---|---|---|
| Health | `GET /health` | none |
| Pulse | `GET /pulse?feed=&pillar=&cursor=&limit=` | none |
| Markets | `GET /markets` | none |
| Projects | `GET /projects`, `GET /projects/{slug}` | none |
| Funding | `GET /funding-needs` | none |
| Community | `GET /organizations?type=&relationship=`, `GET /media?ownership=` | none |
| MYCO | `GET /myco` (spec, utilities by stage, market) | none |
| FungIP | `GET /fungip/offerings` | none |
| Tissue Catalog | `GET /catalog?record_type=&region=&q=&cursor=` | none |
| Species rewards | `GET /rewards/status` | none |
| | `GET /rewards/me`, `GET /rewards/history` | Supabase bearer |
| | `POST /rewards/wallet/challenge` `{ wallet }` | Supabase bearer |
| | `POST /rewards/wallet/verify` `{ wallet, nonce, signatureBase64 }` | Supabase bearer |
| | `POST /rewards/discoveries` `{ taxonId, source:"mindex", sourceRecordId, evidenceUri, evidenceSha256, determination? }` | Supabase bearer |

All lists: `{ items, next_cursor, count, source, generated_at }`. Errors: `{ error, reason }` with 401/404/503.

## Mobile wallet link

1. App signs in with Supabase and stores the session in secure storage.
2. `POST /rewards/wallet/challenge` returns `{ nonce, message, expiresAt }` (5 minutes).
3. Sign `message` with Phantom (iOS/Android deep link `signMessage`) or Solana Mobile Wallet Adapter (Android).
4. `POST /rewards/wallet/verify` with the base64 signature. No seed phrase is ever requested.

## Rules for the app

- Browsing works without sign-in or a wallet.
- Show `stage` / `state` chips as given; never relabel `planned` or `unverified` as available.
- MYCO spec `approved_at = null` means rights and terms are not published.
- Rewards run on Solana devnet until mainnet is separately approved.
