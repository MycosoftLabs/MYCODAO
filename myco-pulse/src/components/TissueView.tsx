import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Boxes,
  Dna,
  Loader2,
  Microscope,
  RefreshCw,
  Repeat,
  Search,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useTissueCurator } from "../hooks/useTissueCurator";
import {
  fetchBiobankAccessions,
  fetchPublicBiobankCatalog,
  fetchReplatesDue,
  type BiobankAccession,
  type PublicBiobankItem,
} from "../lib/tissueApi";
import { TissueCuratorPanel } from "./TissueCuratorPanel";
import { AccessionsGrid } from "./tissue/AccessionsGrid";
import { AccessionDetailDrawer } from "./tissue/AccessionDetailDrawer";
import {
  Chip,
  FormIcon,
  HealthChip,
  hasWebGL,
  healthHex,
  mediaServeUrl,
  prefersReducedMotion,
  useTheme,
} from "./tissue/biobankUi";
import type { VaultTile } from "./tissue/BiobankVaultHero";

const BiobankVaultHero = lazy(() => import("./tissue/BiobankVaultHero"));

type ViewId = "catalog" | "inventory" | "replates";

const CATEGORY_CHIPS = [
  { id: "all", label: "All" },
  { id: "mushroom", label: "Mushrooms" },
  { id: "lichen", label: "Lichen" },
  { id: "mold", label: "Mold" },
  { id: "yeast", label: "Yeast" },
  { id: "other", label: "Other" },
];

const VIEWS: {
  id: ViewId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "catalog", label: "Catalog", icon: Microscope },
  { id: "inventory", label: "Inventory", icon: Boxes },
  { id: "replates", label: "Replates due", icon: Repeat },
];

function useCurateRoute(): boolean {
  const [curate, setCurate] = useState(false);
  useEffect(() => {
    const sync = () => {
      const params = new URLSearchParams(window.location.search);
      setCurate(params.get("curate") === "1");
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  return curate;
}

// ---------------------------------------------------------------------------
// Error boundary so a WebGL/texture failure never blanks the hero
// ---------------------------------------------------------------------------
class HeroBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    /* swallow — fall back to CSS hero */
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Hero — 3D glass fridge with CSS glass-grid fallback
// ---------------------------------------------------------------------------
function HeroShell({
  inventoryTiles,
  onSelect,
  onDeselect,
  selectedCode,
  subtitle,
}: {
  /** Physical units with lab cover media — not catalog-only / reserved species. */
  inventoryTiles: VaultTile[];
  onSelect: (code: string) => void;
  onDeselect: () => void;
  selectedCode: string | null;
  subtitle: string;
}) {
  const theme = useTheme();
  const reduced = prefersReducedMotion();
  const use3D = useMemo(() => hasWebGL() && !reduced, [reduced]);
  const [focusRow, setFocusRow] = useState(0);
  const ROWS_DEEP = 5;

  const fallback = (
    <div className="absolute inset-0">
      <HeroFallback />
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="rounded-lg bg-black/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/70">
          Loading vault…
        </p>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "relative w-full shrink-0 overflow-hidden rounded-2xl border h-[300px] sm:h-[340px]",
        theme === "light"
          ? "border-black/10 bg-[#e9eef0]"
          : "border-white/10 bg-[#060d0b]",
      )}
    >
      {use3D ? (
        <HeroBoundary fallback={fallback}>
          <Suspense fallback={fallback}>
            <BiobankVaultHero
              tiles={inventoryTiles}
              onSelect={onSelect}
              onDeselect={onDeselect}
              selectedCode={selectedCode}
              focusRow={focusRow}
              theme={theme}
              reducedMotion={reduced}
            />
          </Suspense>
        </HeroBoundary>
      ) : (
        fallback
      )}

      {/* row navigator — fly between the depth layers */}
      {use3D ? (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-lg border border-white/15 bg-black/45 p-1 backdrop-blur-md">
          <span className="px-1.5 text-[8px] font-bold uppercase tracking-widest text-white/50">
            Row
          </span>
          {Array.from({ length: ROWS_DEEP }).map((_, r) => (
            <button
              key={r}
              type="button"
              onClick={() => setFocusRow(r)}
              className={cn(
                "size-7 rounded text-[11px] font-bold tabular-nums touch-manipulation transition-colors",
                focusRow === r
                  ? "bg-myco-accent text-black"
                  : "text-white/70 hover:bg-white/10",
              )}
            >
              {r + 1}
            </button>
          ))}
        </div>
      ) : null}

      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 p-4 sm:p-6",
          theme === "light"
            ? "bg-gradient-to-t from-white/90 via-white/40 to-transparent"
            : "bg-gradient-to-t from-[#060d0b] via-[#060d0b]/40 to-transparent",
        )}
      >
        <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-myco-accent">
          <Dna className="size-4" aria-hidden />
          MycoDAO Biobank · Digital Twin
        </p>
        <h1
          className={cn(
            "mt-1 text-2xl font-black uppercase sm:text-3xl",
            theme === "light" ? "text-stone-900" : "text-white",
          )}
        >
          Tissue Catalog
        </h1>
        <p
          className={cn(
            "mt-1 max-w-xl text-xs",
            theme === "light" ? "text-stone-600" : "text-white/60",
          )}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
}

