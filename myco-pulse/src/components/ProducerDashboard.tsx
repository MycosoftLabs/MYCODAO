import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  FolderOpen,
  HardDrive,
  Image,
  Loader2,
  LogOut,
  Mail,
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

interface ProducerDashboardProps {
  onExit: () => void;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
    "overview" | "nas" | "schedule" | "talent" | "program"
  >("overview");
  const [customName, setCustomName] = useState("");
  const [customRoles, setCustomRoles] = useState("");
  const [customVideoUrl, setCustomVideoUrl] = useState("");
  const [nasFilter, setNasFilter] = useState<string>("all");
  const [scheduleDraft, setScheduleDraft] = useState<NewsChannelSchedule | null>(
    null,
  );

  useEffect(() => {
    if (nas.schedule) setScheduleDraft(nas.schedule);
  }, [nas.schedule]);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      setAuthOk(false);
      return;
    }
    let cancelled = false;
    void auth.verifySession().then((result) => {
      if (cancelled) return;
      setAuthOk(result.ok);
      if (!result.ok) setAuthError(result.message);
    });
    return () => {
      cancelled = true;
    };
  }, [auth.isAuthenticated, auth.accessToken, auth.verifySession]);

  const filteredAssets = useMemo(() => {
    if (nasFilter === "all") return nas.assets;
    return nas.assets.filter((a) => a.category === nasFilter);
  }, [nas.assets, nasFilter]);

  const controlsLocked = !auth.isAuthenticated || !authOk;

  async function runPatch(body: Record<string, unknown>) {
    if (!auth.accessToken) {
      setAuthError("Sign in with an authorized producer email first");
      return;
    }
    setBusy(true);
    setAuthError(null);
    try {
      await patch(body, { accessToken: auth.accessToken });
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
        type: "commercial",
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
      setAuthError("Sign in with an authorized producer email first");
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
            ["nas", "NAS Library", HardDrive],
            ["schedule", "Scheduler", Calendar],
            ["talent", "Talent", User],
            ["program", "Program", Tv],
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
            Only approved Mycosoft emails can control the news feed. No shared
            keys — Supabase magic link required.
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
                disabled={busy || auth.sendingLink}
                className="min-h-[48px] px-4 flex items-center justify-center gap-2 border border-white/20 text-[10px] font-black uppercase tracking-widest touch-manipulation disabled:opacity-50"
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={auth.email}
                onChange={(e) => auth.setEmail(e.target.value)}
                placeholder="morgan@mycosoft.org"
                className="flex-1 h-12 px-4 text-base bg-black border border-white/20 rounded-sm"
                autoComplete="email"
                disabled={auth.sendingLink || auth.loading}
              />
              <button
                type="button"
                onClick={() => void auth.signInWithMagicLink()}
                disabled={busy || auth.sendingLink || auth.loading}
                className="min-h-[48px] px-4 flex items-center justify-center gap-2 bg-white text-black text-[10px] font-black uppercase tracking-widest touch-manipulation disabled:opacity-50"
              >
                {auth.sendingLink ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Mail className="size-4" />
                )}
                Send magic link
              </button>
            </div>
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
              Controls locked until you sign in with an authorized email.
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
                      ? "border-[#0055cc] bg-[#0055cc]/25 text-white"
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
