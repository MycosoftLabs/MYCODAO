import React from "react";
import { cn } from "../lib/utils";

type LiveStreamMarketingLogoVariant = "air" | "preview" | "thumb" | "titleBar";

const VARIANT_BOX: Record<LiveStreamMarketingLogoVariant, string> = {
  /** On-air Live Stream Data — full widget width; height follows aspect ratio */
  air: "w-full",
  /** Producer “logo on air” preview */
  preview: "h-14 w-[7.5rem] shrink-0",
  /** NAS picker thumbnail */
  thumb: "h-10 w-full",
  /** Title bar blue slot — fixed band height; logo keeps aspect ratio */
  titleBar: "h-full w-full max-h-full max-w-full",
};

interface LiveStreamMarketingLogoProps {
  src: string;
  variant?: LiveStreamMarketingLogoVariant;
  className?: string;
  onError?: () => void;
}

/** Fits square or rectangular NAS logos (no manual pixel sizing). */
export function LiveStreamMarketingLogo({
  src,
  variant = "air",
  className,
  onError,
}: LiveStreamMarketingLogoProps) {
  const isAir = variant === "air";
  const isTitleBar = variant === "titleBar";

  return (
    <div
      className={cn(
        isAir
          ? "w-full overflow-hidden"
          : isTitleBar
            ? "flex h-full w-full max-h-full max-w-full items-center justify-center overflow-hidden"
            : "flex items-center justify-center overflow-hidden",
        VARIANT_BOX[variant],
        className,
      )}
    >
      <img
        src={src}
        alt=""
        className={cn(
          isAir
            ? "block w-full h-auto object-contain object-center"
            : isTitleBar
              ? "block max-h-full max-w-full h-auto w-auto object-contain object-center"
              : "max-h-full max-w-full h-auto w-auto object-contain object-center",
        )}
        loading={isTitleBar ? "eager" : "lazy"}
        decoding={isTitleBar ? "sync" : "async"}
        fetchPriority={isTitleBar ? "high" : undefined}
        onError={onError}
      />
    </div>
  );
}
