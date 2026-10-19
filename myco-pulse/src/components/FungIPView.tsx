import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Database,
  ExternalLink,
  FlaskConical,
  Loader2,
  Search,
  Sparkles,
  Wallet,
} from "lucide-react";
import { cn } from "../lib/utils";
import type { PulseTabId } from "./PulseShellNav";
import {
  FUNGIP_FAQ,
  FUNGIP_HOW_STEPS,
  FUNGIP_MEDIA,
  MYCO_APP_PROJECT_URL,
} from "../data/fungIp";
import {
  fetchFungalLibrary,
  fetchFungalOverview,
  type FungalLibraryItem,
  type FungalOverview,
} from "../lib/tissueApi";
import { SpeciesRewardsSection } from "./SpeciesRewardsSection";
import { FungalEconomyCycle } from "./FungalEconomyCycle";

export interface FungIPViewProps {
  setActiveTab?: (tab: PulseTabId) => void;
}

function StatChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-sm border border-white/10 bg-black/40 px-3 py-2 min-h-[44px] flex flex-col justify-center">
      <span className="text-[8px] uppercase tracking-widest text-dim font-bold">
        {label}
      </span>
      <span className="text-sm font-mono text-myco-accent tabular-nums">
        {value}
      </span>
    </div>
  );
}

