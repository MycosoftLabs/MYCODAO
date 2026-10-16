# MycoDAO species library and contribution UI

The `/species-tokens` page presents licensed MINDEX species records and their registered Solana tokens. It provides email sign in, Phantom wallet ownership verification, evidence submissions, observation review history, and reward distribution status. It contains no seeded species, assumed token launches, invented balances, or unconditional reward claims.

## Configuration

Set these in the **MycoDAO Next.js server** environment:

| Variable | Purpose |
| --- | --- |
| `SPECIES_TOKEN_SERVICE_URL` | Private species-token service base URL, normally `http://127.0.0.1:8095`. |
| `SPECIES_TOKEN_PROXY_KEY` | Shared server secret matching the service configuration. Never prefix with `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL for account sessions. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase anon key. Never supply a service-role key here. |

The existing `getPublicSupabaseConfig()` convention also supports the repository's `VITE_SUPABASE_*` and unprefixed public configuration fallbacks. Only the public URL and anon key reach the client. Add the deployed `/species-tokens` URL to the Supabase auth redirect allowlist so email sign-in links return to this page.

The service URL and proxy key are required even for the public catalog. Missing or unreachable service configuration returns HTTP 503 and `state: "unavailable"`; the UI distinguishes this from a successful catalog with zero records. A missing Supabase configuration disables sign in explicitly.

## Browser API boundary

Only these Next.js routes are exposed:

| Browser route, under `/api/species-tokens` | Method | Service route | Authentication |
| --- | --- | --- | --- |
| `/catalog?offset=0&limit=24&q=...` | GET | `/v1/catalog` | Public licensed records |
| `/status` | GET | `/v1/status` | Public connection/network/mode |
| `/me` | GET | `/v1/me` | Verified Supabase session |
| `/rewards` | GET | `/v1/rewards` | Verified Supabase session |
| `/wallet/challenge` | POST | `/v1/wallet/challenge` | Verified Supabase session |
| `/wallet/verify` | POST | `/v1/wallet/verify` | Verified Supabase session |
| `/discoveries` | POST | `/v1/discoveries` | Verified Supabase session |

There is no wildcard passthrough and no browser endpoint for allocations, minting, administrative reviews, reward policies, keys, or manual payouts. Every private request validates the bearer access token against Supabase `/auth/v1/user` and requires a UUID user identity. The proxy sets `x-user-id` from that response and its own `x-species-token-proxy-key`; caller-supplied identity headers never reach the service. The bearer token is not forwarded to the token service. JSON bodies accept only the documented wallet or evidence fields, are limited to 16 KB, and reject caller identity/admin fields. Upstream bodies are limited to 1 MB and responses are not cached.

The token service must remain private and must independently enforce its proxy-key boundary. The page is not an administrative control surface.

## Contribution flow

1. Sign in using the normal Supabase browser session and an email magic link.
2. Click **Connect & verify with Phantom**. Phantom connection and `signMessage` happen only after this explicit user action. The server issues an expiring, one-use nonce bound to the account/wallet; the signed message is verified by the service. This flow signs no Solana transaction.
3. Select a species card, or supply a MINDEX taxon UUID. Submit `source` (`inaturalist`, `fundis`, `mindex`, or `specimen`), `sourceRecordId`, a stable HTTPS/IPFS `evidenceUri`, and its 64-character lowercase `evidenceSha256`. A verified wallet is required before this form is enabled.
4. Track `pending`, `approved`, or `rejected` observations. Eligibility and scientific assessment are performed by the service and qualified reviewers, not by the browser.
5. Track reward jobs as `queued`, `preparing`, `prepared`, `submitted`, `finalized`, `blocked`, or `failed`. A queued/submitted job is not displayed as a confirmed transfer. A finalized reward can include a network-specific transaction explorer link.

The UI lists verified wallets; new observations record the most recently verified wallet as their reward destination. It does not expose a browser claim/mint button. All token amounts use string base-unit formatting rather than floating-point conversion. The network is shown with the service's execution mode, with a test-network label or disabled-mainnet notice where applicable. Token image attribution and license are displayed when an image is provided. Missing images have an explicit neutral fallback.

## Public claim boundaries

- A species record is distinct from a registered token. The page labels untokenized records accordingly.
- The default model is a species reward token. Registered `pump_direct` and `legacy_fungip` tokens receive separate route labels.
- Existing-species rewards and new/rare MYCO rewards depend on funded policy and verified evidence; submission does not guarantee a reward.
- A new MINDEX record is not proof of a species new to science.
- Species tokens grant no ownership of the species, DNA, research, intellectual property, or underlying data.
- The catalog supplies the license ID and scientific/media information; the page does not infer legal rights from token ownership.
- An optional market snapshot shows nullable USD price, market capitalization, and 24-hour volume from the service's cached DexScreener result, together with its timestamp. Missing values remain **Unavailable**; an empty market result says **No indexed market data**. A snapshot must match both the registered mint and displayed network. Prices are observations, not reward valuations or forecasts. Mainnet `pump_direct` and verified legacy token records can link to their registered mint on Pump.fun.

## Verification

Run from the MycoDAO project root:

```text
node --test components/species-tokens/proxy.test.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/next/dist/bin/next lint --file app/species-tokens/page.tsx --file components/species-tokens/SpeciesTokenLibrary.tsx --file components/species-tokens/ContributionPanel.tsx --file components/species-tokens/types.ts --file lib/server/species-token-proxy.ts
```

The proxy tests exercise identity verification and caller-header spoofing, absent configuration, administrative endpoint denial, query/body/response bounds, invalid auth identity, valid evidence forwarding, and unavailable upstream handling. They use controlled HTTP responses and do not prove a live Supabase session, Phantom signature, production deployment, actual MINDEX licensing, or any Solana broadcast. Those require configured integration checks with the intended account/wallet/network.

The page uses responsive CSS, semantic forms/labels, explicit loading/error/empty states, visible keyboard focus, reduced-motion support, optional reference-image fallbacks, and network-specific explorer links.

### Local implementation evidence (October 15, 2026)

- All eight proxy tests passed; the added UI and API files passed targeted Next lint with no warnings; the repository TypeScript check passed.
- A clean dependency harness in `artifacts/species-ui-verification` copied these authored UI/API modules and the existing public Supabase configuration helper into a minimal Next 14.2.35 app. Its production build passed, including all seven API routes and `/species-tokens`. This is an isolated page/API build, not a full-repository production build.
- Real local HTTP checks against that harness returned `/species-tokens` HTTP 200 with the library heading and scientific disclaimer, catalog HTTP 503 with `service_unconfigured` and private/no-store response headers, and the deliberately unexposed `/api/species-tokens/admin/mint` HTTP 404.
- Browser access to the local URL was blocked by the available browser client (`net::ERR_BLOCKED_BY_CLIENT`). Screenshot, interactive sign-in, Phantom, responsive visual checks, and live external integration were therefore not verified. Responsive/accessibility support above describes the implemented code, not a completed browser audit.
- No deployment or Solana transaction was performed. The temporary verification server was stopped after the HTTP checks.
