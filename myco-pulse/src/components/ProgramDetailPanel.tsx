import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Loader2,
  Radio,
  Save,
  Tv,
  Upload,
  X,
} from "lucide-react";
import { cn } from "../lib/utils";
import type {
  ProducerPresetOption,
  ProgramShowConfig,
} from "../hooks/useNewsProducer";
import type { BlocksMediaAsset } from "../hooks/useProducerNas";
import type { MarketsNowAssetOption } from "../lib/liveStreamData";
import { NasGraphicsPicker } from "./NasGraphicsPicker";

interface ProgramDetailPanelProps {
  programId: string;
  programLabel: string;
  initialConfig: ProgramShowConfig | null;
  /** Stable JSON fingerprint from server — avoids reset on poll object identity churn */
  configSyncKey: string;
  titlePresets: ProducerPresetOption[];
  talentPresets: ProducerPresetOption[];
  assetCatalog: MarketsNowAssetOption[];
  assetCatalogByCategory: Map<string, MarketsNowAssetOption[]>;
  graphics: BlocksMediaAsset[];
  commercialAssets: BlocksMediaAsset[];
  showVideoAssets: BlocksMediaAsset[];
  presetDefaultNasPath?: string | null;
  presetDefaultVideoUrl?: string | null;
  isOnAir: boolean;
  busy: boolean;
  disabled: boolean;
  onClose: () => void;
  onSave: (config: ProgramShowConfig) => Promise<void>;
  onGoOnAir: (programId: string) => Promise<void>;
  onPushLive: (programId: string, config: ProgramShowConfig) => Promise<void>;
  onEndShow: () => Promise<void>;
  onFireCommercial: (programId: string, slotId: string) => Promise<void>;
}

function defaultDraft(programId: string): ProgramShowConfig {
  return {
    programPresetId: programId,
    titlePresetId: null,
    titleLogoNasPath: null,
    talentPresetIds: [],
    customTalent: [],
    liveData: { enabled: true, assetIds: [], marketingNasPath: null },
    commercials: [],
    graphicsZones: [],
    newsReel: { mode: "news" },
    bottomBar: { mode: "newsTicker" },
  };
}

function newGraphicsZone(): ProgramShowConfig["graphicsZones"][number] {
  return {
    zone: "fullscreen",
    nasPath: "",
    timing: "showStartOffset",
    offsetSeconds: 0,
  };
}

function newCommercialSlot(): ProgramShowConfig["commercials"][number] {
  return {
    id: `slot-${Date.now().toString(36)}`,
    enabled: true,
    nasPath: "",
    trigger: "manual",
    offsetMinutes: 1,
    playMode: "fullDuration",
    maxDurationSeconds: 30,
    autoReturnOnEnd: true,
  };
}

function mergeInitialConfig(
  programId: string,
  initialConfig: ProgramShowConfig | null,
): ProgramShowConfig {
  const base = defaultDraft(programId);
  if (!initialConfig) return base;
  return {
    ...base,
    ...initialConfig,
    programPresetId: programId,
    talentPresetIds: initialConfig.talentPresetIds ?? [],
    customTalent: initialConfig.customTalent ?? [],
    liveData: { ...base.liveData, ...initialConfig.liveData },
    commercials: [...(initialConfig.commercials ?? [])],
    graphicsZones: [...(initialConfig.graphicsZones ?? [])],
    newsReel: { ...base.newsReel, ...initialConfig.newsReel },
    bottomBar: { ...base.bottomBar, ...initialConfig.bottomBar },
  };
}

