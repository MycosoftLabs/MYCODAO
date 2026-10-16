# MycoDAO species tokenization delivery

Date: October 15, 2026, Pacific time. This is a local implementation and verification record, not a launch announcement.

## Delivered behavior

The isolated branch implements the MINDEX → MycoDAO licensed catalog, funded species-creation queue, Solana executor, verified wallet binding, evidence/reviewer workflow and species/MYCO reward distribution. Morgan selected capped species reward tokens as the default. Optional direct Pump creation and preservation of verified FungiP mints coexist with that choice.

The service is in `services/species-tokenization`. The new MycoDAO page is `/species-tokens`, linked from the existing token page, homepage and desktop/mobile Blocks navigation. The seven dedicated Next API routes expose only public catalog/status and authenticated member operations. The Node 24 service has an independent package/lockfile, container definition, API/worker entrypoints, operations command, CI workflow and detailed runbook. The root Next compiler excludes this independently built service and the local UI verification application; the existing root runtime does not import SQLite or signer code.

Fund allocation causes automatic metadata publication, bounded queue reservations and transaction preparation/execution for eligible canonical species. Larger approved targets continue across bounded batches. Real SOL receipts, rights, inventory and confirmed transaction evidence are required. Capped issuance and authority removal are constructed atomically. Existing species can receive their canonical species asset; reviewed rare/new findings can receive configured MYCO plus an available species asset. The service never infers scientific novelty from absence in a database.

## Verification completed

| Evidence | Result | Scope |
| --- | --- | --- |
| Service automated tests | 60 passed, zero failed/skipped | Actual SQLite, HTTP server/auth boundary, signed wallet messages, durable restart/reservations, staging/resume, caps/quarantine, metadata integrity, market parsing, and constructed Solana transactions using controlled RPC fixtures |
| Dedicated Next proxy tests | 8 passed | Session identity, spoofed headers, admin denial, body/query/response limits and unavailable upstream |
| Service TypeScript | Passed | Independent service source, scripts and tests |
| Existing MycoDAO TypeScript | Passed | Root project source with independent service excluded |
| New UI/proxy lint | Passed, no warnings | Added UI/API modules |
| Isolated Next 14.2.35 production build | Passed | Exact copied new species page and seven API routes, with minimal layout and clean local dependencies |
| Local page/API HTTP | 200 page; 503 unconfigured catalog; 404 hidden admin route | Actual local Next server, subsequently stopped |
| Full fixture walkthrough | Passed | Recorded license/funding fixture, capped species creation job, real disposable Ed25519 wallet message, reviewed rare finding, two reward assets and three finalized fixture jobs |
| Source whitespace checks | Passed | Owned changes |

The fixture walkthrough accounts 450 simulated lamports across three fixture jobs. Real funds spent: **zero**. Real tokens created: **zero**. Real wallet keys or credential files accessed: **none**. The production Solana adapter constructs and verifies genuine transaction messages with disposable test keys; all RPC evidence in its tests is controlled local input.

Docker's engine was unavailable, so the container was not built. The full MycoDAO production application and existing Vite application were not rebuilt in this session. The added Vite navigation anchors were syntax-checked; those links require the existing Vite build/deploy process. Browser visual/interactive checks were blocked by the browser client. No live Supabase session, Phantom interaction, scientific adjudication, data agreement execution, deployed signer, real Solana network transaction or production acceptance is established.

The copied page build was used because the existing dependency junction points to the active canonical checkout. Automatic approval review blocked junction removal; no alternate deletion or canonical dependency change was attempted. A separate clean verification directory preserved that active checkout. Its evidence is in `artifacts/species-ui-verification/README.md` locally, excluded from the delivery source commit.

## Existing pilot reconciliation

The canonical MINDEX checkout did not contain the newer FungiP implementation. Read-only discovery found it in the separate `_wt/mindex-envelope-oct03` worktree. The strongest import source is the canonical UUID-linked `/api/mindex/taxa/collections/fungip` response, combined with separately observed chain mint facts. Source associations remain distinct from newly chain-verified evidence. The captured pilot data files are not present in this environment; no actual 40-token registry was fabricated.

The delivered offline exporter validates FG001–FG040 completeness, canonical UUID linkage, source batches and observed chain facts. It excludes superseded mints and generates explicit creation holds for unresolved entries. Its controlled fixture covers 39 complete source bindings and an FG026 hold; this does **not** claim 39 real tokens were verified here. In the inspected pilot source, FG026's corrected mint lacks launch-transaction evidence. Mainnet creation remains gated on importing the genuine pilot evidence/holds and recording operator reconciliation.

## Activation inputs and remaining work

1. Execute and record the actual MINDEX data agreement with MycoDAO, including display, token metadata, reward use, image attribution, expiration and retention terms.
2. Export the genuine FungiP index and on-chain facts; import verified canonical mints and quarantine unresolved mappings before enabling new creation.
3. Configure the approved MYCO mint, dedicated signer-controlled distribution wallet, funded reward inventory, external HTTPS policy signer and its independent instruction/asset/spending limits.
4. Provide MINDEX credentials, publicly reachable HTTPS metadata routing and Supabase redirect/session configuration. Record finalized SOL funding and approve explicit creation/reward allocations.
5. Deploy to staging and prove an actual approved wallet flow and transaction lifecycle on the intended test network. Separately authorize and qualify mainnet activation. No deployment, spending or external communication was performed in this task.

Fee collection/sweeps, automatic token purchases, UsePaid claims, exchange conversion, tax reporting and legal approvals in the reference business plan are outside this implemented scientific reward service. Direct Pump creation supplies no distribution inventory. There is no representation that species tokens confer species/DNA/IP ownership, will have a market, or will earn revenue.

See [service runbook](../services/species-tokenization/README.md), [UI integration](SPECIES-TOKENS-UI.md), [pilot importer](../services/species-tokenization/docs/FUNGIP-PILOT-IMPORT.md) and [signer contract](../services/species-tokenization/docs/SOLANA.md).