/** Glass-fridge look in pure CSS — used when WebGL is unavailable or reduced-motion. */
function HeroFallback() {
  const theme = useTheme();
  return (
    <div className="absolute inset-0 p-3 sm:p-4">
      <div
        className={cn(
          "grid h-full grid-cols-5 gap-2",
          "rounded-xl p-2 backdrop-blur-md",
          theme === "light" ? "bg-white/40" : "bg-white/[0.04]",
        )}
        style={{
          boxShadow:
            theme === "light"
              ? "inset 0 1px 0 rgba(255,255,255,0.6)"
              : "inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "rounded-md border",
              theme === "light"
                ? "border-black/8 bg-black/[0.04]"
                : "border-white/10 bg-white/[0.06]",
            )}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public species card (real biobank data)
// ---------------------------------------------------------------------------
function SpeciesCard({
  item,
  index,
  theme,
  onOpenSample,
}: {
  item: PublicBiobankItem;
  index: number;
  theme: "light" | "dark";
  onOpenSample: (code: string) => void;
}) {
  const speciesImg = item.speciesImageUrl;
  const labCover = mediaServeUrl(item.coverServeUrl);
  /** Catalog hero = species reference only; lab jar never replaces it. */
  const hero = speciesImg;
  const hasPhysicalSample =
    item.status === "stored" && Boolean(item.coverServeUrl);
  const accent = healthHex(item.health);

  const cardClass = cn(
    "group relative flex flex-col overflow-hidden rounded-xl border backdrop-blur-md touch-manipulation transition-colors text-left w-full",
    theme === "light"
      ? "border-black/10 bg-white/60 hover:border-black/20"
      : "border-white/10 bg-white/[0.04] hover:border-white/25",
    hasPhysicalSample ? "cursor-pointer" : "cursor-default",
  );

  const inner = (
    <>
      <div className="relative aspect-square overflow-hidden">
        {hero ? (
          <img
            src={hero}
            alt={item.commonName || item.accessionCode}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: `radial-gradient(circle at 50% 40%, ${accent}22, transparent 70%)` }}
          >
            <FormIcon form={item.form} className="size-9 opacity-40" />
          </div>
        )}
        <span className="absolute left-0 top-0 h-1 w-full" style={{ backgroundColor: accent }} />
        {/* lab-sample thumbnail inset (what we physically hold) */}
        {labCover && hasPhysicalSample ? (
          <span className="absolute bottom-2 left-2 overflow-hidden rounded-md border-2 border-white/70 shadow-lg">
            <img src={labCover} alt="lab sample" className="size-10 object-cover" />
          </span>
        ) : speciesImg && !hasPhysicalSample ? (
          <span
            className={cn(
              "absolute bottom-2 left-2 flex size-10 flex-col items-center justify-center rounded-md border-2 border-dashed px-0.5 text-center shadow-lg",
              theme === "light"
                ? "border-stone-400/80 bg-white/90 text-stone-500"
                : "border-white/35 bg-black/75 text-white/55",
            )}
            title="No physical sample in biobank yet"
          >
            <FormIcon form={item.form} className="size-3.5 opacity-70" />
            <span className="text-[6px] font-bold uppercase leading-tight tracking-wide">
              No sample
            </span>
          </span>
        ) : null}
        {item.speciesImageAttribution ? (
          <span className="absolute bottom-1 right-1 max-w-[70%] truncate rounded bg-black/55 px-1 text-[7px] text-white/70">
            {item.speciesImageAttribution}
          </span>
        ) : item.mediaCount > 1 ? (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-medium text-white">
            {item.mediaCount} photos
          </span>
        ) : null}
        {hasPhysicalSample ? (
          <span className="absolute right-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wide text-white/90 opacity-0 transition-opacity group-hover:opacity-100">
            View sample
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p
          className={cn(
            "text-sm font-black uppercase leading-tight",
            theme === "light" ? "text-stone-900" : "text-white",
          )}
        >
          {item.commonName || item.accessionCode}
        </p>
        <p
          className={cn(
            "text-[11px] italic",
            theme === "light" ? "text-stone-500" : "text-white/55",
          )}
        >
          {item.scientificName}
        </p>
        <div className="mt-auto flex items-center gap-1.5 pt-1">
          <HealthChip health={item.health} />
          <Chip>{item.category}</Chip>
        </div>
      </div>
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.4) }}
      className={cardClass}
    >
      {hasPhysicalSample ? (
        <button
          type="button"
          onClick={() => onOpenSample(item.accessionCode)}
          className="flex min-h-[44px] flex-1 flex-col text-left"
        >
          {inner}
        </button>
      ) : (
        inner
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
export function TissueView() {
  const curateMode = useCurateRoute();
  const { isCurator } = useTissueCurator();
  const theme = useTheme();

  const [view, setView] = useState<ViewId>("catalog");
  const [catalog, setCatalog] = useState<PublicBiobankItem[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [accessions, setAccessions] = useState<BiobankAccession[]>([]);
  const [replates, setReplates] = useState<BiobankAccession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [openCode, setOpenCode] = useState<string | null>(null);

  // Public catalog: fetched once, drives the hero + Catalog view (stable, so
  // the hero never empties/collapses on tab or filter changes).
  const loadCatalog = useCallback(async () => {
    try {
      setCatalog(await fetchPublicBiobankCatalog());
    } catch {
      setCatalog([]);
    } finally {
      setCatalogLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!curateMode) void loadCatalog();
  }, [curateMode, loadCatalog]);

  // Warm the 3D hero chunk while catalog loads so the fridge appears faster.
  useEffect(() => {
    if (curateMode) return;
    if (hasWebGL() && !prefersReducedMotion()) {
      void import("./tissue/BiobankVaultHero");
    }
  }, [curateMode]);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAccessions(await fetchBiobankAccessions());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load inventory");
      setAccessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // species lookup so Inventory search matches common/scientific names too
  const codeToSpecies = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of catalog) {
      m.set(
        c.accessionCode,
        `${c.commonName} ${c.scientificName} ${c.category}`.toLowerCase(),
      );
    }
    return m;
  }, [catalog]);

  const filterAccessions = useCallback(
    (list: BiobankAccession[]) => {
      const q = search.trim().toLowerCase();
      if (!q) return list;
      return list.filter(
        (a) =>
          a.accession_code.toLowerCase().includes(q) ||
          (codeToSpecies.get(a.accession_code)?.includes(q) ?? false) ||
          (a.description?.toLowerCase().includes(q) ?? false),
      );
    },
    [search, codeToSpecies],
  );

  const loadReplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReplates(await fetchReplatesDue(7));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load replates");
      setReplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (curateMode) return;
    if (view === "inventory") void loadInventory();
    if (view === "replates") void loadReplates();
  }, [curateMode, view, loadInventory, loadReplates]);

  /** Hero fridge: physical lab samples only (NAS cover photo), never catalog-only species. */
  const heroInventoryTiles: VaultTile[] = useMemo(
    () =>
      catalog
        .filter(
          (c) =>
            Boolean(c.coverServeUrl) &&
            c.status !== "reserved" &&
            c.status !== "archived",
        )
        .map((c) => ({
          code: c.accessionCode,
          src: mediaServeUrl(c.coverServeUrl) ?? "",
          label: c.commonName || c.scientificName,
          health: c.health,
          category: c.category,
        })),
    [catalog],
  );

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rank = (c: PublicBiobankItem) => {
      if (c.coverServeUrl && c.status === "stored") return 0;
      if (c.status === "stored") return 1;
      if (c.status === "reserved") return 2;
      return 3;
    };
    return catalog
      .filter((c) => {
        if (category !== "all" && c.category !== category) return false;
        if (!q) return true;
        return (
          c.commonName.toLowerCase().includes(q) ||
          c.scientificName.toLowerCase().includes(q) ||
          c.accessionCode.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const ra = rank(a);
        const rb = rank(b);
        if (ra !== rb) return ra - rb;
        return a.commonName.localeCompare(b.commonName, undefined, { sensitivity: "base" });
      });
  }, [catalog, category, search]);

  const reload = useCallback(() => {
    void loadCatalog();
    if (view === "inventory") void loadInventory();
    if (view === "replates") void loadReplates();
  }, [view, loadCatalog, loadInventory, loadReplates]);

  if (curateMode) {
    return (
      <TissueCuratorPanel
        onExitCatalog={() => {
          const url = new URL(window.location.href);
          url.searchParams.delete("curate");
          window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
          window.dispatchEvent(new PopStateEvent("popstate"));
        }}
      />
    );
  }

  const subtitle =
    view === "replates"
      ? "Units due (or overdue) for replating and slant recycling."
      : view === "inventory"
        ? "Every physical unit (accession) — each jar, dish, slant, or pod is QR-addressable."
        : "A living glass-vault mirror of the physical biobank. Click a specimen to open its live record.";

  const invList = useMemo(() => filterAccessions(accessions), [filterAccessions, accessions]);
  const replateList = useMemo(() => filterAccessions(replates), [filterAccessions, replates]);

  const countLabel =
    view === "catalog"
      ? `${filteredCatalog.length} species`
      : view === "inventory"
        ? `${invList.length} unit${invList.length === 1 ? "" : "s"}`
        : `${replateList.length} due`;

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-4 overflow-y-auto p-4 sm:gap-6 sm:p-6 lg:p-8">
      <HeroShell
        inventoryTiles={heroInventoryTiles}
        onSelect={(c) => setOpenCode(c)}
        onDeselect={() => setOpenCode(null)}
        selectedCode={openCode}
        subtitle={subtitle}
      />

      {/* view tabs + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className={cn(
            "flex flex-wrap gap-1 rounded-lg border p-1 backdrop-blur-md",
            theme === "light" ? "border-black/10 bg-white/50" : "border-white/10 bg-black/40",
          )}
        >
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={cn(
                "inline-flex min-h-[40px] items-center gap-2 rounded-md px-3 text-[10px] font-bold uppercase tracking-widest touch-manipulation transition-colors",
                view === v.id
                  ? "bg-myco-accent/15 text-myco-accent"
                  : theme === "light"
                    ? "text-stone-500 hover:text-stone-900"
                    : "text-dim hover:text-white",
              )}
            >
              <v.icon className="size-3.5" />
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className={cn(
              "inline-flex min-h-[44px] items-center gap-2 border px-4 text-[10px] font-bold uppercase tracking-widest touch-manipulation disabled:opacity-50",
              theme === "light"
                ? "border-black/15 text-stone-600 hover:text-stone-900"
                : "border-white/15 text-dim hover:text-white",
            )}
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Refresh
          </button>
          <a
            href="?curate=1"
            className="inline-flex min-h-[44px] items-center border border-myco-accent/40 px-4 text-[10px] font-bold uppercase tracking-widest text-myco-accent hover:bg-myco-accent/10 touch-manipulation"
          >
            Curator
          </a>
        </div>
      </div>

      {/* search + count */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-dim" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search species, common name, code…"
            className={cn(
              "min-h-[44px] w-full border py-3 pl-10 pr-4 text-base placeholder:text-dim",
              theme === "light"
                ? "border-black/10 bg-white/70 text-stone-900"
                : "border-white/10 bg-black/50 text-white",
            )}
          />
        </div>
        <p className="shrink-0 text-[10px] uppercase tracking-widest text-dim">{countLabel}</p>
      </div>

      {view === "catalog" ? (
        <div className="flex flex-wrap gap-2">
          {CATEGORY_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setCategory(chip.id)}
              className={cn(
                "min-h-[44px] border px-4 text-[10px] font-bold uppercase tracking-widest touch-manipulation",
                category === chip.id
                  ? "border-myco-accent bg-myco-accent/15 text-myco-accent"
                  : theme === "light"
                    ? "border-black/15 text-stone-500 hover:text-stone-900"
                    : "border-white/15 text-dim hover:text-white",
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {/* CATALOG (public, real species) */}
      {view === "catalog" ? (
        !catalogLoaded ? (
          <Loading label="Loading catalog…" />
        ) : filteredCatalog.length === 0 ? (
          <EmptyState
            title={catalog.length === 0 ? "Catalog is being populated" : "No matches"}
            body={
              catalog.length === 0
                ? "Public specimens will appear here as they are verified and published."
                : "Try a different category or search."
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredCatalog.map((item, i) => (
              <SpeciesCard
                key={item.accessionCode}
                item={item}
                index={i}
                theme={theme}
                onOpenSample={setOpenCode}
              />
            ))}
          </div>
        )
      ) : view === "inventory" ? (
        <>
          <p className="text-[11px] text-dim">
            <strong className="text-white/70">Accession</strong> = one physical unit (a jar,
            petri dish, slant, or grow-pod). Code <span className="font-mono">SPECIES-VARIANT-####</span>{" "}
            resolves to its QR record. The Catalog groups these by species.
          </p>
          {loading ? (
            <Loading label="Loading inventory…" />
          ) : (
            <AccessionsGrid accessions={invList} loading={loading} onOpen={setOpenCode} />
          )}
        </>
      ) : loading ? (
        <Loading label="Loading replates…" />
      ) : (
        <AccessionsGrid
          accessions={replateList}
          loading={loading}
          onOpen={setOpenCode}
          emptyHint="Nothing due in the next 7 days. Replate ETAs roll automatically when you log a transfer."
        />
      )}

      <AccessionDetailDrawer
        code={openCode}
        canEdit={isCurator}
        onClose={() => setOpenCode(null)}
        onChanged={reload}
      />
    </div>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-24 text-dim">
      <Loader2 className="size-5 animate-spin" />
      <span className="text-xs uppercase tracking-widest">{label}</span>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/40 p-8 text-center sm:p-12">
      <Microscope className="mx-auto mb-4 size-12 text-dim/50" aria-hidden />
      <p className="text-lg font-bold uppercase text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-dim">{body}</p>
    </div>
  );
}
