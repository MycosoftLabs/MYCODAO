import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Calendar,
  FolderOpen,
  HardDrive,
  Heading,
  Image,
  Loader2,
  LogOut,
  Radio,
  RefreshCw,
  Save,
  Tv,
  User,
  Video,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useNewsProducer, type BroadcastTalentLine } from "../hooks/useNewsProducer";
import { useProducerAuth } from "../hooks/useProducerAuth";
import {
  useProducerNas,
  type BlocksMediaAsset,
  type NewsChannelSchedule,
  type ScheduleSlot,
} from "../hooks/useProducerNas";
import { pulseApiUrl } from "../lib/apiOrigin";
import { listMarketsNowAssetOptions } from "../lib/liveStreamData";
import { prefetchPulseNewsBundle } from "../lib/pulseNewsPrefetch";
import { loadMarketsSnapshot } from "../lib/pulseMarketsStore";
import type { PulseTicker } from "../lib/pulseApi";
import type { StudioMarketIndex } from "../data/studioPresets";
import { NasGraphicsPicker } from "./NasGraphicsPicker";

interface ProducerDashboardProps {
  onExit: () => void;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CORE_TITLE_PRESET_IDS = new Set([
  "blocks-live",
  "mycodao-morning",
  "markets-now",
  "fungi-desk",
  "partner-segment",
]);
const CATEGORIES = [
  "commercials",
  "shows",
  "live-streams",
  "graphics",
  "bumpers",
] as const;

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProducerDashboard({ onExit }: ProducerDashboardProps) {
  const auth = useProducerAuth();
  const { view, presets, loading, error, patch, reload } = useNewsProducer({
    includePresets: true,
    accessToken: auth.accessToken,
  });
  const nas = useProducerNas();
  const [authError, setAuthError] = useState<string | null>(null);
  const [authOk, setAuthOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<
    | "overview"
    | "nas"
    | "schedule"
    | "title"
    | "talent"
    | "program"
    | "liveData"
  >("overview");
  const [catalogTickers, setCatalogTickers] = useState<PulseTicker[]>([]);
  const [catalogIndices, setCatalogIndices] = useState<StudioMarketIndex[]>([]);
  const [customName, setCustomName] = useState("");
  const [customRoles, setCustomRoles] = useState("");
  const [customTitleText, setCustomTitleText] = useState("");
  const [customVideoUrl, setCustomVideoUrl] = useState("");
  const [nasFilter, setNasFilter] = useState<string>("all");
  const [scheduleDraft, setScheduleDraft] = useState<NewsChannelSchedule | null>(
    null,
  );

  useEffect(() => {
    if (nas.schedule) setScheduleDraft(nas.schedule);
  }, [nas.schedule]);

  useEffect(() => {
    const snap = loadMarketsSnapshot();
    if (snap) {
      setCatalogTickers(snap.tickers ?? []);
      setCatalogIndices(snap.marketIndices ?? []);
    }
    void prefetchPulseNewsBundle().then((bundle) => {
      if (!bundle) return;
      setCatalogTickers(bundle.tickers);
      setCatalogIndices(bundle.marketIndices);
    });
  }, []);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      setAuthOk(false);
      return;
    }
    let cancelled = false;
    void auth.verifySession().then((result) => {
      if (cancelled) return;
      setAuthOk(result.ok);
      if (result.ok) setAuthError(null);
      else setAuthError(result.message);
    });
    return () => {
      cancelled = true;
    };
  }, [auth.isAuthenticated, auth.accessToken, auth.verifySession]);

  const filteredAssets = useMemo(() => {
    if (nasFilter === "all") return nas.assets;
    return nas.assets.filter((a) => a.category === nasFilter);
  }, [nas.assets, nasFilter]);

  const assetCatalog = useMemo(
    () => listMarketsNowAssetOptions(catalogIndices, catalogTickers),
    [catalogIndices, catalogTickers],
  );

  const assetCatalogByCategory = useMemo(() => {
    const groups = new Map<string, typeof assetCatalog>();
    for (const item of assetCatalog) {
      const list = groups.get(item.categoryId) ?? [];
      list.push(item);
      groups.set(item.categoryId, list);
    }
    return groups;
  }, [assetCatalog]);

  const selectedLiveDataAssetIds = view?.liveStreamDataAssetIds ?? [];

  const liveDataGraphics = useMemo(
    () =>
      nas.assets.filter(
        (a) => a.kind === "graphic" || a.category === "graphics",
      ),
    [nas.assets],
  );

  const coreTitlePresets = useMemo(
    () =>
      (presets?.title ?? []).filter((t) => CORE_TITLE_PRESET_IDS.has(t.id)),
    [presets?.title],
  );

  const showTitlePresets = useMemo(
    () =>
      (presets?.title ?? []).filter((t) => !CORE_TITLE_PRESET_IDS.has(t.id)),
    [presets?.title],
  );

  const controlsLocked = !auth.isAuthenticated || !authOk;

  async function runPatch(body: Record<string, unknown>) {
    const token = (await auth.getAccessToken()) ?? auth.accessToken;
    if (!token) {
      setAuthError("Sign in with Google (authorized producer account) first");
      return;
    }
    setBusy(true);
    setAuthError(null);
    try {
      await patch(body, { accessToken: token });
      setAuthOk(true);
      await nas.reload();
    } catch (e) {
      setAuthOk(false);
      setAuthError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function setTalentPreset(id: string) {
    await runPatch({ activeTalentPresetId: id, customTalent: null });
  }

  async function setTitlePreset(id: string) {
    await runPatch({
      activeTitlePresetId: id,
      customTitleText: null,
    });
  }

  async function applyCustomTitle() {
    const text = customTitleText.trim();
    if (!text) return;
    await runPatch({
      customTitleText: text,
      activeTitlePresetId: null,
    });
  }

  async function setTitleLogo(relPath: string) {
    await runPatch({ customTitleLogoNasPath: relPath });
  }

  async function clearTitleLogo() {
    await runPatch({ clearTitleBarLogo: true });
  }

  async function applyCustomTalent() {
    const name = customName.trim();
    if (!name) return;
    const roles = customRoles
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);
    const lines: BroadcastTalentLine[] = [
      {
        name,
        roles: roles.length ? roles : ["On Air"],
        creditLine: `${name}${roles.length ? ` · ${roles.join(" · ")}` : ""}`,
      },
    ];
    await runPatch({ customTalent: lines, activeTalentPresetId: null });
  }

  async function fireProgram(id: string) {
    await runPatch({ fireProgramPresetId: id });
  }

  async function returnToLive() {
    await runPatch({ returnToLive: true });
  }

  async function fireCustomProgram() {
    const url = customVideoUrl.trim();
    if (!url) return;
    await runPatch({
      programOverride: {
        label: "Custom",
        type: "recorded",
        videoUrl: url,
      },
    });
  }

  async function fireNasAsset(asset: BlocksMediaAsset) {
    if (asset.kind === "graphic") {
      await runPatch({
        fireNasAsset: {
          relPath: asset.relPath,
          label: asset.fileName,
          category: asset.category,
        },
      });
      return;
    }
    await runPatch({
      fireNasAsset: {
        relPath: asset.relPath,
        label: asset.fileName,
        category: asset.category,
      },
    });
  }

  async function clearGraphic() {
    await runPatch({ clearGraphic: true });
  }

  async function toggleLiveDataAsset(id: string) {
    const current = new Set(selectedLiveDataAssetIds);
    if (current.has(id)) {
      current.delete(id);
    } else {
      if (current.size >= 3) return;
      current.add(id);
    }
    await runPatch({ liveStreamDataAssetIds: Array.from(current) });
  }

  async function clearLiveDataAssets() {
    await runPatch({ liveStreamDataAssetIds: [] });
  }

  async function setLiveDataMarketing(relPath: string) {
    await runPatch({ liveStreamDataMarketingNasPath: relPath });
  }

  async function clearLiveDataMarketing() {
    await runPatch({ clearLiveStreamDataMarketing: true });
  }

  function updateSlot(index: number, patchSlot: Partial<ScheduleSlot>) {
    if (!scheduleDraft) return;
    const slots = [...scheduleDraft.slots];
    slots[index] = { ...slots[index], ...patchSlot };
    setScheduleDraft({ ...scheduleDraft, slots });
  }

  function addSlot() {
    if (!scheduleDraft) return;
    const slots = [
      ...scheduleDraft.slots,
      {
        id: `slot-${Date.now()}`,
        type: "commercial",
        label: "New slot",
        nasPath: "",
        days: [1, 2, 3, 4, 5],
        start: "12:00",
        end: "12:05",
        priority: 10,
      },
    ];
    setScheduleDraft({ ...scheduleDraft, slots });
  }

  function removeSlot(index: number) {
    if (!scheduleDraft) return;
    const slots = scheduleDraft.slots.filter((_, i) => i !== index);
    setScheduleDraft({ ...scheduleDraft, slots });
  }

  async function saveScheduleDraft() {
    if (!scheduleDraft) return;
    if (!auth.accessToken) {
      setAuthError("Sign in with Google (authorized producer account) first");
      return;
    }
    setBusy(true);
    setAuthError(null);
    try {
      await nas.saveSchedule(scheduleDraft, auth.accessToken);
      setAuthOk(true);
      await reload();
    } catch (e) {
      setAuthOk(false);
      setAuthError(e instanceof Error ? e.message : "Schedule save failed");
    } finally {
      setBusy(false);
    }
  }

  const nasWebUrl =
    (nas.nasConfig?.webDriveUrl as string | undefined) ??
    "https://192.168.0.105/drive/shared-drives/MYCODAO/BLOCKS";

  return (
    <div className="flex min-h-dvh h-dvh flex-col bg-[#050505] text-white overflow-hidden">
      <header className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 bg-[#0a0a0a]">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onExit}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-sm border border-white/15 hover:bg-white/5 touch-manipulation"
            aria-label="Exit producer dashboard"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#5eb3ff]">
              BLOCKS Producer
            </p>
            <h1 className="text-sm sm:text-base font-black uppercase tracking-wide">
              Live Control · NAS
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {view ? (
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/50 hidden sm:inline">
              Updated {new Date(view.updatedAt).toLocaleTimeString()}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => {
              void reload();
              void nas.reload();
            }}
            disabled={loading || busy}
            className="min-h-[44px] px-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest border border-white/15 hover:bg-white/5 touch-manipulation disabled:opacity-50"
          >
            <RefreshCw
              className={cn(
                "size-4",
                (loading || nas.loading) && "animate-spin",
              )}
            />
            Sync
          </button>
        </div>
      </header>

      <nav className="shrink-0 flex overflow-x-auto border-b border-white/10 bg-[#080808] px-2 gap-1">
        {(
          [
            ["overview", "Overview", Radio],
            ["talent", "Talent", User],
            ["liveData", "Live Data", Activity],
            ["title", "Title", Heading],
            ["program", "Program", Tv],
            ["schedule", "Scheduler", Calendar],
            ["nas", "NAS Library", HardDrive],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "min-h-[44px] shrink-0 px-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border-b-2 touch-manipulation",
              tab === id
                ? "border-[#5eb3ff] text-[#5eb3ff]"
                : "border-transparent text-white/50 hover:text-white/80",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-5xl mx-auto w-full">
        <section className="border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">
            Producer sign-in
          </p>
          <p className="text-xs text-white/60">
            Producer controls only — sign in with Google. Your session stays in
            this browser until you sign out. Approved accounts only (allowlist
            on server).
          </p>
          {auth.isAuthenticated && auth.userEmail ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-sm text-emerald-400 font-bold flex-1">
                Signed in as {auth.userEmail}
                {authOk ? " · controls unlocked" : " · verifying…"}
              </p>
              <button
                type="button"
                onClick={() => void auth.signOut()}
                disabled={busy || auth.signingIn}
                className="min-h-[48px] px-4 flex items-center justify-center gap-2 border border-white/20 text-[10px] font-black uppercase tracking-widest touch-manipulation disabled:opacity-50"
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void auth.signInWithGoogle()}
              disabled={busy || auth.signingIn || auth.loading}
              className="w-full sm:w-auto min-h-[48px] px-6 flex items-center justify-center gap-3 bg-white text-black text-[11px] font-black uppercase tracking-widest touch-manipulation disabled:opacity-50"
            >
              {auth.signingIn || auth.loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <svg
                  className="size-5 shrink-0"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              Continue with Google
            </button>
          )}
          {auth.statusMessage ? (
            <p className="text-xs text-[#5eb3ff] font-bold">{auth.statusMessage}</p>
          ) : null}
          {auth.error ? (
            <p className="text-xs text-red-400 font-bold">{auth.error}</p>
          ) : null}
          {authError ? (
            <p className="text-xs text-red-400 font-bold">{authError}</p>
          ) : null}
          {controlsLocked ? (
            <p className="text-xs text-amber-300/90 font-bold">
              Controls locked until you sign in with an authorized Google account.
            </p>
          ) : null}
        </section>

        {tab === "overview" ? (
          <>
            <section className="border border-[#0055cc]/50 bg-[#0055cc]/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#5eb3ff] mb-3 flex items-center gap-2">
                <Radio className="size-4" />
                On air now
              </p>
              {loading && !view ? (
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <Loader2 className="size-4 animate-spin" />
                  Loading…
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[9px] font-bold uppercase text-white/50 mb-2">
                      Talent
                    </p>
                    <p className="font-black uppercase">
                      {view?.talentPresetLabel ?? "—"}
                    </p>
                    {(view?.talent ?? []).map((t) => (
                      <p key={t.name} className="text-[11px] text-white/70">
                        {t.name} · {t.roles.join(" · ")}
                      </p>
                    ))}
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase text-white/50 mb-2">
                      Title bar
                    </p>
                    <p className="font-black uppercase">
                      {view?.titlePresetLabel ?? "—"}
                    </p>
                    <p className="text-[11px] text-white/70 mt-1">
                      {view?.titleBarText ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase text-white/50 mb-2">
                      Program
                    </p>
                    <p className="font-black uppercase">
                      {view?.programMode === "schedule"
                        ? "Schedule / Live"
                        : view?.programLabel ?? view?.programMode}
                    </p>
                    <p className="text-[10px] text-white/60 mt-1">
                      {view?.programMediaUrl
                        ? `NAS: ${view.programNasPath ?? "file"}`
                        : view?.programEmbedUrl
                          ? "YouTube override"
                          : "Following schedule"}
                    </p>
                    {view?.programGraphicUrl ? (
                      <p className="text-[10px] text-amber-300 mt-1">
                        Graphic: {view.activeGraphicNasPath}
                      </p>
                    ) : null}
                    {nas.programNow?.nextChangeAt ? (
                      <p className="text-[10px] text-white/40 mt-2">
                        Next change:{" "}
                        {new Date(
                          String(nas.programNow.nextChangeAt),
                        ).toLocaleTimeString()}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase text-white/50 mb-2">
                      Live stream data
                    </p>
                    <p className="font-black uppercase text-[11px]">
                      {selectedLiveDataAssetIds.length
                        ? selectedLiveDataAssetIds
                            .map(
                              (id) =>
                                assetCatalog.find((a) => a.id === id)?.label ??
                                id,
                            )
                            .join(" · ")
                        : "Auto (news + BTC/ETH/SOL)"}
                    </p>
                    {view?.liveStreamDataMarketingImageUrl ? (
                      <p className="text-[10px] text-amber-300 mt-1">
                        Marketing logo on air
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
              {error ? (
                <p className="text-xs text-red-400 mt-2">{error}</p>
              ) : null}
            </section>

            <section className="border border-white/10 p-4 bg-black/40">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-3 flex items-center gap-2">
                <HardDrive className="size-4" />
                NAS status
              </p>
              {nas.nasStatus ? (
                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  <p>
                    <span className="text-white/50">Root:</span>{" "}
                    <code className="text-[10px] break-all">
                      {nas.nasStatus.root}
                    </code>
                  </p>
                  <p>
                    <span className="text-white/50">Available:</span>{" "}
                    {nas.nasStatus.available ? (
                      <span className="text-emerald-400">Yes</span>
                    ) : (
                      <span className="text-red-400">No</span>
                    )}
                  </p>
                  <p>
                    <span className="text-white/50">Assets:</span>{" "}
                    {nas.nasStatus.totalAssets}
                  </p>
                  {nas.nasStatus.error ? (
                    <p className="text-red-400 sm:col-span-2">
                      {nas.nasStatus.error}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-white/50">Scanning…</p>
              )}
              <a
                href={nasWebUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-3 text-[10px] font-bold uppercase tracking-widest text-[#5eb3ff] underline"
              >
                Open NAS BLOCKS folder
              </a>
            </section>

            <button
              type="button"
              disabled={busy || controlsLocked}
              onClick={() => void returnToLive()}
              className="w-full min-h-[52px] bg-white text-black text-[11px] font-black uppercase tracking-[0.2em] touch-manipulation disabled:opacity-50"
            >
              Return to live / schedule
            </button>
          </>
        ) : null}

        {tab === "nas" ? (
          <section className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setNasFilter("all")}
                className={cn(
                  "min-h-[44px] px-4 text-[10px] font-black uppercase border touch-manipulation",
                  nasFilter === "all"
                    ? "border-[#5eb3ff] bg-[#5eb3ff]/15"
                    : "border-white/15",
                )}
              >
                All ({nas.assets.length})
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNasFilter(c)}
                  className={cn(
                    "min-h-[44px] px-4 text-[10px] font-black uppercase border touch-manipulation",
                    nasFilter === c
                      ? "border-[#5eb3ff] bg-[#5eb3ff]/15"
                      : "border-white/15",
                  )}
                >
                  {c} ({nas.nasStatus?.categories?.[c] ?? 0})
                </button>
              ))}
            </div>

            <p className="text-xs text-white/50">
              Drop files into NAS folders:{" "}
              <code>commercials/</code>, <code>shows/</code>,{" "}
              <code>live-streams/</code>, <code>graphics/</code>,{" "}
              <code>bumpers/</code> — then Sync.
            </p>

            {!nas.nasStatus?.available ? (
              <div className="border border-red-500/40 bg-red-500/10 p-4 text-sm">
                <p className="font-bold text-red-300">NAS not mounted</p>
                <p className="text-xs text-white/70 mt-2">
                  Windows dev: run <code>npm run mount:nas</code> from the
                  MYCODAO repo (loads <code>NAS_SMB_PASSWORD</code> from{" "}
                  <code>.credentials.local</code>). Or set{" "}
                  <code>BLOCKS_NAS_ROOT</code> to a mounted UNC path. Offline
                  fallback: <code>data/blocks-nas-dev/</code> when the share is
                  down.
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              {filteredAssets.length === 0 ? (
                <p className="text-sm text-white/40 py-8 text-center">
                  No assets in this category. Upload to NAS and Sync.
                </p>
              ) : (
                filteredAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 border border-white/10 p-3 bg-black/30"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {asset.kind === "graphic" ? (
                        <Image className="size-5 shrink-0 text-amber-400 mt-0.5" />
                      ) : (
                        <Video className="size-5 shrink-0 text-[#5eb3ff] mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase truncate">
                          {asset.fileName}
                        </p>
                        <p className="text-[9px] text-white/45 uppercase">
                          {asset.category} · {formatBytes(asset.sizeBytes)} ·{" "}
                          {new Date(asset.modifiedAt).toLocaleString()}
                        </p>
                        <p className="text-[9px] text-white/30 truncate font-mono">
                          {asset.relPath}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <a
                        href={pulseApiUrl(asset.serveUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="min-h-[44px] px-3 flex items-center text-[9px] font-bold uppercase border border-white/20 touch-manipulation"
                      >
                        Preview
                      </a>
                      <button
                        type="button"
                        disabled={busy || controlsLocked}
                        onClick={() => void fireNasAsset(asset)}
                        className="min-h-[44px] px-4 bg-[#0055cc] text-[10px] font-black uppercase touch-manipulation disabled:opacity-50"
                      >
                        {asset.kind === "graphic" ? "Overlay" : "Cut to air"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {view?.activeGraphicNasPath ? (
              <button
                type="button"
                disabled={busy || controlsLocked}
                onClick={() => void clearGraphic()}
                className="w-full min-h-[48px] border border-amber-400/50 text-amber-300 text-[10px] font-black uppercase touch-manipulation"
              >
                Clear graphic overlay
              </button>
            ) : null}
          </section>
        ) : null}

        {tab === "schedule" && scheduleDraft ? (
          <section className="space-y-4">
            <p className="text-xs text-white/60">
              Timezone: <strong>{scheduleDraft.timezone}</strong>. Slots use{" "}
              <code>nasPath</code> (e.g.{" "}
              <code>commercials/mycodao-15s.mp4</code>) or YouTube fields.
              Higher priority wins overlaps.
            </p>

            <div className="border border-white/10 p-4 space-y-3 bg-black/30">
              <p className="text-[10px] font-bold uppercase text-white/50">
                Default source
              </p>
              <input
                value={scheduleDraft.defaultSource.label}
                onChange={(e) =>
                  setScheduleDraft({
                    ...scheduleDraft,
                    defaultSource: {
                      ...scheduleDraft.defaultSource,
                      label: e.target.value,
                    },
                  })
                }
                placeholder="Label"
                className="w-full h-12 px-4 text-base bg-black border border-white/20"
              />
              <input
                value={scheduleDraft.defaultSource.nasPath ?? ""}
                onChange={(e) =>
                  setScheduleDraft({
                    ...scheduleDraft,
                    defaultSource: {
                      ...scheduleDraft.defaultSource,
                      nasPath: e.target.value,
                    },
                  })
                }
                placeholder="NAS path (optional)"
                className="w-full h-12 px-4 text-base bg-black border border-white/20 font-mono text-sm"
              />
              <input
                value={scheduleDraft.defaultSource.videoUrl ?? ""}
                onChange={(e) =>
                  setScheduleDraft({
                    ...scheduleDraft,
                    defaultSource: {
                      ...scheduleDraft.defaultSource,
                      videoUrl: e.target.value,
                    },
                  })
                }
                placeholder="YouTube URL (optional)"
                className="w-full h-12 px-4 text-base bg-black border border-white/20"
              />
            </div>

            {scheduleDraft.slots.map((slot, index) => (
              <div
                key={slot.id}
                className="border border-white/10 p-4 space-y-2 bg-black/20"
              >
                <div className="flex justify-between items-center gap-2">
                  <p className="text-[10px] font-black uppercase text-[#5eb3ff]">
                    Slot {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeSlot(index)}
                    className="text-[9px] text-red-400 uppercase font-bold min-h-[44px] px-2 touch-manipulation"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <input
                    value={slot.label}
                    onChange={(e) =>
                      updateSlot(index, { label: e.target.value })
                    }
                    placeholder="Label"
                    className="h-12 px-4 text-base bg-black border border-white/20"
                  />
                  <select
                    value={slot.type}
                    onChange={(e) =>
                      updateSlot(index, { type: e.target.value })
                    }
                    className="h-12 px-4 text-base bg-black border border-white/20"
                  >
                    <option value="commercial">commercial</option>
                    <option value="youtube_video">youtube_video</option>
                    <option value="youtube_live_channel">
                      youtube_live_channel
                    </option>
                    <option value="partner_stream">partner_stream</option>
                    <option value="recorded">recorded</option>
                  </select>
                  <input
                    value={slot.start ?? ""}
                    onChange={(e) =>
                      updateSlot(index, { start: e.target.value })
                    }
                    placeholder="Start HH:mm"
                    className="h-12 px-4 text-base bg-black border border-white/20"
                  />
                  <input
                    value={slot.end ?? ""}
                    onChange={(e) => updateSlot(index, { end: e.target.value })}
                    placeholder="End HH:mm"
                    className="h-12 px-4 text-base bg-black border border-white/20"
                  />
                  <input
                    value={slot.nasPath ?? ""}
                    onChange={(e) =>
                      updateSlot(index, { nasPath: e.target.value })
                    }
                    placeholder="NAS path"
                    className="h-12 px-4 text-base bg-black border border-white/20 font-mono text-sm sm:col-span-2"
                  />
                  <input
                    value={String(slot.priority ?? 0)}
                    onChange={(e) =>
                      updateSlot(index, {
                        priority: Number(e.target.value) || 0,
                      })
                    }
                    placeholder="Priority"
                    className="h-12 px-4 text-base bg-black border border-white/20"
                  />
                  <input
                    value={(slot.days ?? []).join(",")}
                    onChange={(e) =>
                      updateSlot(index, {
                        days: e.target.value
                          .split(",")
                          .map((d) => Number(d.trim()))
                          .filter((n) => !Number.isNaN(n)),
                      })
                    }
                    placeholder="Days 0-6 comma-separated"
                    className="h-12 px-4 text-base bg-black border border-white/20"
                  />
                  <select
                    value={slot.titlePresetId ?? ""}
                    onChange={(e) =>
                      updateSlot(index, {
                        titlePresetId: e.target.value || undefined,
                      })
                    }
                    className="h-12 px-4 text-base bg-black border border-white/20 sm:col-span-2"
                  >
                    <option value="">Title preset (auto from label)</option>
                    {(presets?.title ?? []).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                        {t.logoNasPath ? ` · ${t.logoNasPath}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[9px] text-white/35">
                  Days: {DAY_LABELS.map((d, i) => `${i}=${d}`).join(", ")}
                </p>
              </div>
            ))}

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={addSlot}
                className="min-h-[48px] px-4 border border-white/20 text-[10px] font-black uppercase touch-manipulation"
              >
                Add slot
              </button>
              <button
                type="button"
                disabled={busy || controlsLocked}
                onClick={() => void saveScheduleDraft()}
                className="flex-1 min-h-[48px] bg-[#0055cc] text-[10px] font-black uppercase touch-manipulation disabled:opacity-50"
              >
                Save schedule to server
              </button>
            </div>
          </section>
        ) : null}

        {tab === "title" ? (
          <section className="space-y-3">
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/70 flex items-center gap-2">
              <Heading className="size-4" />
              Title bar — show / segment / stream
            </h2>
            <p className="text-xs text-white/50">
              Top bar above the video (logo left, title right). Periodic shows
              sync title + logo from NAS{" "}
              <code className="text-[10px]">graphics/shows/</code> when fired
              from Program, NAS Library, or Schedule.
            </p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/45">
              Core segments
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {coreTitlePresets.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={busy || controlsLocked}
                  onClick={() => void setTitlePreset(t.id)}
                  className={cn(
                    "min-h-[52px] px-4 py-3 text-left border touch-manipulation transition-colors disabled:opacity-50",
                    view?.titlePresetId === t.id
                      ? "border-[#0055cc] bg-[#0055cc]/25 text-white"
                      : "border-white/15 hover:bg-white/5 text-white/90",
                  )}
                >
                  <p className="text-[11px] font-black uppercase">{t.label}</p>
                </button>
              ))}
            </div>
            {showTitlePresets.length ? (
              <>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#5eb3ff] pt-2">
                  Periodic shows (title + NAS logo)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {showTitlePresets.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      disabled={busy || controlsLocked}
                      onClick={() => void setTitlePreset(t.id)}
                      className={cn(
                        "min-h-[56px] px-4 py-3 text-left border touch-manipulation transition-colors disabled:opacity-50",
                        view?.titlePresetId === t.id
                          ? "border-[#0055cc] bg-[#0055cc]/25 text-white"
                          : "border-white/15 hover:bg-white/5 text-white/90",
                      )}
                    >
                      <p className="text-[11px] font-black uppercase">
                        {t.label}
                      </p>
                      {t.logoNasPath ? (
                        <p className="text-[9px] text-white/40 font-mono truncate mt-0.5">
                          {t.logoNasPath}
                        </p>
                      ) : null}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
            <div className="border border-white/10 p-4 space-y-3 bg-black/40">
              <input
                value={customTitleText}
                onChange={(e) => setCustomTitleText(e.target.value)}
                placeholder="Custom title (segment, program, or stream)"
                className="w-full h-12 px-4 text-base bg-black border border-white/20"
              />
              <button
                type="button"
                disabled={busy || controlsLocked || !customTitleText.trim()}
                onClick={() => void applyCustomTitle()}
                className="w-full min-h-[48px] bg-[#0055cc] text-white text-[10px] font-black uppercase touch-manipulation disabled:opacity-50"
              >
                Push custom title
              </button>
            </div>
            <NasGraphicsPicker
              title="Title bar logo (optional)"
              description="Pick from NAS graphics/ (same folder as Live Stream Data). Works with presets or custom titles; square or wide logos scale to fit."
              graphics={liveDataGraphics}
              selectedRelPath={view?.titleBarLogoNasPath ?? null}
              previewImageUrl={view?.titleBarLogoUrl ?? null}
              busy={busy}
              disabled={controlsLocked}
              onSelect={(relPath) => void setTitleLogo(relPath)}
              onClear={() => void clearTitleLogo()}
            />
          </section>
        ) : null}

        {tab === "talent" ? (
          <section className="space-y-3">
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/70 flex items-center gap-2">
              <User className="size-4" />
              Talent — tap to push on air
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(presets?.talent ?? []).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={busy || controlsLocked}
                  onClick={() => void setTalentPreset(t.id)}
                  className={cn(
                    "min-h-[52px] px-3 py-3 text-left text-[11px] font-black uppercase tracking-wide border touch-manipulation transition-colors disabled:opacity-50",
                    view?.talentPresetId === t.id
                      ? t.id === "none"
                        ? "border-white/40 bg-white/10 text-white/80"
                        : "border-[#0055cc] bg-[#0055cc]/25 text-white"
                      : "border-white/15 hover:bg-white/5 text-white/90",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="border border-white/10 p-4 space-y-3 bg-black/40">
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Name"
                className="w-full h-12 px-4 text-base bg-black border border-white/20"
              />
              <input
                value={customRoles}
                onChange={(e) => setCustomRoles(e.target.value)}
                placeholder="Roles, comma-separated"
                className="w-full h-12 px-4 text-base bg-black border border-white/20"
              />
              <button
                type="button"
                disabled={busy || controlsLocked || !customName.trim()}
                onClick={() => void applyCustomTalent()}
                className="w-full min-h-[48px] bg-[#0055cc] text-white text-[10px] font-black uppercase touch-manipulation disabled:opacity-50"
              >
                Push custom tag
              </button>
            </div>
          </section>
        ) : null}

        {tab === "liveData" ? (
          <section className="space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/70 flex items-center gap-2">
              <Activity className="size-4" />
              Live stream data — on-air widget
            </h2>
            <p className="text-xs text-white/50">
              Pick up to three Markets Now instruments to cycle in the LIVE
              STREAM DATA widget (desktop, top-left). Leave empty for automatic
              rotation from headlines and BTC/ETH/SOL. Changes apply on air
              within seconds.
            </p>

            <div className="border border-white/10 p-4 bg-black/40 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase text-white/50">
                  Selected ({selectedLiveDataAssetIds.length}/3)
                </p>
                <button
                  type="button"
                  disabled={busy || controlsLocked || !selectedLiveDataAssetIds.length}
                  onClick={() => void clearLiveDataAssets()}
                  className="min-h-[44px] px-3 text-[9px] font-black uppercase border border-white/20 touch-manipulation disabled:opacity-40"
                >
                  Clear · use auto
                </button>
              </div>
              {selectedLiveDataAssetIds.length ? (
                <div className="flex flex-wrap gap-2">
                  {selectedLiveDataAssetIds.map((id) => (
                    <span
                      key={id}
                      className="px-3 py-2 text-[10px] font-black uppercase bg-[#0055cc]/30 border border-[#5eb3ff]/50"
                    >
                      {assetCatalog.find((a) => a.id === id)?.label ?? id}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/40">No producer override — auto mode.</p>
              )}
            </div>

            {Array.from(assetCatalogByCategory.entries()).map(([catId, items]) => (
              <div key={catId} className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#5eb3ff]">
                  {items[0]?.categoryLabel ?? catId}
                </p>
                <div className="flex flex-wrap gap-2">
                  {items.map((item) => {
                    const selected = selectedLiveDataAssetIds.includes(item.id);
                    const atMax =
                      !selected && selectedLiveDataAssetIds.length >= 3;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={busy || controlsLocked || atMax}
                        onClick={() => void toggleLiveDataAsset(item.id)}
                        className={cn(
                          "min-h-[44px] px-3 py-2 text-left text-[10px] font-black uppercase border touch-manipulation transition-colors disabled:opacity-40",
                          selected
                            ? "border-[#0055cc] bg-[#0055cc]/25 text-white"
                            : "border-white/15 hover:bg-white/5 text-white/85",
                        )}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <NasGraphicsPicker
              title="Marketing logo (optional)"
              description="PNG/SVG/WebP from NAS graphics/. Any aspect ratio scales to fit the Live Stream Data widget automatically."
              graphics={liveDataGraphics}
              selectedRelPath={view?.liveStreamDataMarketingNasPath ?? null}
              previewImageUrl={view?.liveStreamDataMarketingImageUrl ?? null}
              busy={busy}
              disabled={controlsLocked}
              onSelect={(relPath) => void setLiveDataMarketing(relPath)}
              onClear={() => void clearLiveDataMarketing()}
            />
          </section>
        ) : null}

        {tab === "program" ? (
          <section className="space-y-3">
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/70 flex items-center gap-2">
              <Tv className="size-4" />
              Program — presets & YouTube
            </h2>
            <button
              type="button"
              disabled={busy || controlsLocked}
              onClick={() => void returnToLive()}
              className="w-full min-h-[52px] bg-white text-black text-[11px] font-black uppercase tracking-[0.2em] touch-manipulation disabled:opacity-50"
            >
              Return to live
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(presets?.program ?? []).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={
                    busy ||
                    controlsLocked ||
                    (p.type !== "live" && !p.hasSource)
                  }
                  onClick={() => void fireProgram(p.id)}
                  className={cn(
                    "min-h-[52px] px-4 py-3 text-left border touch-manipulation disabled:opacity-40",
                    view?.activeProgramPresetId === p.id
                      ? "border-amber-400 bg-amber-400/10"
                      : "border-white/15 hover:bg-white/5",
                  )}
                >
                  <p className="text-[11px] font-black uppercase">{p.label}</p>
                  <p className="text-[9px] text-white/50 uppercase mt-0.5">
                    {p.type}
                  </p>
                </button>
              ))}
            </div>
            <div className="border border-white/10 p-4 space-y-3 bg-black/40">
              <input
                value={customVideoUrl}
                onChange={(e) => setCustomVideoUrl(e.target.value)}
                placeholder="YouTube URL"
                className="w-full h-12 px-4 text-base bg-black border border-white/20"
              />
              <button
                type="button"
                disabled={busy || controlsLocked || !customVideoUrl.trim()}
                onClick={() => void fireCustomProgram()}
                className="w-full min-h-[48px] border border-white/30 text-[10px] font-black uppercase touch-manipulation disabled:opacity-50"
              >
                Cut to URL
              </button>
            </div>
            <p className="text-[9px] text-white/35 flex items-center gap-2">
              <FolderOpen className="size-3" />
              For NAS commercials/shows use the NAS Library tab
            </p>
          </section>
        ) : null}

        <p className="text-[9px] text-white/35 uppercase tracking-widest pb-8 text-center">
          NAS: MYCODAO/BLOCKS · Scheduler: data/news-channel-schedule.json
        </p>
      </div>

      {busy ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center pointer-events-none">
          <Loader2 className="size-8 animate-spin text-[#5eb3ff]" />
        </div>
      ) : null}
    </div>
  );
}
