# Course: FungIP and tokenization

+++
id: fungip-how-it-works
title: How FungIP works
level: beginner
minutes: 7
track: bio-ip
summary: FungIP is the layer that turns records, cultures, services and inventions into clearly defined offerings with a named rights holder.
tags: fungip, ip, records, licensing
+++
## The problem FungIP solves

A fungal discovery can lead to five very different things, and each needs different rules:

| Offering | Example | Who controls it |
|---|---|---|
| **Record** | A species reference record with photos and sequence | Per the source data licence |
| **Material** | A living culture held in the biobank | The biobank, as custodian |
| **Service** | Sequencing or compound screening of a culture | The named service provider |
| **Invention** | A new extraction process or a material formulation | The inventor or assignee, by patent or trade secret |
| **Contract** | A licence or supply agreement | The parties to the agreement |

FungIP records which of these an offering is, who the rights holder is, the permission basis, what can be disclosed, and who to contact.

## The flow

1. A discovery is recorded and, if possible, cultured.
2. The record and culture get provenance: collector, location precision, permits, date.
3. Research adds value: sequences, compound screens, material tests.
4. Anything commercial is offered only under a written agreement naming the rights holder and terms.
5. Revenue from agreements flows back through the treasury to fund discovery (planned).

## Current stage

Reference records are available today. Material requests, services and licensed inventions are planned and will open once transfer terms and agreements are written.

+++
id: fungip-who-owns-what
title: Who owns what: species, DNA, cultures and inventions
level: intermediate
minutes: 8
track: bio-ip
summary: The legal basics: no one owns a wild species, naturally occurring DNA is not patentable in the US, but cultures, data and inventions can be controlled.
tags: law, patents, trade secrets, nagoya, ip
resources: USPTO MPEP 2106 (patent eligibility) | https://www.uspto.gov/web/offices/pac/mpep/s2106.html; WIPO trade secrets | https://www.wipo.int/en/web/trade-secrets
+++
## What cannot be owned

- **A wild species.** No one owns *Pleurotus ostreatus*, wherever it grows.
- **Naturally occurring DNA.** In the United States, isolating a natural DNA sequence does not make it patent-eligible (*AMP v. Myriad Genetics*, 2013).

## What can be controlled

- **A physical culture.** Whoever legitimately holds it can set transfer conditions, usually through a material transfer agreement.
- **Data and know-how.** Datasets can be licensed; confidential processes can be protected as trade secrets, but only while they are actually kept secret.
- **Inventions.** A new, useful, non-obvious human-made process, formulation or engineered strain may be patentable. That requires its own eligibility analysis.
- **Contracts.** Supply, licensing and research agreements define who pays whom, and for what.

## Benefit sharing

Under the Nagoya Protocol, genetic resources from another country often come with an obligation to share benefits with the country of origin. FungIP stores the permission basis next to each offering so this is never lost.

## What this means for tokens

A species token or an on-chain timestamp is a **record**. It does not grant ownership of the species, its DNA or its uses. Rights come from agreements, not from holding a token.

+++
id: fungip-species-tokens
title: Species tokens and rewards on Solana
level: intermediate
minutes: 7
track: bio-ip
summary: How one token per MINDEX taxon works, when a token is minted, and how observation rewards are reviewed and paid.
tags: species tokens, solana, rewards, tokenization
+++
## One taxon, one token

Each MINDEX taxon can have one species token on Solana. The first approved observation of a known, not-yet-tokenized species triggers its creation. The first observer receives that species' first-observer allocation once the mint is finalized.

## The reward path

1. **Submit.** A signed-in contributor with a verified Solana wallet files an observation: MINDEX taxon id, evidence URL, the evidence file's SHA-256 fingerprint, and their determination (substrate, habit, locality precision, confidence).
2. **Review.** A reviewer checks the evidence against the taxon.
3. **Settle.**
   - Known, already-tokenized species: that species' token is paid.
   - Known species without a token: the token is created, then the first observer is paid.
   - Eligible new or rare records: MYCO under the funded policy.
4. **Track.** Rewards show as queued, submitted or confirmed with a transaction signature.

## Linking a wallet safely

The app asks Phantom to sign a plain-text message that includes your account, wallet, network and a one-time nonce. It authorizes no transaction and never asks for a seed phrase.

## Current stage

Species rewards run on **Solana devnet**. Test tokens have no mainnet value. Mainnet requires separate approval and funded reward inventory.
