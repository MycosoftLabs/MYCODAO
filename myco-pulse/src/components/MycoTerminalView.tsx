import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ExternalLink,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { cn } from "../lib/utils";
import { DexScreenerEmbed } from "./DexScreenerEmbed";
import { MatrixSwap } from "./MatrixSwap";
import {
  fetchLiquidityPoolsFromDex,
  fetchPulseMyco,
  fetchPulseNews,
  type LiquidityPoolRow,
  type PulseMycoSnapshot,
  type PulseNewsItem,
} from "../lib/pulseApi";
import {
  MYCO_DEX_PAIR,
  MYCO_SOLANA_MINT,
  dexScreenerPairUrl,
  jupiterSwapUrl,
  solscanPairUrl,
  solscanTokenUrl,
} from "../lib/mycoTokenConfig";

function formatUsd(n: number | undefined | null, digits = 2): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  if (n < 0.01) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(digits)}`;
}

function formatPct(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "";
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return `${Math.max(1, Math.floor(ms / 60_000))}m ago`;
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface MycoTerminalViewProps {
  setActiveTab?: (tab: string) => void;
}

export function MycoTerminalView({ setActiveTab }: MycoTerminalViewProps) {
  const [snapshot, setSnapshot] = useState<PulseMycoSnapshot | null>(null);
  const [pools, setPools] = useState<LiquidityPoolRow[]>([]);
  const [news, setNews] = useState<PulseNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [myco, poolRows, headlines] = await Promise.all([
        fetchPulseMyco(),
        fetchLiquidityPoolsFromDex(),
        fetchPulseNews(),
      ]);
      setSnapshot(myco);
      setPools(poolRows);
      const filtered = headlines.filter(
        (n) =>
          n.category === "mycodao" ||
          n.tags?.some((t) => /myco|mycodao|fungi|desci/i.test(t))
      );
      setNews(filtered.slice(0, 8));
      if (!myco?.price) {
        setError("Live MYCO market data unavailable — check /api/myco and DexScreener.");
      }
    } catch {
      setError("Failed to load MYCO terminal data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 30_000);
    return () => clearInterval(id);
  }, [load]);

  const solscanMint =
    snapshot?.links?.solscanUrl ||
    snapshot?.solana?.tokenExplorerUrl ||
    solscanTokenUrl(MYCO_SOLANA_MINT);
  const dexUrl = snapshot?.links?.dexscreenerUrl || dexScreenerPairUrl(MYCO_DEX_PAIR);
  const jupiterUrl = snapshot?.links?.jupiterUrl || jupiterSwapUrl(MYCO_SOLANA_MINT);
  const govUrl =
    snapshot?.links?.governanceUrl ||
    snapshot?.canonical?.realmsDaoUrl ||
    "https://v2.realms.today/dao/At93fiCMzEkZWBAHxSNjfk7zUHnF3JcxyCyPjZELjK9Y";

  const volume24h = useMemo(() => {
    const fromPools = snapshot?.dexPools?.[0]?.volumeH24;
    if (fromPools != null && fromPools > 0) return fromPools;
    return snapshot?.coinmarketcap?.volume24hUsd;
  }, [snapshot]);

  const supplyLabel =
    snapshot?.canonical?.totalSupplyLabel ||
    (snapshot?.supply && snapshot.supply > 0
      ? `${snapshot.supply.toLocaleString()} MYCO`
      : "—");

  return (
    <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar mb-20">
      <div className="max-w-[1700px] mx-auto p-4 md:p-6 space-y-6 pb-32">
        {/* Header rail */}
        <div className="glass-bento border-white/5 bg-black/50 p-4 md:p-6 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-myco-accent animate-pulse shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-[0.35em] text-myco-accent">
                MYCO · Solana SPL
              </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-white">
                {snapshot?.price && snapshot.price > 0
                  ? formatUsd(snapshot.price, snapshot.price < 0.01 ? 6 : 4)
                  : loading
                    ? "…"
                    : "—"}
              </h1>
              {snapshot?.changePct != null && Number.isFinite(snapshot.changePct) && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-sm font-bold font-mono",
                    snapshot.changePct >= 0 ? "text-myco-accent" : "text-red-400"
                  )}
                >
                  {snapshot.changePct >= 0 ? (
                    <TrendingUp className="size-4" />
                  ) : (
                    <TrendingDown className="size-4" />
                  )}
                  {formatPct(snapshot.changePct)} 24h
                </span>
              )}
            </div>
            <p className="text-[10px] text-dim uppercase font-bold tracking-widest">
              Supply {supplyLabel}
              {snapshot?.fdv ? ` · FDV ${formatUsd(snapshot.fdv)}` : ""}
              {snapshot?.liquidityUsd ? ` · Liq ${formatUsd(snapshot.liquidityUsd)}` : ""}
              {volume24h ? ` · Vol 24h ${formatUsd(volume24h)}` : ""}
            </p>
            {error && (
              <p className="text-xs text-amber-400/90 max-w-xl">{error}</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <WalletMultiButton className="!min-h-[44px] !bg-myco-accent/10 !border !border-myco-accent/40 !text-myco-accent !font-bold !uppercase !text-[10px] !tracking-widest" />
            <button
              type="button"
              onClick={() => void load()}
              className="min-h-[44px] px-4 border border-white/10 text-dim hover:text-white hover:border-white/20 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest"
              aria-label="Refresh MYCO data"
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>

        {/* Explorer links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "DexScreener", href: dexUrl },
            { label: "Solscan token", href: solscanMint },
            { label: "Solscan pair", href: solscanPairUrl(MYCO_DEX_PAIR) },
            { label: "Jupiter swap", href: jupiterUrl },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] px-3 py-2 glass-bento border-white/5 flex items-center justify-between gap-2 hover:border-myco-accent/40 transition-colors group"
            >
              <span className="text-[9px] font-bold uppercase tracking-widest text-dim group-hover:text-white">
                {link.label}
              </span>
              <ExternalLink className="size-3 text-myco-accent shrink-0" />
            </a>
          ))}
        </div>

        {/* Main grid: chart + swap */}
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          <div className="col-span-12 xl:col-span-8 glass-bento border-white/5 bg-black/40 p-3 md:p-4 min-h-[420px]">
            <DexScreenerEmbed pairAddress={MYCO_DEX_PAIR} height={560} />
          </div>
          <div className="col-span-12 xl:col-span-4 glass-bento border-white/5 bg-black/40 p-3 md:p-4 min-h-[420px] flex flex-col">
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-myco-accent mb-3 px-1">
              Trade MYCO · Jupiter
            </h2>
            <div className="flex-1 min-h-[360px]">
              <MatrixSwap />
            </div>
          </div>
        </div>

        {/* Metrics + pools */}
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          <div className="col-span-12 md:col-span-4 grid grid-cols-2 md:grid-cols-1 gap-3">
            {[
              { l: "Price", v: snapshot?.price ? formatUsd(snapshot.price, 6) : "—" },
              { l: "24h change", v: formatPct(snapshot?.changePct) },
              { l: "Liquidity", v: formatUsd(snapshot?.liquidityUsd) },
              { l: "FDV", v: formatUsd(snapshot?.fdv) },
              { l: "24h volume", v: formatUsd(volume24h) },
              { l: "Chain", v: snapshot?.chain || "Solana" },
            ].map((row) => (
              <div key={row.l} className="glass-bento p-4 border-white/5">
                <span className="text-[8px] font-bold text-dim uppercase tracking-widest block mb-1">
                  {row.l}
                </span>
                <span className="text-sm font-black text-white font-mono">{row.v}</span>
              </div>
            ))}
          </div>

          <div className="col-span-12 md:col-span-8 glass-bento border-white/5 bg-black/40 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white">
                Liquidity pools (DexScreener)
              </h3>
              <Activity className="size-4 text-dim" />
            </div>
            {pools.length === 0 ? (
              <p className="text-sm text-dim py-8 text-center">
                No liquidity pools returned from DexScreener for this mint.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[520px] w-full text-left text-xs">
                  <thead>
                    <tr className="text-[9px] uppercase tracking-widest text-dim border-b border-white/10">
                      <th className="py-2 pr-4">Pool</th>
                      <th className="py-2 pr-4">DEX</th>
                      <th className="py-2 pr-4">Price</th>
                      <th className="py-2 pr-4">Liquidity</th>
                      <th className="py-2">24h vol</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pools.map((p) => (
                      <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="py-3 pr-4 font-bold text-white">{p.name}</td>
                        <td className="py-3 pr-4 text-dim uppercase">{p.dexId}</td>
                        <td className="py-3 pr-4 font-mono">{p.price}</td>
                        <td className="py-3 pr-4 font-mono">{formatUsd(p.liquidity)}</td>
                        <td className="py-3 font-mono">{formatUsd(p.volume)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Tokenomics + news */}
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          <div className="col-span-12 lg:col-span-6 glass-bento border-white/5 bg-black/40 p-6 space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white">
              Tokenomics
            </h3>
            {snapshot?.canonical?.summary ? (
              <p className="text-sm text-dim leading-relaxed">{snapshot.canonical.summary}</p>
            ) : (
              <p className="text-sm text-dim">Tokenomics summary loads from /api/myco canonical data.</p>
            )}
            {(snapshot?.canonical?.distribution?.length ?? 0) > 0 ? (
              <ul className="space-y-2">
                {snapshot!.canonical!.distribution!.map((d) => (
                  <li
                    key={d.title}
                    className="flex justify-between gap-4 text-xs border-b border-white/5 pb-2"
                  >
                    <span className="text-white font-medium">{d.title}</span>
                    <span className="text-myco-accent font-mono shrink-0">{d.pct}%</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-dim">No distribution data from API.</p>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <a
                href={govUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-4 inline-flex items-center gap-2 bg-myco-accent text-black text-[10px] font-black uppercase tracking-widest"
              >
                Governance
                <ExternalLink className="size-3" />
              </a>
              {setActiveTab && (
                <button
                  type="button"
                  onClick={() => setActiveTab("DAO")}
                  className="min-h-[44px] px-4 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/5"
                >
                  DAO hub
                </button>
              )}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-6 glass-bento border-white/5 bg-black/40 p-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-dim mb-4">
              MycoDAO headlines
            </h3>
            {news.length === 0 ? (
              <p className="text-sm text-dim py-6">No MYCO-tagged headlines from /api/news yet.</p>
            ) : (
              <ul className="space-y-4">
                {news.map((n) => (
                  <li key={n.id}>
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group"
                    >
                      <div className="flex justify-between gap-2 mb-1">
                        <span className="text-[8px] font-black text-myco-accent uppercase tracking-widest">
                          {n.source}
                        </span>
                        <span className="text-[8px] text-dim">{timeAgo(n.publishedAt)}</span>
                      </div>
                      <p className="text-sm font-bold text-white group-hover:text-myco-accent transition-colors leading-snug">
                        {n.title}
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Contract */}
        <div className="glass-bento border-white/5 bg-black/30 p-4 text-[10px] font-mono text-dim break-all">
          <span className="text-dim uppercase tracking-widest font-bold mr-2">Mint</span>
          <a href={solscanMint} target="_blank" rel="noopener noreferrer" className="text-myco-accent hover:underline">
            {MYCO_SOLANA_MINT}
          </a>
          <span className="mx-3 text-white/20">|</span>
          <span className="text-dim uppercase tracking-widest font-bold mr-2">Pair</span>
          <a href={dexUrl} target="_blank" rel="noopener noreferrer" className="text-myco-accent hover:underline">
            {MYCO_DEX_PAIR}
          </a>
        </div>
      </div>
    </div>
  );
}
