import { useEffect, useState } from "react";
import { Coins, Copy, Check } from "lucide-react";
import { cn } from "../lib/utils";
import { fetchPulseMyco, type PulseMycoSnapshot } from "../lib/pulseApi";
import { fetchMycoPublicProfile, type MycoPublicProfile } from "../lib/mycodaoScienceApi";
import { MYCO_SOLANA_MINT, dexScreenerPairUrl, jupiterSwapUrl, solscanTokenUrl } from "../lib/mycoTokenConfig";
import { pulseApiUrl } from "../lib/apiOrigin";
import { MycoTradeChart, type MycoHistory } from "./MycoTradeChart";

const REFRESH_MS = 60_000;
const REALM_URL = "https://v2.realms.today/dao/At93fiCMzEkZWBAHxSNjfk7zUHnF3JcxyCyPjZELjK9Y";
const TOTAL_SUPPLY = 210_000_000;

function usd(value?: number | null, digits = 0): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "—";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: digits });
}

function price(value?: number | null): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "—";
  return `$${value < 0.01 ? value.toPrecision(4) : value.toFixed(4)}`;
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="min-w-0 border border-white/10 bg-white/[0.02] px-3 py-2">
      <p className="text-[9px] font-bold uppercase tracking-widest text-white/45">{label}</p>
      <p className={cn("truncate text-sm font-black text-white", tone === "up" && "text-myco-accent", tone === "down" && "text-red-400")}>{value}</p>
    </div>
  );
}

const LIQUIDITY_LABELS: Record<MycoHistory["liquidity_status"], string> = {
  active: "Active",
  low: "Low liquidity",
  none: "No liquidity",
  unknown: "Unknown",
};

function liquidityNote(history: MycoHistory): string {
  const reserve = usd(history.reserve_usd);
  const threshold = usd(history.low_liquidity_threshold_usd);
  const listing = history.dexscreener_pairs_active
    ? "DexScreener still lists the pair."
    : "DexScreener lists no active pair.";
  if (history.liquidity_status === "none") {
    return `The MYCO / SOL pool currently holds no usable liquidity. ${listing} Trades will fail or move the price sharply until liquidity is added; the token and its history are unchanged.`;
  }
  if (history.liquidity_status === "low") {
    return `The MYCO / SOL pool holds ${reserve}, below the ${threshold} needed for normal trading. ${listing} Large trades will move the price; this notice clears automatically when reserves recover.`;
  }
  return `Pool liquidity could not be confirmed right now. ${listing}`;
}

