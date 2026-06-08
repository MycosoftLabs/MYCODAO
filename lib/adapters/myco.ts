/**
 * MYCO snapshot: optional MYCO_SNAPSHOT_URL JSON, DexScreener (when MYCO_SOLANA_MINT is set),
 * then enrichment (canonical JSON, treasury, pools, RPC). Mock MYCO data is never used.
 */

import type { MycoSnapshot } from "@/lib/types";
import { enrichMycoSnapshot } from "@/lib/adapters/myco-enrichment";
import {
  MYCO_CANONICAL_SOLANA_MINT,
  fetchLiveMycoQuote,
  mycoExternalLinks,
} from "@/lib/adapters/myco-price-sources";

/**
 * Ensure biobank/governance objects exist for UI shape only.
 * Does not invent metrics from researchFunding (no synthetic DAO/biobank numbers).
 */
function ensurePhase3Fields(snapshot: MycoSnapshot): MycoSnapshot {
  const biobank: MycoSnapshot["biobank"] =
    snapshot.biobank ?? {
      samplesIndexed: 0,
      labsParticipating: 0,
      dataContributions: 0,
    };
  const governance: MycoSnapshot["governance"] =
    snapshot.governance ?? {
      activeProposals: 0,
      votingProgressPct: 0,
      grantApprovals: 0,
    };
  return { ...snapshot, biobank, governance };
}

function emptySnapshot(): MycoSnapshot {
  const now = new Date().toISOString();
  return {
    price: 0,
    changePct: 0,
    supply: 0,
    chain: "Solana",
    links: {
      tokenPage: process.env.NEXT_PUBLIC_MYCO_TOKEN_PAGE || "https://www.mycodao.com/token",
      governanceUrl: process.env.NEXT_PUBLIC_MYCO_GOV_URL,
      buyUrl: process.env.NEXT_PUBLIC_MYCO_BUY_URL,
    },
    updatedAt: now,
    researchFunding: {
      grantPoolMyco: 0,
      grantsDeployedMyco: 0,
      activeProposals: 0,
      votesToday: 0,
      biobankIncentivesMyco: 0,
      activeResearchProjects: 0,
      samplesIndexed: 0,
    },
    biobank: { samplesIndexed: 0, labsParticipating: 0, dataContributions: 0 },
    governance: { activeProposals: 0, votingProgressPct: 0, grantApprovals: 0 },
  };
}

export async function fetchMycoSnapshot(): Promise<MycoSnapshot> {
  const snapshotUrl = process.env.MYCO_SNAPSHOT_URL?.trim();
  if (snapshotUrl) {
    const res = await fetch(snapshotUrl, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
    if (!res.ok) {
      return ensurePhase3Fields(await enrichMycoSnapshot(emptySnapshot()));
    }
    const raw = (await res.json()) as MycoSnapshot;
    return ensurePhase3Fields(await enrichMycoSnapshot(raw));
  }

  const mint = MYCO_CANONICAL_SOLANA_MINT;
  try {
    const quote = await fetchLiveMycoQuote(mint);
    if (quote) {
      const now = new Date().toISOString();
      const base = emptySnapshot();
      const ext = mycoExternalLinks(mint);
      const links: MycoSnapshot["links"] = {
        ...base.links,
        tokenPage: process.env.NEXT_PUBLIC_MYCO_TOKEN_PAGE || base.links.tokenPage,
        governanceUrl: process.env.NEXT_PUBLIC_MYCO_GOV_URL ?? base.links.governanceUrl,
        buyUrl:
          process.env.NEXT_PUBLIC_MYCO_BUY_URL ?? ext.jupiter ?? base.links.buyUrl,
        dexscreenerUrl: quote.url ?? ext.dexscreener,
        solscanUrl: ext.solscan,
        jupiterUrl: ext.jupiter,
      };
      const merged: MycoSnapshot = {
        ...base,
        price: quote.priceUsd,
        changePct: quote.change24h,
        fdv: quote.fdvUsd,
        liquidityUsd: quote.liquidityUsd,
        updatedAt: now,
        links,
        dexPools: quote.pairAddress
          ? [
              {
                chainId: "solana",
                dexId: quote.dexId ?? "dexscreener",
                pairAddress: quote.pairAddress,
                baseToken: "MYCO",
                quoteToken: "SOL",
                liquidityUsd: quote.liquidityUsd,
                volumeH24: quote.volume24h,
                priceUsd: quote.priceUsd,
                priceChangeH24: quote.change24h,
                url: quote.url,
              },
            ]
          : base.dexPools,
      };
      return ensurePhase3Fields(await enrichMycoSnapshot(merged));
    }
  } catch {
    /* fall through */
  }

  return ensurePhase3Fields(await enrichMycoSnapshot(emptySnapshot()));
}
