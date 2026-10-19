import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Copy, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { cn } from "../lib/utils";
import { MYCO_SOLANA_MINT, solscanTokenUrl } from "../lib/mycoTokenConfig";
import {
  fetchMycoPublicProfile,
  type MycoUtility,
} from "../lib/mycodaoScienceApi";

const MYCO_TOTAL_SUPPLY = 210_000_000;
const MYCO_REALM_ID = "At93fiCMzEkZWBAHxSNjfk7zUHnF3JcxyCyPjZELjK9Y";
const MYCO_REALM_URL = `https://v2.realms.today/dao/${MYCO_REALM_ID}`;

const STAGE_STYLES: Record<string, string> = {
  available: "border-myco-accent/40 bg-myco-accent/10 text-myco-accent",
  beta: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  planned: "border-white/15 bg-white/5 text-dim",
};

function StageChip({ stage }: { stage: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-1 border text-[9px] font-black uppercase tracking-widest shrink-0",
        STAGE_STYLES[stage] ?? STAGE_STYLES.planned,
      )}
    >
      {stage}
    </span>
  );
}

function UtilityLink({ utility }: { utility: MycoUtility }) {
  if (!utility.interface_url) return <span className="text-[10px] text-dim">No interface yet</span>;
  const isExternal = /^https?:\/\//i.test(utility.interface_url);
  return (
    <a
      href={utility.interface_url}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className="inline-flex items-center gap-1.5 min-h-[44px] text-[10px] font-bold uppercase tracking-widest text-myco-accent hover:underline touch-manipulation"
    >
      {utility.interface_label || "Open"}
      {isExternal ? <ExternalLink className="size-3" /> : null}
    </a>
  );
}

function TokenDetailsCard() {
  const [isCopied, setIsCopied] = useState(false);

  async function copyMint() {
    try {
      await navigator.clipboard.writeText(MYCO_SOLANA_MINT);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1500);
    } catch {
      setIsCopied(false);
    }
  }

  const rows = [
    { label: "Symbol", value: "MYCO" },
    { label: "Network", value: "Solana" },
    { label: "Total supply", value: `${MYCO_TOTAL_SUPPLY.toLocaleString()} MYCO` },
  ];

  return (
    <div className="glass-bento border-white/5 bg-black/50 p-4 md:p-6 flex flex-col gap-4">
      <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-white">Token details</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {rows.map((row) => (
          <div key={row.label} className="border border-white/10 bg-black/30 px-3 py-2 min-h-[44px]">
            <dt className="text-[8px] font-bold text-dim uppercase tracking-widest">{row.label}</dt>
            <dd className="text-sm font-black text-white font-mono">{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className="border border-white/10 bg-black/30 px-3 py-2 flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-[8px] font-bold text-dim uppercase tracking-widest block">Mint</span>
          <span className="text-[11px] font-mono text-myco-accent break-all">{MYCO_SOLANA_MINT}</span>
        </div>
        <button
          type="button"
          onClick={() => void copyMint()}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] min-w-[44px] px-3 border border-white/15 text-[9px] font-bold uppercase tracking-widest text-dim hover:text-white hover:border-white/30 touch-manipulation shrink-0"
          aria-label="Copy MYCO mint address"
        >
          {isCopied ? <Check className="size-3.5 text-myco-accent" /> : <Copy className="size-3.5" />}
          {isCopied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <a
          href={MYCO_REALM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 border border-white/15 text-[10px] font-black uppercase tracking-widest text-white hover:border-myco-accent touch-manipulation"
        >
          Governance realm <ExternalLink className="size-3" />
        </a>
        <a
          href={solscanTokenUrl(MYCO_SOLANA_MINT)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 border border-white/15 text-[10px] font-black uppercase tracking-widest text-white hover:border-myco-accent touch-manipulation"
        >
          Solscan <ExternalLink className="size-3" />
        </a>
      </div>
      <div className="flex items-start gap-2 border border-amber-400/30 bg-amber-400/5 px-3 py-2">
        <AlertTriangle className="size-4 text-amber-300 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-100/90 leading-relaxed">
          Specification awaiting approval — rights and terms are not yet published. Holding MYCO gives no
          royalty, revenue or ownership rights.
        </p>
      </div>
    </div>
  );
}

function UtilitiesCard() {
  const [utilities, setUtilities] = useState<MycoUtility[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await fetchMycoPublicProfile();
      setUtilities(profile.utilities);
      setError(null);
    } catch (e) {
      setUtilities([]);
      setError(e instanceof Error ? e.message : "MYCO utility list unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="glass-bento border-white/5 bg-black/50 p-4 md:p-6 flex flex-col gap-4 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-white">What MYCO does today</h2>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-dim hover:text-white touch-manipulation"
          aria-label="Refresh MYCO utilities"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
        </button>
      </div>

      {error ? (
        <p className="text-xs text-amber-300/90">
          Could not load the MYCO utility list ({error}). Nothing is shown in its place.
        </p>
      ) : utilities.length === 0 ? (
        <p className="text-xs text-dim">
          {loading ? "Loading MYCO utilities…" : "The MYCO utility list is empty."}
        </p>
      ) : (
        <>
          <ul className="md:hidden flex flex-col gap-2">
            {utilities.map((u) => (
              <li key={u.id} className="border border-white/10 bg-black/30 p-3 flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-white">{u.title}</span>
                  <StageChip stage={u.stage} />
                </div>
                <p className="text-[11px] text-white/70 leading-relaxed">{u.user_action}</p>
                {u.note ? <p className="text-[10px] text-dim leading-relaxed">{u.note}</p> : null}
                <UtilityLink utility={u} />
              </li>
            ))}
          </ul>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[9px] uppercase tracking-widest text-dim border-b border-white/10">
                  <th className="py-2 pr-3">Utility</th>
                  <th className="py-2 pr-3">What you can do</th>
                  <th className="py-2 pr-3">Stage</th>
                  <th className="py-2">Where</th>
                </tr>
              </thead>
              <tbody>
                {utilities.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 align-top">
                    <td className="py-3 pr-3 font-bold text-white whitespace-nowrap">{u.title}</td>
                    <td className="py-3 pr-3">
                      <p className="text-white/75 leading-relaxed">{u.user_action}</p>
                      {u.note ? <p className="text-[10px] text-dim mt-1 leading-relaxed">{u.note}</p> : null}
                    </td>
                    <td className="py-3 pr-3"><StageChip stage={u.stage} /></td>
                    <td className="py-1"><UtilityLink utility={u} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="text-[9px] text-dim uppercase tracking-widest">Source: /api/mycodao/v1/myco</p>
    </div>
  );
}

export function MycoTokenFacts() {
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12 xl:col-span-5"><TokenDetailsCard /></div>
      <div className="col-span-12 xl:col-span-7 min-w-0"><UtilitiesCard /></div>
    </div>
  );
}
