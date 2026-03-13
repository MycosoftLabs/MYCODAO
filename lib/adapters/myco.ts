/**
 * MYCO snapshot adapter: placeholder for real MYCO price source.
 * Currently returns mock; replace with DEX/CEX or governance API when available.
 *
 * Phase 3: When API returns only researchFunding, we fill biobank and governance
 * from it so BiobankActivity and DaoGovernance modules have data (per conflict review).
 */

import type { MycoSnapshot } from "@/lib/types";
import { getMockMycoSnapshot } from "@/lib/mock-data";

function ensurePhase3Fields(snapshot: MycoSnapshot): MycoSnapshot {
  const rf = snapshot.researchFunding;
  if (!rf) return snapshot;
  return {
    ...snapshot,
    biobank:
      snapshot.biobank ??
      ({
        samplesIndexed: rf.samplesIndexed,
        labsParticipating: 0,
        dataContributions: Math.floor(rf.samplesIndexed * 0.05),
      } as MycoSnapshot["biobank"]),
    governance:
      snapshot.governance ??
      ({
        activeProposals: rf.activeProposals,
        votingProgressPct: Math.min(100, rf.votesToday > 0 ? 60 + Math.floor(rf.votesToday / 10) : 50),
        grantApprovals: Math.floor((rf.grantsDeployedMyco / (rf.grantPoolMyco || 1)) * 10),
      } as MycoSnapshot["governance"]),
  };
}

export async function fetchMycoSnapshot(): Promise<MycoSnapshot> {
  const snapshot = getMockMycoSnapshot();
  return ensurePhase3Fields(snapshot);
}
