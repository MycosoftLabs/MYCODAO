import React from "react";
import { Image } from "lucide-react";
import { cn } from "../lib/utils";
import { pulseApiUrl } from "../lib/apiOrigin";
import type { BlocksMediaAsset } from "../hooks/useProducerNas";
import { LiveStreamMarketingLogo } from "./LiveStreamMarketingLogo";

interface NasGraphicsPickerProps {
  title: string;
  description: string;
  graphics: BlocksMediaAsset[];
  selectedRelPath: string | null;
  previewImageUrl: string | null;
  busy?: boolean;
  disabled?: boolean;
  onSelect: (relPath: string) => void;
  onClear: () => void;
}

/** Tap-to-select graphics from NAS `graphics/` — same UX as Live Stream Data marketing logo. */
export function NasGraphicsPicker({
  title,
  description,
  graphics,
  selectedRelPath,
  previewImageUrl,
  busy = false,
  disabled = false,
  onSelect,
  onClear,
}: NasGraphicsPickerProps) {
  const locked = disabled || busy;

  return (
    <div className="border border-white/10 p-4 space-y-3 bg-black/40">
      <p className="text-[10px] font-bold uppercase text-white/50 flex items-center gap-2">
        <Image className="size-4 text-amber-400" />
        {title}
      </p>
      <p className="text-xs text-white/45">{description}</p>
      {previewImageUrl ? (
        <div className="flex items-center gap-3">
          <LiveStreamMarketingLogo
            src={
              previewImageUrl.startsWith("http")
                ? previewImageUrl
                : pulseApiUrl(previewImageUrl)
            }
            variant="preview"
            className="bg-black/60 border border-white/15"
          />
          <button
            type="button"
            disabled={locked}
            onClick={onClear}
            className="min-h-[44px] px-4 text-[9px] font-black uppercase border border-amber-400/50 text-amber-300 touch-manipulation disabled:opacity-50"
          >
            Clear logo
          </button>
        </div>
      ) : null}
      {graphics.length === 0 ? (
        <p className="text-xs text-white/40">
          No graphics in NAS yet. Upload to graphics/ and Sync.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {graphics.map((asset) => {
            const selected = selectedRelPath === asset.relPath;
            return (
              <button
                key={asset.id}
                type="button"
                disabled={locked}
                onClick={() => onSelect(asset.relPath)}
                className={cn(
                  "min-h-[72px] p-2 border flex flex-col items-center gap-1 touch-manipulation disabled:opacity-50",
                  selected
                    ? "border-[#0055cc] bg-[#0055cc]/20"
                    : "border-white/15 hover:border-[#5eb3ff]",
                )}
              >
                <LiveStreamMarketingLogo
                  src={pulseApiUrl(asset.serveUrl)}
                  variant="thumb"
                />
                <span className="text-[8px] font-bold uppercase truncate w-full text-center">
                  {asset.fileName}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
