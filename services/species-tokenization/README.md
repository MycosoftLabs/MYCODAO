# MycoDAO species tokenization and rewards

This service connects licensed MINDEX fungal species to funded Solana creation jobs and reviewed contributor rewards. **The default is a capped species reward token with treasury inventory**, as Morgan selected on October 15, 2026. Direct Pump.fun creation is an optional, separate route. Existing FungiP mints are adopted after verification; the service does not replace them just because evidence is incomplete.

This checkout contains an implemented local integration, not an activated mainnet deployment. No wallet, funding, data license, scientific finding, existing mint or revenue is fabricated. Nine project sources were unavailable in the synced project mirror; the local mirror is not a complete company record.

## Implemented flow

1. Record an actual data-license grant with `display`, `token_metadata` and `reward` rights, validity dates, taxon scope and agreement reference. MINDEX remains the canonical data source; recording a grant is not executing a legal agreement.
2. Stage and validate the paginated MINDEX fungal-species catalog, retaining canonical UUIDs, source crosswalks and revision/provenance. Publish the scan atomically only after completion. Failures preserve the checkpoint, never publish an incomplete corpus, and never become a false empty success. Missing or excluded previously imported taxa receive creation holds.
3. Reconcile the existing FungiP pilot, verify actual mint and initialization receipts, and quarantine unresolved/retired mappings. Mainnet scheduling requires an explicit legacy-reconciliation record. The offline pilot exporter produces both an import manifest and creation holds.
4. Verify a finalized SOL transfer into the dedicated execution/distribution wallet. An administrator or authorized governance integration allocates only previously unallocated receipt funds. Signature replay, allocation replay and double reservation are rejected.
5. The worker builds content-addressed metadata from eligible licensed records, verifies its publicly served bytes, and automatically reserves and creates eligible species tokens within the allocation's count, concurrency and lamport caps. No per-species wallet click is required when the external signer is configured.
6. The default Token-2022 transaction issues the complete capped supply to the distribution wallet, stores the URI and JSON digest, removes metadata update authority and mint authority, and starts with no freeze authority. Pump create-only transactions do not purchase inventory or award tokens to MycoDAO.
7. Members sign into MycoDAO, prove wallet ownership with an expiring Ed25519 nonce, and submit evidence. A separately authorized reviewer confirms ownership/identification and classifies a finding. A missing catalog entry never proves a new species. Existing findings award species tokens; rare/new findings award configured MYCO and, when available, the canonical species token.
8. Rewards reserve real inventory and fee budget, then transfer checked integer amounts into the verified wallet's appropriate token account. Unsupported extensions, insufficient inventory and missing eligibility remain explicit.

The public Next page is `/species-tokens`. It provides catalog/search, attribution, verified registry details, nullable cached market observations, contribution submission and reward history. Its seven fixed API routes perform server-side account verification and never expose creation, allocation, reviewer or signer credentials.

## Run locally

Use Node **24.15 or later**. From this directory:

```powershell
npm ci --no-audit --no-fund
npm run typecheck
npm test
npm run demo
```

The demo uses an in-memory SQLite database, generated disposable message-signing keys, and an explicitly labeled chain fixture. It sends no network request and creates no real token. It exercises the full application lifecycle, not an actual Solana network.

For a configured service, copy `.env.example` to `.env`, fill its server settings, and start separate terminals:

```powershell
npm start
npm run worker
```

These commands load this directory's `.env`. Server and worker must use the same absolute local database path, cluster and distribution signer. Default binding is localhost. A single sync worker is the supported deployment; SQLite WAL and unique lease tokens protect API/worker transactions. Keep the database on durable local storage, never a shared network filesystem. This is a single-host architecture, not a horizontally distributed PostgreSQL deployment. Docker/Compose definitions are supplied but were not built because Docker's daemon was unavailable in this session.

In the MycoDAO Next server, configure:

```text
SPECIES_TOKEN_SERVICE_URL=http://127.0.0.1:8095
SPECIES_TOKEN_PROXY_KEY=<same server-only proxy secret>
NEXT_PUBLIC_SUPABASE_URL=<existing account project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<existing public account key>
```

Use the existing supported Next build/deploy flow. The account provider must allow the `/species-tokens` email sign-in redirect. The browser uses Phantom's `signMessage` only after a member clicks; it does not sign token-creation or transfer transactions.

## Operations and governance integration

`npm run ops -- <action> <file.json>` reads the corresponding admin/reviewer key from `.env`, posts a strict JSON body, and prints the result. Supported actions: `license`, `species`, `funding`, `allocate`, `policy`, `metadata`, `sync`, `import`, `hold`, `reconciliation`, `pause`, `recheck`, and `review`. `jobs` and `ledger` are read-only actions. Examples are field references, not executed approvals:

