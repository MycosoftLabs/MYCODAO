# Continue the genuine FungiP pilot

Further read-only discovery found the existing FungiP work in `D:/Users/admin2/Desktop/MYCOSOFT/CODE/_wt/mindex-envelope-oct03`, inspected at revision `78f9f960a64350fb4147e13343383b13c37f86a6`. This corrects the earlier bounded search of the canonical MINDEX checkout: the pilot implementation exists in a separate worktree.

The retained source modules are:

- `mindex_api/routers/taxon.py`, `mindex_api/contracts/v1/ancestry_index.py`: `GET /api/mindex/taxa/collections/fungip?limit=300&offset=0` exposes FungiP permanent IDs, canonical UUID linkage and `first40_launch` associations.
- `mindex_api/routers/fungip.py`: collection/detail reads; `/fungip/species` is a smaller list and does not carry the complete strict export contract.
- `migrations/fungip_001_catalog.sql`: `fungip.species`, explicit canonical linkage and token-attempt state machine.
- `migrations/fungip_002_first40_launches.sql`, `mindex_etl/fungip/first40.py`, `first40_detail.py`, `first40_importer.py`: immutable source-bound launch associations, original observations and superseded-mint exclusion.

The source code deliberately labels First40 associations `verification_basis=user_supplied_and_attached_verification` and `new_chain_verified=false`. Source-reported launches and new finalized chain receipts are distinct evidence. This discovery does not establish that this particular source revision is deployed or that its database tables are populated on the currently serving origin.

## Known corrections to retain

- FG026 has a corrected source mint but missing launch transaction and token program. Do not inherit them from its invalid historical mint or another species. Hold this record until explicit curation supplies matching evidence.
- FG033 is *Ganoderma lucidum*. FG034 is *Ganoderma sichuanense*, with *Ganoderma lingzhi* as a recorded synonym and an open concept-review flag. Preserve the concepts independently; do not mint a third synonym token.
- Superseded mint lists are exclusions, not alternative canonical mints.
- Recipient handle `@nodefather` is not a public wallet or proof of custody. An actual public key must come from verified chain/export evidence.

## Offline exporter

`scripts/export-fungip.ts` consumes an authenticated, retained response from the exact FungiP index endpoint and a separately retained mint-facts export. It performs no network calls, blockchain writes, signing or adoption.

Capture the full index using the authorized MINDEX operator path. Keep the credential out of saved JSON, URLs, browser code and logs. The current collection fits a 300-row response; the exporter rejects a partial response, missing FG001–FG040, a missing launch registry, duplicated permanent IDs, source batch mismatches, canonical/superseded collisions, or supplied facts outside the canonical pilot mint set.

The mint-facts JSON has this shape; every value must be observed, not filled from this explanation:

```text
schemaVersion: 1
cluster: mainnet-beta
observedAt: actual ISO timestamp
evidenceUri: retained HTTPS/IPFS evidence URI
entries: [{
  mint, creatorWallet, launchSignature, decimals, program, supply,
  mintAuthority, freezeAuthority, extensions
}]
```

`mintAuthority` and `freezeAuthority` require actual public keys or explicit observed `null`. Supply is an atomic u64 string. The source pilot uses Token-2022 and six decimals; source/facts mismatches remain held. The service independently verifies actual mint state and launch transaction before adopting any exported candidate. A facts file supplied to an offline exporter is not itself chain confirmation.

Run from this package directory after obtaining the genuine inputs:

```powershell
npm exec -- tsx scripts/export-fungip.ts --index=C:/retained/actual-fungip-index.json --mint-facts=C:/retained/actual-mint-facts.json --output=C:/retained/fungip-service-export.json --provenance=https://retained-evidence.example/fungip-export
```

The output file is created exclusively and is never overwritten. It contains `manifest`, a review `report`, and raw input file hashes. The manifest follows the service's strict `parseLegacyManifest` contract. If no complete candidate exists, `manifest` is `null`; there is no fabricated empty success. Reported hashes also retain source batch bindings, per-record provenance and superseded mint exclusions.

Use only the `manifest` object as the legacy-adoption input. Review `report.held` and quarantine every known existing mint whose UUID or launch evidence remains unresolved. `report.creationHolds` supplies deterministic UUIDs and the exact `POST /v1/admin/holds` bodies: taxon UUID (when known), accepted name and source synonyms, reason, evidence URI and active state. Import each hold through the authenticated admin endpoint before acknowledging `/v1/admin/legacy-reconciliation`. Mainnet scheduling remains globally gated until that reconciliation acknowledgement. The report itself does not apply holds or acknowledge reconciliation.

A partial legacy import must not enable unrestricted creation for the omitted pilot species. Keep automation disabled for affected concepts until their binding is resolved or the service-side holds block creation. Then use authenticated service adoption, which independently checks chain evidence, rather than writing SQLite rows directly.

The test exporter uses explicitly synthetic 40-record inputs; its 39-candidate case demonstrates FG026 withholding and does not claim 39 actual live mints. No actual pilot mint addresses or canonical UUIDs were invented or written into this package.

## Retained captured inputs

The source handoff explicitly excludes captured datasets and custody artifacts from its publication branch. `FUNGIP_FIRST40_SNAPSHOT` and `FUNGIP_CAPTURED_AUDIT` were unset in this session. Its captured projection tests pin an accepted snapshot raw-byte hash of `e8d3cc8220ac0b2081d75076c9e4fca41feb79dd2711c842a460e4def89b937b`; the catalog audit uses LF-normalized hash `8b197c9a539b8b3ccf59d412a3ea608bfa10dcdee04cb3adc8dce6353e86eed6`. These are source references, not newly verified file contents. Obtain the retained inputs through the existing operator/coordination custody path; do not substitute generated data for them.
