import React, { useMemo, useState } from "react";
import { Image, Loader2, Upload, Video } from "lucide-react";
import { cn } from "../lib/utils";
import { pulseApiUrl } from "../lib/apiOrigin";
import type { BlocksMediaAsset } from "../hooks/useProducerNas";

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

function categoryForFile(file: File, current: string): string {
  if (current !== "all") return current;
  return file.type.startsWith("video/") ? "shows" : "graphics";
}

interface CloudMediaLibraryProps {
  assets: BlocksMediaAsset[];
  counts: Record<string, number> | undefined;
  accessToken: string | null;
  disabled: boolean;
  onUploaded: () => void;
  onUse: (asset: BlocksMediaAsset) => void;
}

export function CloudMediaLibrary({
  assets,
  counts,
  accessToken,
  disabled,
  onUploaded,
  onUse,
}: CloudMediaLibraryProps) {
  const [filter, setFilter] = useState<string>("all");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const visible = useMemo(() => {
    const broadcast = assets.filter((a) => a.category !== "tissue");
    if (filter === "all") return broadcast;
    return broadcast.filter((a) => a.category === filter);
  }, [assets, filter]);

  async function uploadFiles(files: File[]) {
    if (!files.length || disabled || !accessToken) {
      setMessage("Sign in to upload.");
      return;
    }
    setUploading(true);
    setMessage(null);
    let ok = 0;
    const errors: string[] = [];
    for (const file of files) {
      const category = categoryForFile(file, filter);
      const body = new FormData();
      body.set("category", category);
      body.set("file", file);
      try {
        const res = await fetch(pulseApiUrl("/api/news/producer/media"), {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body,
        });
        if (!res.ok) {
          const detail = await res.text();
          errors.push(`${file.name}: ${detail.slice(0, 120)}`);
        } else {
          ok += 1;
        }
      } catch (e) {
        errors.push(
          `${file.name}: ${e instanceof Error ? e.message : "upload failed"}`,
        );
      }
    }
    setUploading(false);
    setMessage(
      errors.length
        ? `Uploaded ${ok}. ${errors[0]}`
        : `Uploaded ${ok} file${ok === 1 ? "" : "s"} to the cloud library.`,
    );
    if (ok) onUploaded();
  }

  return (
    <section className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void uploadFiles(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "rounded-2xl border border-dashed px-6 py-8 text-center transition-colors",
          dragOver
            ? "border-[#5eb3ff] bg-[#5eb3ff]/10"
            : "border-white/20 bg-white/[0.03]",
        )}
      >
        <Upload className="mx-auto size-6 text-[#5eb3ff]" />
        <p className="mt-2 text-sm font-semibold">Drop shows, logos, or bumpers</p>
        <p className="mt-1 text-xs text-white/50">
          Images land in graphics unless a category chip is selected. Video lands in shows.
        </p>
        <label className="mt-4 inline-flex min-h-11 cursor-pointer items-center rounded-full bg-white px-5 text-xs font-semibold text-black">
          {uploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Choose files
          <input
            type="file"
            multiple
            accept="image/*,video/*,.svg,.m3u8"
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => {
              const list = Array.from(e.target.files ?? []);
              e.target.value = "";
              void uploadFiles(list);
            }}
          />
        </label>
        {message ? <p className="mt-3 text-xs text-[#5eb3ff]">{message}</p> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip
          active={filter === "all"}
          label={`All (${assets.filter((a) => a.category !== "tissue").length})`}
          onClick={() => setFilter("all")}
        />
        {CATEGORIES.map((c) => (
          <FilterChip
            key={c}
            active={filter === c}
            label={`${c} (${counts?.[c] ?? 0})`}
            onClick={() => setFilter(c)}
          />
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-white/45">
          Nothing in this shelf yet. Drop a file above.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {visible.map((asset) => (
            <article
              key={asset.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
            >
              <div className="flex h-28 items-center justify-center bg-black/50">
                {asset.kind === "graphic" ? (
                  <img
                    src={pulseApiUrl(asset.serveUrl)}
                    alt=""
                    className="max-h-28 w-full object-contain"
                  />
                ) : (
                  <Video className="size-8 text-[#5eb3ff]" />
                )}
              </div>
              <div className="space-y-2 p-3">
                <p className="truncate text-xs font-semibold">{asset.fileName}</p>
                <p className="text-[11px] capitalize text-white/45">
                  {asset.category} · {formatBytes(asset.sizeBytes)}
                </p>
                <div className="flex gap-2">
                  <a
                    href={pulseApiUrl(asset.serveUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center rounded-full border border-white/15 px-3 text-[11px] font-medium"
                  >
                    Open
                  </a>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onUse(asset)}
                    className="inline-flex h-8 items-center rounded-full bg-[#1450d4] px-3 text-[11px] font-medium disabled:opacity-40"
                  >
                    {asset.kind === "graphic" ? (
                      <Image className="mr-1 size-3" />
                    ) : null}
                    Use on air
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-full px-3 text-xs font-medium capitalize",
        active ? "bg-white text-black" : "bg-white/10 text-white/75 hover:bg-white/15",
      )}
    >
      {label}
    </button>
  );
}