- `license`: a `LicenseGrant` from `src/contracts.ts`, backed by a real agreement.
- `species`: array of reviewed `Species` records, or use `sync` with configured MINDEX credentials and grant ID. The worker also runs complete staged scans every six hours by default.
- `funding`: `{ "signature": "<real finalized SOL transfer>", "from": "<actual source wallet>" }`.
- `allocate`: `{ "id": "<new UUID>", "fundingSignature": "<verified signature>", "budgetLamports": "<integer>", "jobMaxLamports": "<integer>", "purpose": "creation", "route": "spl_reward", "supply": "<capped base units>", "decimals": 6, "maxTokens": 20, "batchSize": 20 }`.
- `policy`: explicit versioned MYCO mint and base-unit award amounts, with a daily per-member cap. No MYCO mint or economic amount is guessed. `existingSpeciesUnits` is in each asset's base units; choose and review values against adopted mint decimals.
- `review`: finding UUID, approved/rejected decision, existing/rare/new classification, reviewer ID, independent evidence/notes and a `purpose: rewards` allocation UUID.
- `pause`: `{ "paused": true }` stops new preparation/broadcast; submitted receipts continue to reconcile. `recheck` preserves signed bytes and never replaces an ambiguous payout.

An authorized governance process can call the same private funding/allocation endpoints after its approval and finalized funding event. A wallet balance or arbitrary webhook is not sufficient allocation evidence. Each funding receipt can back multiple allocations only up to its verified amount. A larger `maxTokens` lets the worker continue automatically as eligible jobs finalize; at most `batchSize` creation jobs are outstanding per allocation, capped at 20. Lamport reservations, not catalog length, determine how far an allocation can execute. Default maximum is 20 species. Actual cost is derived from the constructed transaction, simulation and finalized payer debit; historical dollar estimates are not configuration.

Keep admin, reviewer and proxy secrets distinct. Never place admin/reviewer keys behind the broad Website MINDEX proxy. The HTTP API accepts proxy-authenticated user identities only from the dedicated MycoDAO BFF. Observation uniqueness, evidence-digest uniqueness, nonce consumption, policy snapshots, license snapshots, integer arithmetic, inventory reservations, unique species mints and transactional job reservations are durable.

## Execution boundaries and evidence

Prepared, signed bytes, signature and lifetime are persisted **before** broadcast. After a crash or timeout the worker reconciles and rebroadcasts those same bytes. Finality requires the actual RPC receipt to match the saved transaction message. Terminal success/failure accounts actual SOL cost, including failed transaction fees. Unknown transfer history never authorizes a replacement payout. This does not claim on-chain exactly-once guarantees after arbitrary archival loss; no per-observation PDA program is deployed.

Mainnet is off by default, requires the actual genesis, a separately deployed HTTPS policy signer, explicit enablement, funding, verified pilot reconciliation and eligible licensed data. A generic signing URL is not a deployed policy signer or HSM. Its operator must independently enforce exact instructions, source/destination, token/amount, caps, approved programs, no extra transfers, durable job/daily limits, and no broadcast. See [Solana adapter](docs/SOLANA.md).

Production activation still requires:

- An executed MINDEX → MycoDAO data agreement and evidence of image/content rights.
- Actual captured FungiP pilot index and chain facts, with unresolved entries held rather than recreated.
- The approved MYCO mint, a signer-controlled distribution wallet, and actual species/MYCO inventory.
- External policy signer deployment, funded SOL receipts and explicit bounded allocations.
- MINDEX runtime credentials, HTTPS metadata routing, Supabase redirect configuration, staging deployment and real wallet/devnet acceptance before separate mainnet activation.

The local tests establish SQLite, HTTP/auth, metadata, import, wallet-message, transaction-construction, signer-response and retry behavior. They do not establish live licensing, scientific novelty, native MINDEX registration, deployed authentication, live inventory, RPC/network execution, production readiness, token value or revenue. The Next page was compiled in an isolated clean verification application; the full existing MycoDAO production application was not rebuilt. Browser visual checks were blocked by the browser client. See `docs/SPECIES-TOKENIZATION-DELIVERY.md` in the repository for the final evidence record.

## Additional integration notes

- [MINDEX identity, import and licensing](docs/MINDEX-INTEGRATION.md)
- [Genuine FungiP pilot importer](docs/FUNGIP-PILOT-IMPORT.md)
- [Solana, signer and execution semantics](docs/SOLANA.md)
- [Read-only market data](docs/MARKET-DATA.md)

Pump fee collection, treasury sweeps, exchanges, tax reporting, UsePaid claims and automatic token purchases are not implemented financial actions in this service. Scientific rewards use funded existing inventory. Neither fungible token model grants ownership of a species, DNA or IP; actual intellectual-property licensing would require its own separate agreement and implementation.
