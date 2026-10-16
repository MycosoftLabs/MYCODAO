# MINDEX integration contract

This service is an isolated integration package. It does not modify or deploy the active MINDEX or Mycosoft Website repositories. Its catalog adapter is `src/mindex.ts`; import `MindexClient`, `MindexImportError`, and `parseLegacyManifest` in server or worker code only.

## Existing source contract

Discovery used the local MINDEX checkout at `D:/Users/admin2/Desktop/MYCOSOFT/CODE/MINDEX/mindex`, revision `e56daa91eab4acbbe6ae08b7e8dfb10e0b553ad2` plus existing unrelated local changes. Relevant paths are:

- `mindex_api/routers/taxon.py`: `GET /api/mindex/taxa?kingdom=Fungi&rank=species&order_by=canonical_name&order=asc&limit=N&offset=N`.
- `mindex_api/schemas/taxon.py`, `mindex_api/schemas/common.py`: `{ data: Taxon[], pagination: { limit, offset, total } }`.
- `migrations/0001_init.sql`: `core.taxon.id` is the canonical UUID; `core.taxon_external_id` identifies external records by unique `(source, external_id)`; `core.taxon_synonym` preserves names.
- `migrations/20260502_all_life_universal.sql`: `kingdom`, lineage, and rolled-up `external_ids`.

The adapter uses the existing internal `/taxa` contract, not the Worldview envelope or a browser proxy. Public display requires the separately checked grant and service authorization. A token does not convey ownership of a species or of third-party source data.

## Configure and stage a catalog import

```ts
import { MindexClient } from './mindex.js';

const client = new MindexClient({
  baseUrl: process.env.MINDEX_BASE_URL!, // trusted origin or exact /api/mindex root
  internalToken: process.env.MINDEX_INTERNAL_TOKEN!,
  licenseId: configuredExistingGrantId,
  pageSize: 500,
  maxPages: 10_000,
});

for await (const page of client.pages({ checkpoint: persistedCheckpoint })) {
  // In one service-owned DB transaction: stage rows, exclusions, provenance,
  // and checkpoint. Publish only after page.checkpoint.complete is true.
  await stageCatalogPage(page);
}
```

`stageCatalogPage` is illustrative orchestration, not an exported adapter function. The service engine owns the real storage and authorization transaction.

Configure exactly one of `apiKey` (`X-API-Key`) or `internalToken` (`X-Internal-Token`). Do not pass a credential in the URL, to a client component, or through user-supplied request fields. The adapter checks the server runtime, disables redirects, uses fixed query fields, sets a request timeout, and does not log credentials or upstream response bodies. `baseUrl` accepts an operator-configured HTTP(S) origin, including a private MINDEX address, or its `/api/mindex` root. It rejects other paths, URL credentials, queries and fragments. The service environment must protect this trusted configuration.

`licenseId` must name a real grant provisioned and checked by the service. The adapter attaches that exact ID; it cannot grant rights, infer entitlement from source availability, or turn source attribution into commercial permission. The engine must independently validate grant status, licensor/licensee, rights, taxon scope, validity dates and evidence at import, display, metadata creation, and reward time. Importing unlicensed data or metadata does not enable launching a token.

## Identity, exclusions and readiness

Every source row must have a UUID, a scientific name, an actual creation/revision timestamp and well-shaped external IDs. Source URLs are derived from the fixed MINDEX root and UUID. Strings or safe integers in `external_ids` become normalized source/value mappings. At least one external identity is required for an accepted row.

Rows outside `Fungi`/`species`, rows without external identities, explicit synonyms/duplicates/merged taxa, invalid accepted-canonical links, and nonaccepted taxonomic statuses appear in `excluded`. An alias with an explicit accepted taxon UUID preserves that mapping in the exclusion; it never creates a second token. The accepted canonical row must be independently present, accepted, licensed and imported. Exclusions are intentional, auditable outcomes rather than successful token creation. Keep unresolved taxa in a review queue.

Duplicate UUIDs, duplicate normalized canonical names for different accepted UUIDs, or external crosswalk collisions abort the scan. The adapter retains identities in checkpoints so resumed imports detect collisions with previous pages. It does not resolve disputed taxonomy from names or automatically rewrite canonical IDs. Existing mints should remain bound to stable UUIDs; review taxonomy merges before changing aliases or registry mappings.

The adapter maps `metadata.metadata_uri`/`metadata.metadataUri` only when paired with a real 64-character `metadata_sha256`/`metadataSha256` digest and an HTTPS, IPFS or Arweave URI. It does not fabricate launch metadata. An image is copied only from an actual `metadata.default_photo` containing a safe URL, nonempty license and attribution. Missing or malformed optional metadata stays absent and cannot satisfy launch readiness. Attribution is preserved as source information, not verified ownership or sufficient licensing evidence. The engine must fetch and verify actual metadata content before launch.

