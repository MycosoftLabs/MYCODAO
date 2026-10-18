import { ContributeHeroButton } from "@/components/species-tokens/ContributeHeroButton";
import SpeciesTokenLibrary from "@/components/species-tokens/SpeciesTokenLibrary";
import styles from "@/components/species-tokens/species-tokens.module.css";
import { getPublicSupabaseConfig } from "@/lib/server/supabase-public";
import { ActionLink, Definition, SectionHeading } from "@/components/v2/primitives";
import { humanize } from "@/components/v2/labels";
import { getServerClient, load } from "@/components/v2/server-api";
import { V2Footer } from "@/components/v2/V2Footer";

export const dynamic = "force-dynamic";

export default async function RewardsPage() {
  const status = await load(() => getServerClient().rewards.status());
  const { supabaseUrl, supabaseAnonKey } = getPublicSupabaseConfig();
  const isTestNetwork = status.ok && status.data.cluster !== "mainnet-beta";

  return (
    <>
      <SectionHeading
        eyebrow="Species rewards"
        title="Species rewards"
        description="Submit an observation against a MINDEX taxon. Approved observations can earn that species' reward token; eligible new or rare records can earn MYCO under the funded policy."
      />

      <section aria-label="Rewards service status" className="mb-6 border border-white/10 bg-[#0c0c0c] p-4">
        {status.ok ? (
          <>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Definition label="Service">{humanize(status.data.state)}</Definition>
              <Definition label="Network">{status.data.cluster}</Definition>
              <Definition label="Execution mode">{humanize(status.data.executionMode)}</Definition>
              <Definition label="Jobs">
                {status.data.pendingJobs} pending · {status.data.finalizedJobs} finalized · {status.data.blockedJobs} blocked
              </Definition>
            </dl>
            {isTestNetwork ? (
              <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-amber-300">Test network · tokens have no mainnet value</p>
            ) : null}
            {status.data.paused ? <p className="mt-2 text-sm text-[#ff6a5f]">Reward execution is paused.</p> : null}
          </>
        ) : (
          <p className="text-sm text-white/60">Rewards service status unavailable: {status.message}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <ContributeHeroButton />
          <ActionLink href="/species-tokens">Open the full rewards page</ActionLink>
        </div>
        <p className="mt-3 text-xs text-white/45">
          Rewards depend on verification, an eligible policy and allocated funds. A submitted observation does not guarantee a reward.
          Holding a species token does not establish ownership of a species, biological material, a patent or underlying data rights.
        </p>
      </section>

      <div className={`${styles.page} -mx-4 md:-mx-8`}>
        <div className={styles.container}>
          <SpeciesTokenLibrary supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey} />
        </div>
      </div>

      <V2Footer route="/v2/rewards" sources={[]} />
    </>
  );
}