export function ProgramDetailPanel({
  programId,
  programLabel,
  initialConfig,
  configSyncKey,
  titlePresets,
  talentPresets,
  assetCatalog,
  assetCatalogByCategory,
  graphics,
  commercialAssets,
  showVideoAssets,
  presetDefaultNasPath,
  presetDefaultVideoUrl,
  isOnAir,
  busy,
  disabled,
  onClose,
  onSave,
  onGoOnAir,
  onPushLive,
  onEndShow,
  onFireCommercial,
}: ProgramDetailPanelProps) {
  const [confirmEndShow, setConfirmEndShow] = useState(false);
  const [draft, setDraft] = useState<ProgramShowConfig>(() =>
    mergeInitialConfig(programId, initialConfig),
  );
  const dirtyRef = useRef(false);
  const prevProgramIdRef = useRef(programId);
  const syncedFingerprintRef = useRef(configSyncKey);

  useEffect(() => {
    const programChanged = prevProgramIdRef.current !== programId;
    prevProgramIdRef.current = programId;

    let serverConfig: ProgramShowConfig | null = null;
    if (configSyncKey) {
      try {
        serverConfig = JSON.parse(configSyncKey) as ProgramShowConfig;
      } catch {
        serverConfig = initialConfig;
      }
    } else {
      serverConfig = initialConfig;
    }

    if (programChanged) {
      dirtyRef.current = false;
      syncedFingerprintRef.current = configSyncKey;
      setDraft(mergeInitialConfig(programId, serverConfig));
      return;
    }

    if (dirtyRef.current) return;
    if (configSyncKey === syncedFingerprintRef.current) return;

    syncedFingerprintRef.current = configSyncKey;
    setDraft(mergeInitialConfig(programId, serverConfig));
  }, [programId, configSyncKey, initialConfig]);

  /** Auth gate only — never disable draft fields while a PATCH is in flight. */
  const formDisabled = disabled;
  const actionsLocked = disabled || busy;

  function updateDraft(partial: Partial<ProgramShowConfig>) {
    dirtyRef.current = true;
    setDraft((prev) => ({ ...prev, ...partial }));
  }

  function mutateDraft(updater: (prev: ProgramShowConfig) => ProgramShowConfig) {
    dirtyRef.current = true;
    setDraft(updater);
  }

  async function handleSave() {
    const payload = { ...draft, programPresetId: programId };
    await onSave(payload);
    dirtyRef.current = false;
    syncedFingerprintRef.current = JSON.stringify(payload);
  }

  async function handlePushLive() {
    const payload = { ...draft, programPresetId: programId };
    await onSave(payload);
    await onPushLive(programId, payload);
    dirtyRef.current = false;
    syncedFingerprintRef.current = JSON.stringify(payload);
  }

  const effectiveShowNas =
    draft.showVideoNasPath?.trim() || presetDefaultNasPath?.trim() || "";

  function updateCommercialSlot(
    index: number,
    patch: Partial<ProgramShowConfig["commercials"][number]>,
  ) {
    mutateDraft((prev) => {
      const commercials = [...prev.commercials];
      const slot = commercials[index];
      if (!slot) return prev;
      commercials[index] = { ...slot, ...patch };
      return { ...prev, commercials };
    });
  }

  function toggleTalent(id: string) {
    mutateDraft((prev) => {
      const ids = new Set(prev.talentPresetIds);
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      return { ...prev, talentPresetIds: [...ids] };
    });
  }

  function toggleLiveAsset(id: string) {
    mutateDraft((prev) => {
      const ids = [...prev.liveData.assetIds];
      const idx = ids.indexOf(id);
      if (idx >= 0) ids.splice(idx, 1);
      else if (ids.length < 3) ids.push(id);
      return {
        ...prev,
        liveData: { ...prev.liveData, assetIds: ids },
      };
    });
  }

  const titleLogoPreview = useMemo(() => {
    const p = draft.titleLogoNasPath;
    if (!p) return null;
    return `/api/news/producer/media/serve?path=${encodeURIComponent(p)}`;
  }, [draft.titleLogoNasPath]);

  return (
    <aside className="flex flex-col min-h-0 bg-[#0a0a0a] border-l border-white/10 w-full md:w-[380px] shrink-0">
      <div className="shrink-0 flex items-center gap-2 border-b border-white/10 px-3 py-3">
        <button
          type="button"
          onClick={onClose}
          className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center border border-white/15 touch-manipulation"
          aria-label="Back to program list"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black uppercase tracking-widest text-[#5eb3ff]">
            Show config
          </p>
          <p className="text-sm font-black uppercase truncate">{programLabel}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="hidden md:flex min-h-[44px] min-w-[44px] items-center justify-center border border-white/15 touch-manipulation"
          aria-label="Close panel"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-sm">
        <section className="space-y-2 border border-[#0055cc]/30 bg-[#0055cc]/5 p-3">
          <p className="text-[9px] font-black uppercase text-[#5eb3ff]">Show video source</p>
          <p className="text-[10px] text-white/55 leading-snug">
            Default from preset:{" "}
            <code className="text-white/80">
              {presetDefaultNasPath || presetDefaultVideoUrl || "none — add NAS file in shows/"}
            </code>
          </p>
          <select
            value={draft.showVideoNasPath ?? ""}
            onChange={(e) =>
              mutateDraft((prev) => ({
                ...prev,
                showVideoNasPath: e.target.value || null,
              }))
            }
            disabled={formDisabled}
            className="w-full h-12 px-3 text-base bg-black border border-white/20"
          >
            <option value="">Use preset default</option>
            {showVideoAssets.map((a) => (
              <option key={a.relPath} value={a.relPath}>
                {a.fileName}
              </option>
            ))}
          </select>
          <input
            type="url"
            value={draft.showVideoUrl ?? ""}
            onChange={(e) =>
              mutateDraft((prev) => ({
                ...prev,
                showVideoUrl: e.target.value || null,
              }))
            }
            disabled={formDisabled}
            placeholder="Or YouTube / stream URL override"
            className="w-full h-12 px-3 text-base bg-black border border-white/20"
          />
          {effectiveShowNas ? (
            <p className="text-[9px] text-emerald-400/90 font-mono truncate">
              On air plays: {effectiveShowNas}
            </p>
          ) : null}
        </section>

        <section className="space-y-2">
          <p className="text-[9px] font-black uppercase text-white/50">Title</p>
          <select
            value={draft.titlePresetId ?? ""}
            onChange={(e) =>
              updateDraft({ titlePresetId: e.target.value || null })
            }
            disabled={formDisabled}
            className="w-full h-12 px-3 text-base bg-black border border-white/20"
          >
            <option value="">Auto from show</option>
            {titlePresets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <NasGraphicsPicker
            title="Title logo"
            description="Optional NAS graphics/ for title bar."
            graphics={graphics}
            selectedRelPath={draft.titleLogoNasPath ?? null}
            previewImageUrl={titleLogoPreview}
            busy={busy}
            disabled={formDisabled}
            onSelect={(rel) => updateDraft({ titleLogoNasPath: rel })}
            onClear={() => updateDraft({ titleLogoNasPath: null })}
          />
        </section>

        <section className="space-y-2">
          <p className="text-[9px] font-black uppercase text-white/50">Talent</p>
          <div className="flex flex-wrap gap-2">
            {talentPresets.map((t) => {
              const on = draft.talentPresetIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={formDisabled}
                  onClick={() => toggleTalent(t.id)}
                  className={cn(
                    "min-h-[44px] px-3 text-[10px] font-black uppercase border touch-manipulation",
                    on
                      ? "border-[#0055cc] bg-[#0055cc]/25"
                      : "border-white/15",
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-[9px] font-black uppercase text-white/50">Live data</p>
          <label className="flex items-center gap-2 min-h-[44px]">
            <input
              type="checkbox"
              checked={draft.liveData.enabled}
              onChange={(e) =>
                mutateDraft((prev) => ({
                  ...prev,
                  liveData: { ...prev.liveData, enabled: e.target.checked },
                }))
              }
              disabled={formDisabled}
            />
            <span className="text-xs">Markets Now widget enabled</span>
          </label>
          {draft.liveData.enabled ? (
            <div className="space-y-2">
              {Array.from(assetCatalogByCategory.entries()).map(([catId, items]) => (
                <div key={catId}>
                  <p className="text-[8px] font-bold uppercase text-white/40 mb-1">
                    {items[0]?.categoryLabel ?? catId}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {items.map((item) => {
                      const selected = draft.liveData.assetIds.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={formDisabled || (!selected && draft.liveData.assetIds.length >= 3)}
                          onClick={() => toggleLiveAsset(item.id)}
                          className={cn(
                            "min-h-[40px] px-2 text-[9px] font-black uppercase border",
                            selected ? "border-[#5eb3ff] bg-[#0055cc]/20" : "border-white/10",
                          )}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <NasGraphicsPicker
            title="Marketing logo"
            description="Optional logo in Live Stream Data widget."
            graphics={graphics}
            selectedRelPath={draft.liveData.marketingNasPath ?? null}
            previewImageUrl={
              draft.liveData.marketingNasPath
                ? `/api/news/producer/media/serve?path=${encodeURIComponent(draft.liveData.marketingNasPath)}`
                : null
            }
            busy={busy}
            disabled={formDisabled}
            onSelect={(rel) =>
              mutateDraft((prev) => ({
                ...prev,
                liveData: { ...prev.liveData, marketingNasPath: rel },
              }))
            }
            onClear={() =>
              mutateDraft((prev) => ({
                ...prev,
                liveData: { ...prev.liveData, marketingNasPath: null },
              }))
            }
          />
        </section>

        <section className="space-y-2">
          <p className="text-[9px] font-black uppercase text-white/50">
            Graphics sequence (order = play order)
          </p>
          {draft.graphicsZones.map((zone, index) => (
            <div key={`gz-${index}`} className="border border-white/10 p-3 space-y-2 bg-black/40">
              <div className="flex justify-between items-center gap-2">
                <span className="text-[10px] font-black uppercase">Graphic {index + 1}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={formDisabled || index === 0}
                    onClick={() =>
                      mutateDraft((prev) => {
                        const zones = [...prev.graphicsZones];
                        [zones[index - 1], zones[index]] = [zones[index], zones[index - 1]];
                        return { ...prev, graphicsZones: zones };
                      })
                    }
                    className="min-h-[40px] min-w-[40px] border border-white/15 flex items-center justify-center"
                    aria-label="Move up"
                  >
                    <ChevronUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    disabled={formDisabled || index >= draft.graphicsZones.length - 1}
                    onClick={() =>
                      mutateDraft((prev) => {
                        const zones = [...prev.graphicsZones];
                        [zones[index], zones[index + 1]] = [zones[index + 1], zones[index]];
                        return { ...prev, graphicsZones: zones };
                      })
                    }
                    className="min-h-[40px] min-w-[40px] border border-white/15 flex items-center justify-center"
                    aria-label="Move down"
                  >
                    <ChevronDown className="size-4" />
                  </button>
                </div>
              </div>
              <select
                value={zone.zone}
                onChange={(e) =>
                  mutateDraft((prev) => {
                    const zones = [...prev.graphicsZones];
                    zones[index] = {
                      ...zones[index],
                      zone: e.target.value as ProgramShowConfig["graphicsZones"][number]["zone"],
                    };
                    return { ...prev, graphicsZones: zones };
                  })
                }
                disabled={formDisabled}
                className="w-full h-10 px-2 text-sm bg-black border border-white/20"
              >
                <option value="fullscreen">Fullscreen overlay</option>
                <option value="liveData">Live data zone</option>
                <option value="newsReel">News reel</option>
                <option value="bottomBar">Bottom bar</option>
              </select>
              <select
                value={zone.nasPath ?? ""}
                onChange={(e) =>
                  mutateDraft((prev) => {
                    const zones = [...prev.graphicsZones];
                    zones[index] = { ...zones[index], nasPath: e.target.value };
                    return { ...prev, graphicsZones: zones };
                  })
                }
                disabled={formDisabled}
                className="w-full h-10 px-2 text-sm bg-black border border-white/20"
              >
                <option value="">Select graphic</option>
                {graphics.map((g) => (
                  <option key={g.relPath} value={g.relPath}>
                    {g.fileName}
                  </option>
                ))}
              </select>
              <select
                value={zone.timing}
                onChange={(e) =>
                  mutateDraft((prev) => {
                    const zones = [...prev.graphicsZones];
                    zones[index] = {
                      ...zones[index],
                      timing: e.target.value as "static" | "cycle" | "showStartOffset",
                    };
                    return { ...prev, graphicsZones: zones };
                  })
                }
                disabled={formDisabled}
                className="w-full h-10 px-2 text-sm bg-black border border-white/20"
              >
                <option value="static">Manual / on push live</option>
                <option value="showStartOffset">Auto after show start</option>
                <option value="cycle">Cycle on interval</option>
              </select>
              {zone.timing === "showStartOffset" ? (
                <input
                  type="number"
                  min={0}
                  value={zone.offsetSeconds ?? 0}
                  onChange={(e) =>
                    mutateDraft((prev) => {
                      const zones = [...prev.graphicsZones];
                      zones[index] = {
                        ...zones[index],
                        offsetSeconds: Number(e.target.value) || 0,
                      };
                      return { ...prev, graphicsZones: zones };
                    })
                  }
                  disabled={formDisabled}
                  placeholder="Seconds after go on air"
                  className="w-full h-10 px-2 text-base bg-black border border-white/20"
                />
              ) : null}
              {zone.timing === "cycle" ? (
                <input
                  type="number"
                  min={5}
                  value={zone.cycleSeconds ?? 30}
                  onChange={(e) =>
                    mutateDraft((prev) => {
                      const zones = [...prev.graphicsZones];
                      zones[index] = {
                        ...zones[index],
                        cycleSeconds: Number(e.target.value) || 30,
                      };
                      return { ...prev, graphicsZones: zones };
                    })
                  }
                  disabled={formDisabled}
                  placeholder="Cycle seconds"
                  className="w-full h-10 px-2 text-base bg-black border border-white/20"
                />
              ) : null}
            </div>
          ))}
          <button
            type="button"
            disabled={formDisabled}
            onClick={() =>
              mutateDraft((prev) => ({
                ...prev,
                graphicsZones: [...prev.graphicsZones, newGraphicsZone()],
              }))
            }
            className="w-full min-h-[44px] border border-white/20 text-[10px] font-black uppercase"
          >
            Add graphic step
          </button>
        </section>

        <section className="space-y-2">
          <p className="text-[9px] font-black uppercase text-white/50">
            Commercials (0–4)
          </p>
          {draft.commercials.map((slot, index) => (
            <div
              key={slot.id}
              className="border border-white/10 p-3 space-y-2 bg-black/40"
            >
              <div className="flex justify-between items-center gap-2">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={slot.enabled}
                    onChange={(e) =>
                      updateCommercialSlot(index, { enabled: e.target.checked })
                    }
                    disabled={formDisabled}
                  />
                  Slot {index + 1}
                </label>
                {isOnAir && slot.enabled && slot.nasPath ? (
                  <button
                    type="button"
                    disabled={actionsLocked}
                    onClick={() => void onFireCommercial(programId, slot.id)}
                    className="min-h-[40px] px-2 text-[9px] font-black uppercase border border-amber-400/60 text-amber-300"
                  >
                    Fire
                  </button>
                ) : null}
              </div>
              <select
                value={slot.nasPath ?? ""}
                onChange={(e) =>
                  updateCommercialSlot(index, { nasPath: e.target.value })
                }
                disabled={formDisabled}
                className="w-full h-10 px-2 text-sm bg-black border border-white/20"
              >
                <option value="">Select NAS clip</option>
                {commercialAssets.map((a) => (
                  <option key={a.relPath} value={a.relPath}>
                    {a.fileName}
                  </option>
                ))}
              </select>
              <select
                value={slot.trigger}
                onChange={(e) =>
                  updateCommercialSlot(index, {
                    trigger: e.target.value as "manual" | "offsetAfterStart",
                  })
                }
                disabled={formDisabled}
                className="w-full h-10 px-2 text-sm bg-black border border-white/20"
              >
                <option value="manual">Manual fire only</option>
                <option value="offsetAfterStart">Offset after show start</option>
              </select>
              {slot.trigger === "offsetAfterStart" ? (
                <input
                  type="number"
                  min={0}
                  value={slot.offsetMinutes ?? 0}
                  onChange={(e) =>
                    updateCommercialSlot(index, {
                      offsetMinutes: Number(e.target.value) || 0,
                    })
                  }
                  disabled={formDisabled}
                  placeholder="Offset minutes"
                  className="w-full h-10 px-2 text-base bg-black border border-white/20"
                />
              ) : null}
              <select
                value={slot.playMode}
                onChange={(e) =>
                  updateCommercialSlot(index, {
                    playMode: e.target.value as "fullDuration" | "maxSeconds",
                  })
                }
                disabled={formDisabled}
                className="w-full h-10 px-2 text-sm bg-black border border-white/20"
              >
                <option value="fullDuration">Full duration</option>
                <option value="maxSeconds">Max seconds</option>
              </select>
              {slot.playMode === "maxSeconds" ? (
                <input
                  type="number"
                  min={1}
                  value={slot.maxDurationSeconds ?? 30}
                  onChange={(e) =>
                    updateCommercialSlot(index, {
                      maxDurationSeconds: Number(e.target.value) || 30,
                    })
                  }
                  disabled={formDisabled}
                  className="w-full h-10 px-2 text-base bg-black border border-white/20"
                />
              ) : null}
            </div>
          ))}
          {draft.commercials.length < 4 ? (
            <button
              type="button"
              disabled={formDisabled}
              onClick={() =>
                mutateDraft((prev) => ({
                  ...prev,
                  commercials: [...prev.commercials, newCommercialSlot()],
                }))
              }
              className="w-full min-h-[44px] border border-white/20 text-[10px] font-black uppercase"
            >
              Add commercial slot
            </button>
          ) : null}
        </section>

        <section className="space-y-2">
          <p className="text-[9px] font-black uppercase text-white/50">News reel</p>
          <select
            value={draft.newsReel.mode}
            onChange={(e) =>
              mutateDraft((prev) => ({
                ...prev,
                newsReel: {
                  ...prev.newsReel,
                  mode: e.target.value as ProgramShowConfig["newsReel"]["mode"],
                },
              }))
            }
            disabled={formDisabled}
            className="w-full h-12 px-3 text-base bg-black border border-white/20"
          >
            <option value="news">Live news crawl</option>
            <option value="customText">Custom crawl text</option>
            <option value="graphic">Graphic</option>
            <option value="hidden">Hidden</option>
          </select>
          {draft.newsReel.mode === "customText" ? (
            <textarea
              key={`${programId}-news-reel-custom`}
              value={draft.newsReel.customCrawlText ?? ""}
              onChange={(e) =>
                mutateDraft((prev) => ({
                  ...prev,
                  newsReel: { ...prev.newsReel, customCrawlText: e.target.value },
                }))
              }
              disabled={formDisabled}
              rows={3}
              autoComplete="off"
              spellCheck={false}
              className="w-full p-3 text-base bg-black border border-white/20"
              placeholder="Type your crawl lines (one per paragraph). Save config, then Go on air."
            />
          ) : null}
          {draft.newsReel.mode === "graphic" ? (
            <select
              value={draft.newsReel.graphicNasPath ?? ""}
              onChange={(e) =>
                mutateDraft((prev) => ({
                  ...prev,
                  newsReel: { ...prev.newsReel, graphicNasPath: e.target.value },
                }))
              }
              disabled={formDisabled}
              className="w-full h-10 px-2 text-sm bg-black border border-white/20"
            >
              <option value="">Select graphic</option>
              {graphics.map((g) => (
                <option key={g.relPath} value={g.relPath}>
                  {g.fileName}
                </option>
              ))}
            </select>
          ) : null}
        </section>

        <section className="space-y-2">
          <p className="text-[9px] font-black uppercase text-white/50">Bottom bar</p>
          <select
            value={draft.bottomBar.mode}
            onChange={(e) =>
              mutateDraft((prev) => ({
                ...prev,
                bottomBar: {
                  ...prev.bottomBar,
                  mode: e.target.value as ProgramShowConfig["bottomBar"]["mode"],
                },
              }))
            }
            disabled={formDisabled}
            className="w-full h-12 px-3 text-base bg-black border border-white/20"
          >
            <option value="newsTicker">News ticker</option>
            <option value="customText">Custom text</option>
            <option value="graphic">Graphic</option>
            <option value="hidden">Hidden</option>
          </select>
          {draft.bottomBar.mode === "customText" ? (
            <input
              key={`${programId}-bottom-bar-custom`}
              type="text"
              value={draft.bottomBar.customText ?? ""}
              onChange={(e) =>
                mutateDraft((prev) => ({
                  ...prev,
                  bottomBar: { ...prev.bottomBar, customText: e.target.value },
                }))
              }
              disabled={formDisabled}
              autoComplete="off"
              spellCheck={false}
              className="w-full h-12 px-3 text-base bg-black border border-white/20"
              placeholder="Headline for bottom bar — Save config, then Go on air"
            />
          ) : null}
          {draft.bottomBar.mode === "graphic" ? (
            <select
              value={draft.bottomBar.graphicNasPath ?? ""}
              onChange={(e) =>
                mutateDraft((prev) => ({
                  ...prev,
                  bottomBar: { ...prev.bottomBar, graphicNasPath: e.target.value },
                }))
              }
              disabled={formDisabled}
              className="w-full h-10 px-2 text-sm bg-black border border-white/20"
            >
              <option value="">Select graphic</option>
              {graphics.map((g) => (
                <option key={g.relPath} value={g.relPath}>
                  {g.fileName}
                </option>
              ))}
            </select>
          ) : null}
        </section>
      </div>

      <div className="shrink-0 p-3 border-t border-white/10 flex flex-col gap-2">
        {isOnAir ? (
          <button
            type="button"
            disabled={actionsLocked}
            onClick={() => void handlePushLive()}
            className="w-full min-h-[48px] flex items-center justify-center gap-2 border border-emerald-400/50 text-emerald-300 text-[10px] font-black uppercase touch-manipulation disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Push changes live
          </button>
        ) : null}
        <button
          type="button"
          disabled={actionsLocked}
          onClick={() => void handleSave()}
          className="w-full min-h-[48px] flex items-center justify-center gap-2 border border-white/25 text-[10px] font-black uppercase touch-manipulation disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save config
        </button>
        {isOnAir ? (
          confirmEndShow ? (
            <div className="space-y-2 border border-red-500/40 p-3 bg-red-950/30">
              <p className="text-[10px] text-red-200 uppercase font-bold text-center">
                End show and return to live schedule?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={actionsLocked}
                  onClick={() => setConfirmEndShow(false)}
                  className="flex-1 min-h-[48px] border border-white/25 text-[10px] font-black uppercase"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionsLocked}
                  onClick={() => {
                    setConfirmEndShow(false);
                    void onEndShow();
                  }}
                  className="flex-1 min-h-[48px] bg-red-600 text-white text-[10px] font-black uppercase"
                >
                  Yes, end show
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={actionsLocked}
              onClick={() => setConfirmEndShow(true)}
              className="w-full min-h-[48px] border border-red-400/50 text-red-300 text-[10px] font-black uppercase disabled:opacity-50"
            >
              End show…
            </button>
          )
        ) : (
          <button
            type="button"
            disabled={actionsLocked}
            onClick={() => void onGoOnAir(programId)}
            className="w-full min-h-[52px] flex items-center justify-center gap-2 bg-[#0055cc] text-[11px] font-black uppercase touch-manipulation disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Radio className="size-4" />}
            Go on air
          </button>
        )}
        {isOnAir ? (
          <p className="text-[9px] text-emerald-400/90 uppercase text-center flex items-center justify-center gap-1">
            <Tv className="size-3" /> On air
          </p>
        ) : null}
      </div>
    </aside>
  );
}
