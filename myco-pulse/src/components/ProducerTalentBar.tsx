import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNewsProducer } from "../hooks/useNewsProducer";
import { NEWS_TALENT_BOTTOM_OFFSET } from "../lib/newsStudioLayout";
import { cn } from "../lib/utils";

type ProducerTalentPlacement = "lower-third" | "video-overlay";

interface ProducerTalentBarProps {
  className?: string;
  /** Desktop overlay vs mobile lower-third on the video frame (no extra black band). */
  placement?: ProducerTalentPlacement;
}

/** Lower-third talent from GET /api/news/producer (producer console). */
export function ProducerTalentBar({
  className,
  placement = "lower-third",
}: ProducerTalentBarProps) {
  const { talent, view } = useNewsProducer();
  const lines = talent.length ? talent : [];

  if (!lines.length) return null;

  const talentCard = (
    <AnimatePresence mode="wait">
      <motion.div
        key={view?.talentPresetId ?? view?.updatedAt ?? "talent"}
        initial={{ opacity: 0, y: placement === "video-overlay" ? 10 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: placement === "video-overlay" ? 6 : 4 }}
        transition={{ duration: 0.35 }}
        className={cn(
          "bg-[#0055cc]/95 border-l-4 border-white shadow-lg",
          placement === "video-overlay" ? "px-3 py-1.5 w-full" : "px-4 py-2",
        )}
      >
        {lines.map((line) => (
          <p
            key={`${line.name}-${line.creditLine ?? ""}`}
            className={cn(
              "font-black uppercase tracking-wide text-white leading-snug",
              placement === "video-overlay"
                ? "text-[10px] line-clamp-2"
                : "text-[11px] sm:text-xs",
            )}
          >
            {line.creditLine ?? line.name}
          </p>
        ))}
      </motion.div>
    </AnimatePresence>
  );

  if (placement === "video-overlay") {
    return (
      <div
        className={cn(
          "absolute bottom-0 left-0 right-9 z-30 pointer-events-none pl-2 pr-1 pb-1",
          className,
        )}
        aria-live="polite"
      >
        {talentCard}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute left-3 right-3 md:left-4 md:right-4 z-40 flex flex-col gap-2 max-w-md",
        className,
      )}
      style={{ bottom: NEWS_TALENT_BOTTOM_OFFSET }}
      aria-live="polite"
    >
      {talentCard}
    </div>
  );
}
