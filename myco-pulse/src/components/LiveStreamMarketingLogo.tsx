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
  /** Title bar blue slot — explicit box (h-full collapses on mobile flex) */
  titleBar:
    "shrink-0 h-[20px] w-[44px] sm:h-[22px] sm:w-[52px] md:h-[52px] md:w-[90px]",
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
        isAir ? "w-full overflow-hidden" : "flex items-center justify-center overflow-hidden",
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
              ? "block h-full w-full object-contain object-center"
              : "max-h-full max-w-full h-auto w-auto object-contain object-center",
        )}
        loading={isTitleBar ? "eager" : "lazy"}
        decoding="async"
        onError={onError}
      />
    </div>
  );
}
