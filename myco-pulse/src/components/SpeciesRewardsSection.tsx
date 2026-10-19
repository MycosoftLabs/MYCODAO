import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ExternalLink, Library, Loader2, RefreshCw, Send, Wallet } from "lucide-react";
import { cn } from "../lib/utils";
import {
  fetchSpeciesCatalogSummary,
  fetchSpeciesRewardsStatus,
  humanizeToken,
  isTestCluster,
  type SpeciesCatalogSummary,
  type SpeciesRewardsStatus,
} from "../lib/mycodaoScienceApi";

const HOW_REWARDS_WORK = [
  "Submit an observation of a species that already exists in the MINDEX catalog. If a reviewer approves it, you can earn that species' token.",
  "Eligible new or rare records can earn MYCO, but only under a funded reward policy.",
  "Rewards are not guaranteed. Every submission is reviewed, and a policy can be paused.",
];

export function SpeciesRewardsSection() {
  const [status, setStatus] = useState<SpeciesRewardsStatus | null>(null);
  const [catalog, setCatalog] = useState<SpeciesCatalogSummary | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [statusResult, catalogResult] = await Promise.allSettled([
      fetchSpeciesRewardsStatus(),
      fetchSpeciesCatalogSummary(),
    ]);
    if (statusResult.status === "fulfilled") {
      setStatus(statusResult.value);
      setStatusError(null);
    } else {
      setStatus(null);
      setStatusError(statusResult.reason instanceof Error ? statusResult.reason.message : "status unavailable");
    }
    if (catalogResult.status === "fulfilled") {
      setCatalog(catalogResult.value);
      setCatalogError(null);
    } else {
      setCatalog(null);
      setCatalogError(catalogResult.reason instanceof Error ? catalogResult.reason.message : "catalog unavailable");
    }
    setCheckedAt(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cluster = status?.cluster ?? catalog?.cluster;
  const isTest = isTestCluster(cluster);
  const isAvailable = status?.state === "available" && !status.paused;

  return (
    <section
      id="species-rewards"
      className="px-4 md:px-8 lg:px-12 py-8 border-b border-white/10"
      aria-labelledby="species-rewards-heading"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <Wallet className="size-4 text-myco-accent shrink-0" />
          <h2
            id="species-rewards-heading"
            className="text-[10px] font-black uppercase tracking-[0.2em] text-white"
          >
            Species rewards
          </h2>
          {loading ? <Loader2 className="size-3.5 animate-spin text-dim" /> : null}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="self-start sm:self-auto inline-flex items-center gap-2 min-h-[44px] px-3 border border-white/15 text-[9px] font-bold uppercase tracking-widest text-dim hover:text-white hover:border-white/30 touch-manipulation"
          aria-label="Refresh species rewards status"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} /> Refresh
        </button>
      </div>

      {isTest ? (
        <div className="mb-4 flex items-start gap-2 border border-amber-400/30 bg-amber-400/5 px-3 py-2">
          <AlertTriangle className="size-4 text-amber-300 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-100/90 font-medium">
            Test network · tokens have no mainnet value
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="rounded-sm border border-white/10 bg-black/40 px-3 py-2 min-h-[44px] flex flex-col justify-center">
          <span className="text-[8px] uppercase tracking-widest text-dim font-bold">Service</span>
          <span
            className={cn(
              "text-sm font-mono tabular-nums",
              isAvailable ? "text-myco-accent" : "text-amber-300",
            )}
          >
            {status ? (status.paused ? "paused" : humanizeToken(status.state)) : statusError ? "unavailable" : "—"}
          </span>
        </div>
        <div className="rounded-sm border border-white/10 bg-black/40 px-3 py-2 min-h-[44px] flex flex-col justify-center">
          <span className="text-[8px] uppercase tracking-widest text-dim font-bold">Network</span>
          <span className="text-sm font-mono text-myco-accent">
            {cluster ? `Solana ${cluster}` : "—"}
          </span>
        </div>
        <div className="rounded-sm border border-white/10 bg-black/40 px-3 py-2 min-h-[44px] flex flex-col justify-center">
          <span className="text-[8px] uppercase tracking-widest text-dim font-bold">Execution mode</span>
          <span className="text-sm font-mono text-myco-accent truncate">
            {humanizeToken(status?.executionMode)}
          </span>
        </div>
        <div className="rounded-sm border border-white/10 bg-black/40 px-3 py-2 min-h-[44px] flex flex-col justify-center">
          <span className="text-[8px] uppercase tracking-widest text-dim font-bold">Species in catalog</span>
          <span className={cn("text-sm font-mono tabular-nums", catalogError ? "text-amber-300" : "text-myco-accent")}>
            {catalog?.total != null ? catalog.total.toLocaleString() : catalogError ? "unavailable" : "—"}
          </span>
        </div>
      </div>

      {status && (status.pendingJobs != null || status.finalizedJobs != null) ? (
        <p className="mt-2 text-[10px] text-dim font-mono">
          Reward jobs: {status.pendingJobs ?? 0} pending · {status.finalizedJobs ?? 0} finalized
          {status.blockedJobs ? ` · ${status.blockedJobs} blocked` : ""}
        </p>
      ) : null}

      {statusError || catalogError ? (
        <p className="mt-2 text-[10px] text-amber-300/90">
          {statusError ? `Status: ${statusError}. ` : ""}
          {catalogError ? `Catalog: ${catalogError}.` : ""}
        </p>
      ) : null}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-white/10 bg-black/25 p-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-myco-accent mb-3">
            How rewards work
          </h3>
          <ol className="space-y-2 list-decimal list-inside">
            {HOW_REWARDS_WORK.map((line) => (
              <li key={line} className="text-[11px] text-white/75 leading-relaxed">
                {line}
              </li>
            ))}
          </ol>
          {catalog?.disclaimer ? (
            <p className="mt-3 text-[10px] text-dim leading-relaxed">{catalog.disclaimer}</p>
          ) : null}
        </div>

        <div className="border border-white/10 bg-black/25 p-4 flex flex-col gap-3 justify-center">
          <a
            href="/species-tokens#contribute"
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 bg-myco-accent text-black text-[10px] font-black uppercase tracking-widest touch-manipulation"
          >
            <Send className="size-3.5" /> Submit an observation
          </a>
          <a
            href="/species-tokens"
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 border border-white/20 text-white text-[10px] font-black uppercase tracking-widest hover:border-myco-accent touch-manipulation"
          >
            <Library className="size-3.5" /> Browse species library <ExternalLink className="size-3" />
          </a>
          <p className="text-[9px] text-dim uppercase tracking-widest">
            {checkedAt ? `Checked ${checkedAt.toLocaleTimeString()}` : "Checking service…"} · /api/species-tokens
          </p>
        </div>
      </div>
    </section>
  );
}