## Checkpoints, availability and consistency

Each yielded page carries accepted records, exclusions, the observed endpoint and filters, UTC fetch time, content hash, previous-page hash, received count and a checkpoint. Checkpoints bind endpoint, license ID, page size, page cap and exact filters. Store them only in authenticated server storage; they are integrity/accounting records, not signed authorization tokens. They include previously observed identity maps, so storage grows with the inventory.

The checkpoint advances only after the entire page validates. Save the checkpoint and its staged records atomically. On failure, resume the last committed checkpoint; do not publish partial stages, allocate launch funds, or schedule token creation. Completed checkpoints are idempotent and issue no additional HTTP request. Changing configuration requires a fresh scan.

Network failure, timeout, bad JSON/schema, missing total, unexpected offsets, incomplete pages, changing totals, duplicate identities and scan-limit overflow raise errors. A known zero total with a valid empty page is an explicit complete empty catalog. An unavailable backend never becomes an empty catalog.

The current MINDEX endpoint provides **offset pagination without an immutable snapshot**. Even if the total is constant, concurrent insertions, deletions, or taxonomy renaming can change page membership. Identity checks detect many overlaps but cannot prove absence of omissions. `complete: true` means the declared pagination reconciled; it does not prove an immutable or scientifically complete global fungal inventory. For production backfill, use a frozen MINDEX snapshot/export or a stable import window and retain the exact export evidence. A future snapshot/cursor contract should provide immutable revision and canonical-identity reconciliation before unattended worldwide inventory assertions.

## Import the existing FungiP test safely

`parseLegacyManifest(input, expectedCluster)` accepts only schema version 1, nonempty export provenance, export timestamp, and nonempty entries. Each entry must supply:

| Field | Requirement |
| --- | --- |
| `taxonId` | Exact canonical MINDEX UUID, not a species name or external source key |
| `mint`, `creatorWallet` | Base58 public keys decoding to 32 bytes |
| `cluster` | `devnet`, `mainnet-beta` or `localnet`; must match configured chain |
| `route` | `legacy_fungip` |
| `launchSignature` | Actual base58 Solana transaction signature decoding to 64 bytes |
| `provenance` | Retained export/launch evidence reference |
| `decimals`, `supply` | Explicit decimals 0–18 and u64 atomic supply string |
| `program` | SPL Token or Token-2022 program ID |
| `mintAuthority`, `freezeAuthority` | Actual public keys or explicit `null` |
| `extensions` | Explicit observed extension list |
| `status` | `canonical` |

Unknown entry fields, repeated `(cluster, taxonId)` or `(cluster, mint)`, placeholders, malformed signatures and wrong clusters are rejected. Structural validation is not chain verification. The engine must inspect the actual mint, compare every recorded mint field, verify launch provenance and canonical taxon mapping, and import idempotently before scheduling new creation.

`examples/legacy-fungip-manifest.example.json` deliberately contains no entries and is rejected by the validator. Populate it from the authenticated existing export; no 40 mint addresses have been invented. The initial search found no verified 40-species manifest in the canonical MINDEX or Website checkout. Subsequent discovery located genuine source-bound First40 modules in the separate `_wt/mindex-envelope-oct03` worktree. See [FUNGIP-PILOT-IMPORT.md](FUNGIP-PILOT-IMPORT.md) and `scripts/export-fungip.ts` for the actual collection endpoint, canonical UUID mapping, FG026 hold and superseded-mint exclusions. Actual runtime export contents, mint authorities and finalized receipts remain independently verified operator inputs.

Do not import `solana:binding:*` or `solana:pending:*` identifiers from `mindex_api/ledger/anchor_service.py` as transaction signatures. That legacy path records a local binding to `MYCA_SOLANA_MINT`; it does not create a per-species SPL mint or demonstrate an on-chain transaction. `MYCO` reward mint configuration is separate.

## Deployment boundary

The Website catch-all at `D:/Users/admin2/Desktop/MYCOSOFT/CODE/WEBSITE/website/app/api/mindex/[[...path]]/route.ts` forwards mutations with shared server credentials. Do not expose funding, review, grant or signer operations behind that generic proxy. Use the service's explicit authenticated API and purpose-scoped credentials. Existing MINDEX `internal:all` identities alone do not isolate treasury/signing authority.

Current tests use the actual adapter with controlled HTTP responses, including multiple pages, resume, wrong-cluster legacy entries, failure and ambiguity cases. They establish local contract behavior. They do not establish live MINDEX reachability, complete taxonomy, third-party data rights, existing FungiP chain evidence, deployment, or live token issuance.
