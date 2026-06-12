import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Image,
  Loader2,
  LogOut,
  Microscope,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { cn } from "../lib/utils";
import { pulseApiUrl } from "../lib/apiOrigin";
import { useProducerAuth } from "../hooks/useProducerAuth";
import { ProvisionPanel } from "./tissue/ProvisionPanel";
import {
  attachTissueMedia,
  createTissueSample,
  deleteTissueMedia,
  fetchCuratorTissueCatalog,
  fetchTissueNasAssets,
  patchTissueMedia,
  updateTissueSample,
  type TissueCategory,
  type TissueNasAsset,
  type TissueSample,
  type TissueVisibility,
} from "../lib/tissueApi";

interface TissueCuratorPanelProps {
  onExitCatalog: () => void;
}

const CATEGORIES: TissueCategory[] = ["mushroom", "mold", "mildew", "yeast"];
const VISIBILITY_OPTIONS: TissueVisibility[] = ["public", "internal", "hidden"];

const EMPTY_FORM = {
  sampleId: "",
  commonName: "",
  scientificName: "",
  category: "mushroom" as TissueCategory,
  kingdom: "",
  phylum: "",
  class: "",
  order: "",
  family: "",
  genus: "",
  species: "",
  massValue: "",
  massUnit: "g" as "g" | "mg",
  storageLocation: "",
  collectedAt: "",
  description: "",
  visibility: "internal" as TissueVisibility,
};

