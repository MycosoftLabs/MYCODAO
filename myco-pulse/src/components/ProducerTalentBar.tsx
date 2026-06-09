import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNewsProducer } from "../hooks/useNewsProducer";
import { cn } from "../lib/utils";

/** Lower-third talent from GET /api/news/producer (producer console). */
export function ProducerTalentBar({ className }: { className?: string }) {
  const { talent, view } = useNewsProducer();
  const lines = talent.length ? talent : [];

  if (!lines.length) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-[72px] left-4 right-4 z-40 flex flex-col gap-2 max-w-md",
        className,
      )}
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={view?.talentPresetId ?? view?.updatedAt ?? "talent"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.35 }}
          className="bg-[#0055cc]/95 border-l-4 border-white px-4 py-2 shadow-lg"
        >
          {lines.map((line) => (
            <p
              key={`${line.name}-${line.creditLine ?? ""}`}
              className="text-[11px] sm:text-xs font-black uppercase tracking-wide text-white leading-snug"
            >
              {line.creditLine ?? line.name}
            </p>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