function TaxonRow({
  item,
  ancestryBase,
}: {
  item: FungalLibraryItem;
  ancestryBase: string;
}) {
  const ancestryHref = `${ancestryBase.replace(/\/$/, "")}/natureos/ancestry?taxon=${encodeURIComponent(item.mindexTaxonUuid)}`;
  return (
    <article className="border border-white/10 bg-black/30 p-3 md:p-4 flex flex-col gap-2 hover:border-myco-accent/40 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-white truncate">
            {item.commonName || item.scientificName || "Unnamed taxon"}
          </h4>
          <p className="text-[11px] font-mono text-dim italic truncate">
            {item.scientificName}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 shrink-0">
          {item.fungipFgId ? (
            <span className="text-[8px] font-bold uppercase tracking-widest px-2 py-1 bg-myco-accent/15 text-myco-accent border border-myco-accent/30">
              {item.fungipFgId}
            </span>
          ) : null}
          {item.tokenStatus ? (
            <span className="text-[8px] font-bold uppercase tracking-widest px-2 py-1 bg-white/5 text-white/70 border border-white/10">
              {item.tokenStatus}
            </span>
          ) : (
            <span className="text-[8px] font-bold uppercase tracking-widest px-2 py-1 bg-white/5 text-dim border border-white/10">
              Reference
            </span>
          )}
          {item.hasPhysicalHoldings ? (
            <span className="text-[8px] font-bold uppercase tracking-widest px-2 py-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              Physical ×{item.physicalHoldingsCount}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href={ancestryHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 min-h-[44px] px-3 text-[9px] font-bold uppercase tracking-widest border border-white/15 text-white/80 hover:border-myco-accent hover:text-myco-accent touch-manipulation"
        >
          Ancestry <ExternalLink className="size-3" />
        </a>
        {item.tokenMint ? (
          <span className="inline-flex items-center min-h-[44px] px-3 text-[9px] font-mono text-dim truncate max-w-full">
            mint {item.tokenMint.slice(0, 8)}…
          </span>
        ) : null}
      </div>
    </article>
  );
}

export function FungIPView({ setActiveTab }: FungIPViewProps) {
  const [overview, setOverview] = useState<FungalOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [items, setItems] = useState<FungalLibraryItem[]>([]);
  const [libraryReason, setLibraryReason] = useState<string | null>(null);
  const [libraryAvailability, setLibraryAvailability] = useState<string>("unavailable");
  const [total, setTotal] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);

  const ancestryBase =
    overview?.ancestryBaseUrl || "https://mycosoft.com";

  const loadOverview = useCallback(async () => {
    try {
      const data = await fetchFungalOverview();
      setOverview(data);
      setOverviewError(data.reason ?? null);
    } catch (e) {
      setOverview(null);
      setOverviewError(e instanceof Error ? e.message : "overview failed");
    }
  }, []);

  const loadLibrary = useCallback(async (query: string) => {
    setListLoading(true);
    try {
      const result = await fetchFungalLibrary({
        limit: 24,
        q: query || undefined,
      });
      setLibraryAvailability(result.availability);
      setItems(result.items);
      setTotal(result.total);
      setLibraryReason(result.reason ?? null);
    } catch (e) {
      setLibraryAvailability("unavailable");
      setItems([]);
      setTotal(null);
      setLibraryReason(e instanceof Error ? e.message : "library failed");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadOverview();
      if (!cancelled) await loadLibrary("");
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadOverview, loadLibrary]);

  const fungipRows = useMemo(
    () => items.filter((i) => Boolean(i.fungipFgId)),
    [items],
  );

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = searchInput.trim();
    setQ(next);
    void loadLibrary(next);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto no-scrollbar bg-[#050505]">
      {/* Hero */}
      <section className="relative border-b border-white/10">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={FUNGIP_MEDIA.mycodexHero}
            alt="Myco App and MycoDEX — real-world fungal Pokédex"
            className="w-full h-full object-cover opacity-35"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-black/40" />
        </div>
        <div className="relative z-10 px-4 py-8 md:px-8 md:py-12 lg:px-12 max-w-5xl">
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-myco-accent mb-3">
            FungIP · MINDEX · Myco
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white uppercase max-w-2xl">
            Find fungi. Match MINDEX. Earn species tokens + MYCO.
          </h1>
          <p className="mt-3 text-sm text-white/70 max-w-xl leading-relaxed">
            FungIP is how MycoDAO connects field discovery (Myco App / MycoDEX) to
            the Mycosoft MINDEX catalog, Ancestry, Tissue holdings, and automated
            species-token rewards — without anyone babysitting a mint button.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row flex-wrap gap-2">
            <a
              href={MYCO_APP_PROJECT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 bg-myco-accent text-black text-[10px] font-black uppercase tracking-widest touch-manipulation"
            >
              Myco App & MycoDEX <ExternalLink className="size-3.5" />
            </a>
            <button
              type="button"
              onClick={() => setActiveTab?.("Tissue")}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 border border-white/20 text-white text-[10px] font-black uppercase tracking-widest hover:border-myco-accent touch-manipulation"
            >
              <FlaskConical className="size-3.5" /> Tissue library
            </button>
            <a
              href="/species-tokens"
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 border border-white/20 text-white text-[10px] font-black uppercase tracking-widest hover:border-myco-accent touch-manipulation"
            >
              <Wallet className="size-3.5" /> Species rewards
            </a>
          </div>
        </div>
      </section>

      {/* Live stats */}
      <section className="px-4 md:px-8 lg:px-12 py-6 border-b border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <Database className="size-4 text-myco-accent" />
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
            Live catalog status
          </h2>
          {loading ? (
            <Loader2 className="size-3.5 animate-spin text-dim" />
          ) : null}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <StatChip
            label="MINDEX taxa (library)"
            value={
              overview?.libraryTaxaTotal != null
                ? String(overview.libraryTaxaTotal)
                : "—"
            }
          />
          <StatChip
            label="Token associations"
            value={
              overview?.tokenAssociatedTotal != null
                ? String(overview.tokenAssociatedTotal)
                : "—"
            }
          />
          <StatChip
            label="FungiP FG linked"
            value={
              overview?.fungipFgLinkedTotal != null
                ? String(overview.fungipFgLinkedTotal)
                : "—"
            }
          />
          <StatChip
            label="Physical bridges"
            value={
              overview?.physicalBridgedTotal != null
                ? String(overview.physicalBridgedTotal)
                : "—"
            }
          />
        </div>
        <p className="mt-3 text-[10px] text-dim leading-relaxed max-w-3xl">
          {overview?.availability === "available"
            ? `Snapshot ${overview.snapshotId ?? "—"} · last sync ${overview.lastSyncAt ?? "—"}. Library taxa are licensed MINDEX projections — not physical jars.`
            : overview?.availability === "empty"
              ? "Library schema is ready but no published sync yet. Physical Tissue may still show holdings. Curator sync pulls full Fungi from MINDEX when licensed."
              : `Catalog unavailable${overviewError || libraryReason ? `: ${overviewError || libraryReason}` : ""}. UI stays honest — no fake species.`}
        </p>
      </section>

      {/* How it works */}
      <section className="px-4 md:px-8 lg:px-12 py-8 border-b border-white/10">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="size-4 text-myco-accent" />
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
            How it works
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FUNGIP_HOW_STEPS.map((step) => (
            <article
              key={step.id}
              className="border border-white/10 bg-black/25 overflow-hidden flex flex-col"
            >
              <div className="aspect-[4/3] bg-black/60 overflow-hidden">
                <img
                  src={step.image}
                  alt={step.imageAlt}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-4 flex flex-col gap-2 flex-1">
                <h3 className="text-xs font-black uppercase tracking-widest text-myco-accent">
                  {step.title}
                </h3>
                <p className="text-[11px] text-white/70 leading-relaxed">
                  {step.body}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <FungalEconomyCycle variant="fungip" />

      <SpeciesRewardsSection />

      {/* Library search */}
      <section className="px-4 md:px-8 lg:px-12 py-8 border-b border-white/10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white flex items-center gap-2">
              <Search className="size-4 text-myco-accent" />
              Search MINDEX fungal library
            </h2>
            <p className="text-[10px] text-dim mt-1">
              {total != null
                ? `${total.toLocaleString()} public taxa in replica · showing ${items.length}`
                : "Results load from licensed MycoDAO replica of MINDEX Fungi"}
              {q ? ` · filter “${q}”` : ""}
            </p>
          </div>
          <form
            onSubmit={onSearchSubmit}
            className="flex w-full md:w-auto gap-2"
          >
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Species, common name…"
              className="flex-1 md:w-64 min-h-[44px] bg-black border border-white/15 px-3 text-base md:text-sm text-white outline-none focus:border-myco-accent"
            />
            <button
              type="submit"
              className="min-h-[44px] min-w-[44px] px-4 bg-myco-accent text-black text-[10px] font-black uppercase tracking-widest touch-manipulation"
            >
              {listLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Go"
              )}
            </button>
          </form>
        </div>

        {libraryAvailability === "unavailable" ||
        libraryAvailability === "empty" ? (
          <div className="border border-dashed border-white/15 p-6 text-center space-y-2">
            <p className="text-xs text-white/80 font-medium">
              {libraryAvailability === "empty"
                ? "No taxa published in the fungal library yet."
                : "Fungal library API unavailable."}
            </p>
            <p className="text-[10px] text-dim max-w-lg mx-auto leading-relaxed">
              Open Tissue for physical holdings, or run a licensed MINDEX sync
              after migration 009. This page will not invent species to fill the
              list.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab?.("Tissue")}
              className="inline-flex items-center justify-center min-h-[44px] px-4 mt-2 border border-myco-accent text-myco-accent text-[10px] font-black uppercase tracking-widest touch-manipulation"
            >
              Browse Tissue
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {items.map((item) => (
              <TaxonRow
                key={item.mindexTaxonUuid}
                item={item}
                ancestryBase={ancestryBase}
              />
            ))}
          </div>
        )}

        {fungipRows.length > 0 ? (
          <div className="mt-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-myco-accent mb-3">
              FungiP IDs in this page
            </h3>
            <div className="flex flex-wrap gap-2">
              {fungipRows.map((r) => (
                <span
                  key={r.mindexTaxonUuid}
                  className="text-[9px] font-mono px-2 py-1.5 border border-myco-accent/30 text-white/80 bg-myco-accent/5"
                >
                  {r.fungipFgId} · {r.scientificName}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {/* FAQ */}
      <section className="px-4 md:px-8 lg:px-12 py-8 pb-16">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="size-4 text-myco-accent" />
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
            Plain answers
          </h2>
        </div>
        <div className="space-y-3 max-w-3xl">
          {FUNGIP_FAQ.map((item) => (
            <div
              key={item.q}
              className="border border-white/10 bg-black/20 p-4"
            >
              <h3 className="text-xs font-bold text-white mb-1">{item.q}</h3>
              <p className="text-[11px] text-white/65 leading-relaxed">
                {item.a}
              </p>
            </div>
          ))}
        </div>
        <p
          className={cn(
            "mt-6 text-[9px] text-dim uppercase tracking-widest leading-relaxed max-w-2xl",
          )}
        >
          Safety: never eat mushrooms based on this app. ID supports science and
          coordination — not culinary advice. Mainnet minting stays gated until
          license, FungiP pilot, and signer activation.
        </p>
      </section>
    </div>
  );
}