/** MYCO coin update for Pulse: live market data, token identity and what MYCO can do today. */
export function PulseMycoWidget({ onOpenMyco }: { onOpenMyco?: () => void }) {
  const [snapshot, setSnapshot] = useState<PulseMycoSnapshot | null>(null);
  const [profile, setProfile] = useState<MycoPublicProfile | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<MycoHistory | null>(null);

  useEffect(() => {
    let active = true;
    const load = () => {
      fetch(pulseApiUrl("/api/myco/history"), { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<MycoHistory>) : null))
        .then((h) => active && h && setHistory(h))
        .catch(() => undefined);
      fetchPulseMyco()
        .then((s) => active && setSnapshot(s))
        .catch(() => active && setSnapshot(null))
        .finally(() => active && setCheckedAt(new Date()));
      fetchMycoPublicProfile()
        .then((p) => active && setProfile(p))
        .catch(() => undefined);
    };
    load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  const mint = profile?.spec?.mint || snapshot?.solana?.mint || MYCO_SOLANA_MINT;
  const hasQuote = (snapshot?.price ?? 0) > 0 || (history?.price_usd ?? 0) > 0;
  const livePrice = (snapshot?.price ?? 0) > 0 ? snapshot?.price : history?.price_usd;
  const poolVolume = (snapshot?.dexPools ?? []).reduce((sum, p) => sum + (p.volumeH24 ?? 0), 0);
  const volume = poolVolume > 0 ? poolVolume : history?.volume_24h_usd ?? 0;
  const change = snapshot?.changePct ?? history?.price_change_24h_pct ?? undefined;
  const liquidity = snapshot?.liquidityUsd ?? history?.reserve_usd ?? null;
  const proposals = snapshot?.governance?.activeProposals;
  const stages = (profile?.utilities ?? []).reduce<Record<string, number>>((acc, u) => {
    acc[u.stage] = (acc[u.stage] ?? 0) + 1;
    return acc;
  }, {});

  const copyMint = () => {
    void navigator.clipboard?.writeText(mint).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <section aria-label="MYCO coin update" className="border border-white/10 bg-black/40 p-4 md:p-5">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-myco-accent" aria-hidden="true" />
          <h2 className="text-sm font-black uppercase tracking-widest">MYCO coin update</h2>
          <span className="text-[10px] uppercase tracking-widest text-white/40">Solana</span>
        </div>
        <p className="text-[10px] uppercase tracking-widest text-white/40">
          {checkedAt ? `Updated ${checkedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Loading…"}
        </p>
      </header>

      <div className="mb-3">
        <MycoTradeChart />
      </div>

      {history ? (
        <div className="mb-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Last trade" value={`${price(history.last_price_usd)} · ${history.last_trade_day ?? "—"}`} />
            <Stat label="All-time high" value={`${price(history.all_time_high_usd)} · ${history.all_time_high_day ?? "—"}`} />
            <Stat label="Pool reserve" value={usd(history.reserve_usd)} />
            <Stat label="Pool status" value={LIQUIDITY_LABELS[history.liquidity_status]} />
          </div>
          {history.liquidity_status !== "active" ? (
            <p className="mt-2 text-[11px] text-amber-300/90">
              {liquidityNote(history)}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Price" value={hasQuote ? price(livePrice) : history?.last_price_usd ? `${price(history.last_price_usd)} (last trade)` : "No live quote"} />
        <Stat
          label="24h"
          value={hasQuote && change != null ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}%` : "—"}
          tone={hasQuote && change != null ? (change >= 0 ? "up" : "down") : undefined}
        />
        <Stat label="Liquidity" value={usd(liquidity)} />
        <Stat label="24h volume" value={usd(volume)} />
        <Stat label="FDV" value={usd(snapshot?.fdv)} />
        <Stat label="Total supply" value={TOTAL_SUPPLY.toLocaleString("en-US")} />
      </div>

      <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/45">Mint</span>
            <code className="truncate text-xs text-white/80">{mint}</code>
            <button type="button" onClick={copyMint} aria-label="Copy mint address" className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-white/60 hover:text-myco-accent">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-[11px] text-amber-300/90">
            Specification awaiting approval. Holding MYCO gives no royalty, revenue or ownership rights.
          </p>
          <p className="text-[11px] text-white/55">
            Governance: {proposals != null ? `${proposals} active proposal${proposals === 1 ? "" : "s"}` : "proposal count unavailable"} ·
            Uses: {Object.keys(stages).length ? Object.entries(stages).map(([s, n]) => `${n} ${s}`).join(", ") : "loading"}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold uppercase tracking-widest">
          <a className="min-h-[44px] inline-flex items-center text-myco-accent hover:underline" href={jupiterSwapUrl(mint)} target="_blank" rel="noopener noreferrer">Get MYCO ↗</a>
          <a className="min-h-[44px] inline-flex items-center text-myco-accent hover:underline" href={snapshot?.links?.dexscreenerUrl || dexScreenerPairUrl()} target="_blank" rel="noopener noreferrer">Chart ↗</a>
          <a className="min-h-[44px] inline-flex items-center text-myco-accent hover:underline" href={solscanTokenUrl(mint)} target="_blank" rel="noopener noreferrer">Solscan ↗</a>
          <a className="min-h-[44px] inline-flex items-center text-myco-accent hover:underline" href={`${REALM_URL}/proposals`} target="_blank" rel="noopener noreferrer">Proposals ↗</a>
          {onOpenMyco ? (
            <button type="button" onClick={onOpenMyco} className="min-h-[44px] inline-flex items-center text-white hover:text-myco-accent">
              Full MYCO page →
            </button>
          ) : null}
        </div>
      </div>
      <p className="mt-2 text-[9px] uppercase tracking-widest text-white/35">
        Source: /api/myco · /api/myco/history (GeckoTerminal daily OHLCV, DexScreener pair status) · /api/mycodao/v1/myco
        {history ? (
          <>
            {" · "}
            <a className="text-myco-accent" href={history.geckoterminal_url} target="_blank" rel="noopener noreferrer">GeckoTerminal ↗</a>
          </>
        ) : null}
      </p>
    </section>
  );
}
