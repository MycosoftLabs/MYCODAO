# Solana execution adapter

`SolanaChainDriver` prepares real, signed, version-0 Solana transactions. Preparation simulates and signs but does not broadcast. The worker must durably save the complete `ChainPlan` before calling `broadcast`, and must rebroadcast the same saved bytes during reconciliation. The adapter never purchases a token, swaps assets, or spends funds during tests.

## Default species rewards

The `spl_reward` route creates a Token-2022 mint, stores the metadata URI and `metadata_sha256` on the mint, issues the complete configured capped supply into the distribution wallet's associated token account, removes the metadata update authority, and removes the mint authority in one atomic transaction. Freeze authority and metadata-pointer authority start as null. Consequently neither the service nor the original signer can expand that supply, freeze accounts, or edit the on-mint metadata after confirmation. Keep the metadata URI content immutable as well; the chain stores its content hash, not a copy of its JSON or images.

The distribution wallet must equal the configured signer's public key. It pays the small execution costs and owns reward inventory. A long-term treasury multisig is a different wallet and is not used as a pretend automatic transfer signer. This adapter supports one direct signer; it does not implement multisig transaction execution, automated replenishment, or a treasury sweep.

`TransferChecked` transfers existing inventory using the mint's actual SPL Token or Token-2022 program. An idempotent instruction creates the recipient ATA if necessary. Source ownership, decimals, balance, frozen state, and account extensions are checked before simulation. Recipient addresses must be ordinary wallet public keys; wallet ownership authentication remains the API's responsibility. Token-2022 support is deliberately restricted to metadata-pointer/token-metadata mint extensions and immutable-owner account extensions. Fee, hook, permanent-delegate, nontransferable, paused, confidential, interest-bearing, unknown, or other unsupported extensions block automatic payouts. This restriction avoids an incorrect promise about the amount delivered or whether a transfer is allowed.

## Optional Pump route

`pump_direct` uses the pinned official Pump SDK `createV2Instruction`, SOL pairing, regular creator fees, no mayhem mode, no holder-reward diversion, and **no buy instruction**. It accepts only Pump's expected 1 billion token supply and 6 decimals. Name/symbol/URI constraints are enforced before signing. Pump's program owns the issuance mechanics; this route does not place reward inventory in the distribution wallet or store this service's custom SHA-256 field on the mint. The metadata URI references the already-validated immutable artifact. Existing Pump/FungiP tokens may be adopted after mint/account and actual launch-initialization verification, including parsed inner instructions. Adoption does not transfer ownership, fees, or token inventory to MycoDAO.

Direct Pump creation costs depend on the deployed program's account layout. Its budget estimate uses the simulated payer debit plus a conservative additional transaction fee, so an interrupted or concurrently changing payer balance can require a fresh preparation. This is a planning bound, not an on-chain spending-limit program. The external signer must independently enforce its own policy. Pump creator fees now require per-curve/pool sweeps before collection under newer trade instructions. Fee collection and distribution are separate from scientific observation rewards and are not implemented by this adapter.

## Signers and environment

Use `signerFromEnvironment(cluster)` or inject a `TransactionSigner`:

- `TOKENIZATION_SIGNER_URL`: HTTPS signing endpoint; redirects are refused.
- `TOKENIZATION_SIGNER_PUBLIC_KEY`: dedicated distribution/fee-payer public key.
- `TOKENIZATION_SIGNER_AUTH_TOKEN`: optional bearer token sent only to that endpoint.
- `TOKENIZATION_SIGNER_ALLOWED_ORIGINS`: comma-separated exact HTTPS origins. Defaults to the configured endpoint's origin.
- `TOKENIZATION_LOCAL_KEYPAIR_PATH`: an explicit Solana 64-byte JSON keypair file, accepted only for devnet/localnet. Never pass a real treasury key. No key is read unless this option is configured.

Mainnet requires a remote signer and `allowMainnetBroadcast: true`. Otherwise creation and rewards fail before signing. The RPC genesis hash must match the selected cluster. Localnet additionally requires its explicit expected genesis hash; a cluster label or RPC URL alone is insufficient.

The signing service receives JSON `{version:1,messageSha256,transactionBase64,policy}`. `transactionBase64` contains the exact versioned message and any existing mint-account signature, with the fee-payer signature still empty. The policy contains job ID, operation, expected cluster/genesis, fee payer, allowed programs, maximum and estimated lamports, and relevant mint/recipient/amount. The service must decode the full transaction, independently enforce program/instruction/asset/recipient/fee/rent/budget limits, sign only this message, and never broadcast it. It returns `{messageSha256,transactionBase64}`. The adapter rejects a changed message or invalid/missing signature from any required signer. A generic remote signing endpoint is not itself an implemented HSM or policy service; operators must supply and configure that separate service.

## Funding and reconciliation

Funding verification accepts a finalized, successful transaction containing a directly signed System Program transfer from the nominated source into the launch/distribution wallet. It rejects CPI receipts, arbitrary balance claims, unrelated destination accounts, failed receipts, source addresses that did not sign, and a transaction that does not retain the claimed net credit. This supports native SOL allocation only. Signature replay prevention and allocation reservations are durable database responsibilities.

RPC acceptance is not confirmation. Reconciliation requires finalized status plus a receipt whose signature and serialized message match the saved plan. Actual payer debit is returned for successful and failed finalized transactions, including fees on failure. Processed/confirmed failures remain pending until finality. The driver does not rewrite, replace, or sign a new transaction on timeout.

After the last-valid block height, a missing history entry does not prove an old payout never happened: an RPC can prune historical data. A creation can be marked expired only when its unique mint is still absent at finalized commitment. An expired transfer with no historical receipt stays `unknown` for operator reconciliation. This service does not deploy an on-chain per-observation receipt/PDA program, so it does not claim exactly-once payout after arbitrary loss of all historical evidence.

## Validation evidence

`test/solana.test.ts` constructs and cryptographically verifies real transaction messages with generated disposable test keys and mocked RPC responses. Tests inspect issuance/revocation/ATA/transfer instructions, exercise both token programs, verify funding/adoption and retry boundaries, and reject wrong-genesis, over-budget, failed-simulation, unsafe-extension, mutated-remote-message, missing-signature, and mainnet-disabled cases. These are local adapter tests. They do not establish successful devnet, mainnet, deployed signer, live inventory, funded treasury, or end-to-end external integration.

Official references: [Pump creation](https://github.com/pump-fun/pump-public-docs/blob/main/docs/instructions/COIN_CREATION.md), [Pump SDK versions](https://github.com/pump-fun/pump-public-docs), [Solana metadata](https://solana.com/docs/tokens/extensions/metadata), [Checked token transfers](https://solana.com/docs/tokens/basics/transfer-tokens), [Confirmation and expiration](https://solana.com/developers/cookbook/transactions/confirmation), [RPC send semantics](https://solana.com/docs/rpc/http/sendtransaction), [Pump fee sweeps](https://github.com/pump-fun/pump-public-docs/blob/main/docs/instructions/SWEEP_FEES.md).
