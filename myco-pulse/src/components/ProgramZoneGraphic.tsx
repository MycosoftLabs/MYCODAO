import React from "react";
import { cn } from "../lib/utils";
import { pulseApiUrl } from "../lib/apiOrigin";

interface ProgramZoneGraphicProps {
  src: string | null;
  alt?: string;
  className?: string;
  objectFit?: "contain" | "cover";
}

/** NAS graphic layer for show overlay zones (reel, bottom bar, live data). */
export function ProgramZoneGraphic({
  src,
  alt = "",
  className,
  objectFit = "contain",
}: ProgramZoneGraphicProps) {
  if (!src?.trim()) return null;
  const url = src.startsWith("http") ? src : pulseApiUrl(src);

  return (
    <img
      src={url}
      alt={alt}
      className={cn(
        "pointer-events-none select-none",
        objectFit === "cover" ? "object-cover" : "object-contain",
        className,
      )}
    />
  );
}