export function TissueCuratorPanel({ onExitCatalog }: TissueCuratorPanelProps) {
  const auth = useProducerAuth();
  const [samples, setSamples] = useState<TissueSample[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [nasAssets, setNasAssets] = useState<TissueNasAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const selected = samples.find((s) => s.id === selectedId) ?? null;

  const loadSamples = useCallback(async () => {
    if (!auth.isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const list = await fetchCuratorTissueCatalog();
      setSamples(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load samples");
    } finally {
      setLoading(false);
    }
  }, [auth.isAuthenticated]);

  const loadNas = useCallback(async (sampleFolder?: string) => {
    if (!auth.isAuthenticated) return;
    try {
      const assets = await fetchTissueNasAssets(sampleFolder);
      setNasAssets(assets);
    } catch (e) {
      setNasAssets([]);
      setError(e instanceof Error ? e.message : "NAS scan failed");
    }
  }, [auth.isAuthenticated]);

  useEffect(() => {
    if (!auth.loading && auth.isAuthenticated) {
      void auth.verifySession().then((r) => {
        setAuthChecked(r.ok);
        if (r.ok) void loadSamples();
        else setError(r.message);
      });
    } else if (!auth.loading && !auth.isAuthenticated) {
      setAuthChecked(false);
    }
  }, [auth.loading, auth.isAuthenticated, auth, loadSamples]);

  useEffect(() => {
    if (selected) {
      setForm({
        sampleId: selected.sampleId,
        commonName: selected.commonName,
        scientificName: selected.scientificName,
        category: selected.category,
        kingdom: selected.taxonomy.kingdom ?? "",
        phylum: selected.taxonomy.phylum ?? "",
        class: selected.taxonomy.class ?? "",
        order: selected.taxonomy.order ?? "",
        family: selected.taxonomy.family ?? "",
        genus: selected.taxonomy.genus ?? "",
        species: selected.taxonomy.species ?? "",
        massValue: selected.massValue != null ? String(selected.massValue) : "",
        massUnit: selected.massUnit ?? "g",
        storageLocation: selected.storageLocation ?? "",
        collectedAt: selected.collectedAt
          ? selected.collectedAt.slice(0, 16)
          : "",
        description: selected.description ?? "",
        visibility: selected.visibility ?? "internal",
      });
      void loadNas(selected.sampleId);
    }
  }, [selected, loadNas]);

  async function handleCreate() {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const sample = await createTissueSample({
        sampleId: form.sampleId,
        commonName: form.commonName,
        scientificName: form.scientificName,
        category: form.category,
        taxonomy: {
          kingdom: form.kingdom || undefined,
          phylum: form.phylum || undefined,
          class: form.class || undefined,
          order: form.order || undefined,
          family: form.family || undefined,
          genus: form.genus || undefined,
          species: form.species || undefined,
        },
        massValue: form.massValue ? Number(form.massValue) : null,
        massUnit: form.massUnit,
        storageLocation: form.storageLocation || null,
        collectedAt: form.collectedAt
          ? new Date(form.collectedAt).toISOString()
          : null,
        description: form.description || null,
        visibility: form.visibility,
        enrichFromMindex: true,
      });
      setStatus(`Created ${sample.sampleId}`);
      setSelectedId(sample.id);
      await loadSamples();
      await loadNas(sample.sampleId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      await updateTissueSample(selectedId, {
        commonName: form.commonName,
        scientificName: form.scientificName,
        category: form.category,
        taxonomy: {
          kingdom: form.kingdom || undefined,
          phylum: form.phylum || undefined,
          class: form.class || undefined,
          order: form.order || undefined,
          family: form.family || undefined,
          genus: form.genus || undefined,
          species: form.species || undefined,
        },
        massValue: form.massValue ? Number(form.massValue) : null,
        massUnit: form.massUnit,
        storageLocation: form.storageLocation || null,
        collectedAt: form.collectedAt
          ? new Date(form.collectedAt).toISOString()
          : null,
        description: form.description || null,
        visibility: form.visibility,
        enrichFromMindex: true,
      });
      setStatus("Saved");
      await loadSamples();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleAttachNas(relPath: string, isCover: boolean) {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const kind = relPath.match(/\.(mp4|webm|mov|mkv|m4v)$/i) ? "video" : "image";
      await attachTissueMedia(selectedId, {
        nasPath: relPath,
        kind,
        isCover,
        visibility: form.visibility,
      });
      setStatus(isCover ? "Cover attached" : "Media attached");
      await loadSamples();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Attach failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleMediaVisibility(
    mediaId: string,
    visibility: TissueVisibility,
  ) {
    setBusy(true);
    try {
      await patchTissueMedia({ mediaId, visibility });
      await loadSamples();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Media update failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSetCover(mediaId: string) {
    if (!selectedId) return;
    setBusy(true);
    try {
      await patchTissueMedia({ mediaId, isCover: true });
      await updateTissueSample(selectedId, { coverMediaId: mediaId });
      await loadSamples();
      setStatus("Cover updated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cover update failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteMedia(mediaId: string) {
    setBusy(true);
    try {
      await deleteTissueMedia(mediaId);
      await loadSamples();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  if (auth.loading) {
    return (
      <div className="flex items-center justify-center py-24 text-dim">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  if (!auth.isAuthenticated || !authChecked) {
    return (
      <div className="max-w-lg mx-auto p-8 space-y-6">
        <button
          type="button"
          onClick={onExitCatalog}
          className="inline-flex items-center gap-2 text-[10px] font-bold uppercase text-dim hover:text-white min-h-[44px] touch-manipulation"
        >
          <ArrowLeft className="size-4" /> Back to catalog
        </button>
        <div className="glass-bento border-white/10 p-8 text-center space-y-4">
          <Microscope className="size-10 mx-auto text-myco-accent" />
          <h2 className="text-xl font-black uppercase text-white">Tissue Curator</h2>
          <p className="text-sm text-dim">
            Sign in with an allowlisted Google account to manage tissue samples and NAS
            media.
          </p>
          {auth.error ? (
            <p className="text-sm text-red-300">{auth.error}</p>
          ) : null}
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <button
            type="button"
            onClick={() => void auth.signInWithGoogle()}
            disabled={auth.signingIn}
            className="w-full min-h-[48px] bg-myco-accent text-black font-black uppercase text-xs tracking-widest touch-manipulation disabled:opacity-50"
          >
            {auth.signingIn ? "Redirecting…" : "Sign in with Google"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-0 flex-1 overflow-hidden">
      <aside className="lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-white/10 p-4 flex flex-col gap-3 overflow-y-auto">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onExitCatalog}
            className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-dim hover:text-white min-h-[44px] touch-manipulation"
          >
            <ArrowLeft className="size-3.5" /> Catalog
          </button>
          <button
            type="button"
            onClick={() => void auth.signOut()}
            className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-dim hover:text-white min-h-[44px] touch-manipulation"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
        <p className="text-[10px] text-dim truncate">{auth.userEmail}</p>
        <button
          type="button"
          onClick={() => {
            setSelectedId(null);
            setForm(EMPTY_FORM);
            setNasAssets([]);
          }}
          className="min-h-[44px] px-3 border border-myco-accent/40 text-[10px] font-bold uppercase text-myco-accent touch-manipulation inline-flex items-center gap-2"
        >
          <Plus className="size-3.5" /> New sample
        </button>
        <button
          type="button"
          onClick={() => void loadSamples()}
          disabled={loading}
          className="min-h-[44px] px-3 border border-white/15 text-[10px] font-bold uppercase text-dim touch-manipulation inline-flex items-center gap-2"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Refresh
        </button>
        <ul className="space-y-1 flex-1 overflow-y-auto">
          {samples.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={cn(
                  "w-full text-left px-3 py-2 min-h-[44px] text-[10px] border touch-manipulation",
                  selectedId === s.id
                    ? "border-myco-accent bg-myco-accent/10 text-white"
                    : "border-transparent text-dim hover:text-white hover:bg-white/5",
                )}
              >
                <span className="font-mono block">{s.sampleId}</span>
                <span className="truncate block">{s.commonName}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        <ProvisionPanel />

        <header>
          <h2 className="text-lg font-black uppercase text-white">
            {selected ? `Edit ${selected.sampleId}` : "New tissue sample (legacy)"}
          </h2>
          <p className="text-[10px] text-dim mt-1">
            NAS convention: BLOCKS/tissue/&lt;sampleId&gt;/cover.jpg, 01.jpg, 02.mp4
          </p>
        </header>

        {error ? (
          <p className="text-sm text-red-300 border border-red-500/30 p-3">{error}</p>
        ) : null}
        {status ? (
          <p className="text-sm text-myco-accent border border-myco-accent/30 p-3">
            {status}
          </p>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="text-[9px] uppercase text-dim tracking-widest">
              Sample ID
            </span>
            <input
              value={form.sampleId}
              onChange={(e) => setForm((f) => ({ ...f, sampleId: e.target.value }))}
              disabled={Boolean(selected)}
              className="w-full px-3 py-3 min-h-[44px] text-base bg-black/50 border border-white/10 text-white disabled:opacity-60"
              placeholder="MYCO-FNG-0001"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[9px] uppercase text-dim tracking-widest">
              Category
            </span>
            <select
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  category: e.target.value as TissueCategory,
                }))
              }
              className="w-full px-3 py-3 min-h-[44px] text-base bg-black/50 border border-white/10 text-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-[9px] uppercase text-dim tracking-widest">
              Common name
            </span>
            <input
              value={form.commonName}
              onChange={(e) =>
                setForm((f) => ({ ...f, commonName: e.target.value }))
              }
              className="w-full px-3 py-3 min-h-[44px] text-base bg-black/50 border border-white/10 text-white"
            />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-[9px] uppercase text-dim tracking-widest">
              Scientific name
            </span>
            <input
              value={form.scientificName}
              onChange={(e) =>
                setForm((f) => ({ ...f, scientificName: e.target.value }))
              }
              className="w-full px-3 py-3 min-h-[44px] text-base bg-black/50 border border-white/10 text-white italic"
            />
          </label>
          {(["kingdom", "phylum", "class", "order", "family", "genus", "species"] as const).map(
            (rank) => (
              <label key={rank} className="space-y-1">
                <span className="text-[9px] uppercase text-dim tracking-widest">
                  {rank}
                </span>
                <input
                  value={form[rank]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [rank]: e.target.value }))
                  }
                  className="w-full px-3 py-2 min-h-[44px] text-base bg-black/50 border border-white/10 text-white"
                />
              </label>
            ),
          )}
          <label className="space-y-1">
            <span className="text-[9px] uppercase text-dim tracking-widest">Mass</span>
            <input
              type="number"
              min="0"
              step="any"
              value={form.massValue}
              onChange={(e) =>
                setForm((f) => ({ ...f, massValue: e.target.value }))
              }
              className="w-full px-3 py-3 min-h-[44px] text-base bg-black/50 border border-white/10 text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[9px] uppercase text-dim tracking-widest">Unit</span>
            <select
              value={form.massUnit}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  massUnit: e.target.value as "g" | "mg",
                }))
              }
              className="w-full px-3 py-3 min-h-[44px] text-base bg-black/50 border border-white/10 text-white"
            >
              <option value="g">g</option>
              <option value="mg">mg</option>
            </select>
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-[9px] uppercase text-dim tracking-widest">
              Storage location
            </span>
            <input
              value={form.storageLocation}
              onChange={(e) =>
                setForm((f) => ({ ...f, storageLocation: e.target.value }))
              }
              className="w-full px-3 py-3 min-h-[44px] text-base bg-black/50 border border-white/10 text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[9px] uppercase text-dim tracking-widest">
              Collected at
            </span>
            <input
              type="datetime-local"
              value={form.collectedAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, collectedAt: e.target.value }))
              }
              className="w-full px-3 py-3 min-h-[44px] text-base bg-black/50 border border-white/10 text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[9px] uppercase text-dim tracking-widest">
              Visibility
            </span>
            <select
              value={form.visibility}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  visibility: e.target.value as TissueVisibility,
                }))
              }
              className="w-full px-3 py-3 min-h-[44px] text-base bg-black/50 border border-white/10 text-white"
            >
              {VISIBILITY_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-[9px] uppercase text-dim tracking-widest">
              Description
            </span>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={3}
              className="w-full px-3 py-3 text-base bg-black/50 border border-white/10 text-white"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {selected ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSave()}
              className="min-h-[44px] px-6 bg-myco-accent text-black font-black uppercase text-[10px] tracking-widest touch-manipulation inline-flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="size-4" />
              Save
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleCreate()}
              className="min-h-[44px] px-6 bg-myco-accent text-black font-black uppercase text-[10px] tracking-widest touch-manipulation inline-flex items-center gap-2 disabled:opacity-50"
            >
              <Plus className="size-4" />
              Create sample
            </button>
          )}
          {selected ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void loadNas(form.sampleId)}
              className="min-h-[44px] px-4 border border-white/15 text-[10px] font-bold uppercase text-dim touch-manipulation"
            >
              Scan NAS folder
            </button>
          ) : null}
        </div>

        {selected && selected.media.length > 0 ? (
          <section className="space-y-2">
            <p className="text-[10px] font-bold uppercase text-dim">Attached media</p>
            <ul className="space-y-2">
              {selected.media.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center gap-2 border border-white/10 p-2 bg-black/40"
                >
                  <span className="text-[9px] font-mono flex-1 min-w-0 truncate">
                    {m.nasPath}
                  </span>
                  <select
                    value={m.visibility}
                    onChange={(e) =>
                      void handleMediaVisibility(
                        m.id,
                        e.target.value as TissueVisibility,
                      )
                    }
                    className="text-[10px] bg-black border border-white/15 px-2 py-2 min-h-[44px]"
                    disabled={busy}
                  >
                    {VISIBILITY_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleSetCover(m.id)}
                    className="min-h-[44px] px-3 text-[9px] font-bold uppercase border border-myco-accent/40 text-myco-accent touch-manipulation"
                  >
                    Cover
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleDeleteMedia(m.id)}
                    className="min-h-[44px] px-3 text-red-300 touch-manipulation"
                    aria-label="Delete media"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {selected ? (
          <section className="border border-white/10 p-4 space-y-3 bg-black/40">
            <p className="text-[10px] font-bold uppercase text-white/50 flex items-center gap-2">
              <Image className="size-4 text-amber-400" />
              NAS tissue folder
            </p>
            {nasAssets.length === 0 ? (
              <p className="text-xs text-white/40">
                No files in tissue/{form.sampleId}/. Upload to NAS then Scan.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {nasAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="border border-white/15 p-2 flex flex-col gap-2"
                  >
                    {asset.kind === "graphic" ? (
                      <img
                        src={pulseApiUrl(asset.serveUrl)}
                        alt={asset.fileName}
                        className="aspect-square object-cover w-full bg-black"
                      />
                    ) : (
                      <div className="aspect-square bg-black flex items-center justify-center text-[9px] uppercase text-dim">
                        Video
                      </div>
                    )}
                    <p className="text-[8px] truncate text-dim">{asset.fileName}</p>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleAttachNas(asset.relPath, false)}
                        className="flex-1 min-h-[44px] text-[8px] font-bold uppercase border border-white/20 touch-manipulation"
                      >
                        Attach
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleAttachNas(asset.relPath, true)}
                        className="flex-1 min-h-[44px] text-[8px] font-bold uppercase border border-myco-accent/40 text-myco-accent touch-manipulation"
                      >
                        Cover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
