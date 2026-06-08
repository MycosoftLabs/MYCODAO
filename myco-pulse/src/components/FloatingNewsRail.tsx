import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "../lib/utils";
import type { BroadcastNewsLine } from "../data/studioPresets";

const GLASS_WIDTH_PX = 300;
/** Fallback before ResizeObserver measures the safe-zone column. */
const GLASS_HEIGHT_FALLBACK_PX = 520;
const ROW_GAP_PX = 6;
const INACTIVE_ROW_PX = 34;
/** Fixed active card height — summary scrolls inside; prevents stack math drift. */
const ACTIVE_ROW_PX = 168;

/** Keep rail inside video margins (clear acquisition top-left + talent bottom-left). */
const SAFE_ZONE_TOP = "5.75rem";
const SAFE_ZONE_BOTTOM = "7.25rem";
const SAFE_ZONE_RIGHT = "1rem";

function clipSummary(text: string | undefined, maxSentences = 2): string {
  const raw = text?.trim();
  if (!raw) return "";
  const parts = raw.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g);
  if (!parts?.length) return raw.slice(0, 280);
  return parts
    .slice(0, maxSentences)
    .join(" ")
    .trim();
}

function inactiveOpacity(index: number, activeIndex: number): number {
  const dist = Math.abs(index - activeIndex);
  if (dist === 0) return 1;
  if (dist === 1) return 0.82;
  if (dist === 2) return 0.65;
  if (dist === 3) return 0.5;
  return 0.38;
}

function rowHeight(index: number, activeIndex: number): number {
  return index === activeIndex ? ACTIVE_ROW_PX : INACTIVE_ROW_PX;
}

function stackHeight(lineCount: number, activeIndex: number): number {
  if (!lineCount) return 0;
  let total = 0;
  for (let i = 0; i < lineCount; i++) {
    total += rowHeight(i, activeIndex);
    if (i < lineCount - 1) total += ROW_GAP_PX;
  }
  return total;
}

function stackTranslateY(
  activeIndex: number,
  lineCount: number,
  glassHeightPx: number,
): number {
  if (!lineCount) return 0;

  let topOfActive = 0;
  for (let i = 0; i < activeIndex; i++) {
    topOfActive += INACTIVE_ROW_PX + ROW_GAP_PX;
  }

  const total = stackHeight(lineCount, activeIndex);
  const activeBottom = topOfActive + ACTIVE_ROW_PX;

  if (total <= glassHeightPx) {
    const activeCenter = topOfActive + ACTIVE_ROW_PX / 2;
    let y = glassHeightPx / 2 - activeCenter;
    y = Math.min(0, Math.max(glassHeightPx - total, y));
    return y;
  }

  let y = glassHeightPx / 2 - (topOfActive + ACTIVE_ROW_PX / 2);
  if (activeBottom + y > glassHeightPx) {
    y = glassHeightPx - activeBottom;
  }
  if (topOfActive + y < 0) {
    y = -topOfActive;
  }
  return y;
}

interface FloatingNewsRailProps {
  lines: BroadcastNewsLine[];
  activeIndex: number;
  pageKey: number;
}

export function FloatingNewsRail({
  lines,
  activeIndex,
  pageKey,
}: FloatingNewsRailProps) {
  const glassRef = useRef<HTMLDivElement>(null);
  const [glassHeightPx, setGlassHeightPx] = useState(GLASS_HEIGHT_FALLBACK_PX);

  useEffect(() => {
    const el = glassRef.current;
    if (!el) return;
    const measure = () => setGlassHeightPx(el.clientHeight || GLASS_HEIGHT_FALLBACK_PX);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const translateY = useMemo(
    () => stackTranslateY(activeIndex, lines.length, glassHeightPx),
    [activeIndex, lines.length, glassHeightPx],
  );

  if (!lines.length) return null;

  return (
    <div
      className="absolute z-30 hidden md:flex pointer-events-none items-stretch justify-end"
      style={{
        top: SAFE_ZONE_TOP,
        bottom: SAFE_ZONE_BOTTOM,
        right: SAFE_ZONE_RIGHT,
        width: GLASS_WIDTH_PX,
        maxWidth: "min(32vw, 300px)",
      }}
      aria-label="Floating News Rail"
    >
      <div
        ref={glassRef}
        className="relative w-full h-full min-h-[240px] max-h-full isolate"
      >
        <div
          className={cn(
            "absolute inset-0 rounded-sm overflow-hidden",
            "bg-white/[0.12] backdrop-blur-xl backdrop-saturate-150",
            "border border-white/25 shadow-[0_12px_40px_rgba(0,0,0,0.55)]",
          )}
          aria-hidden
        />

        <div className="absolute inset-0 overflow-hidden px-2.5 py-2.5">
          <motion.div
            key={pageKey}
            className="relative w-full flex flex-col"
            initial={false}
            animate={{ y: translateY }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{ willChange: "transform" }}
          >
            {lines.map((line, i) => {
              const isActive = i === activeIndex;
              const summary = clipSummary(line.summary);
              const h = rowHeight(i, activeIndex);

              return (
                <motion.div
                  key={line.id}
                  className="w-full shrink-0 overflow-hidden"
                  style={{
                    height: h,
                    minHeight: h,
                    maxHeight: h,
                    marginBottom: i < lines.length - 1 ? ROW_GAP_PX : 0,
                  }}
                  animate={{ opacity: inactiveOpacity(i, activeIndex) }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  {isActive ? (
                    <div className="h-full w-full flex flex-col overflow-hidden">
                      <div className="w-full shrink-0 bg-white border-l-[5px] border-l-[#0055cc] pl-2.5 pr-2.5 py-2 shadow-[0_6px_20px_rgba(0,0,0,0.4)] rounded-t-sm text-left">
                        <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#0055cc] mb-1 leading-tight line-clamp-1">
                          {line.label}
                        </p>
                        <p className="text-[10px] font-black uppercase leading-[1.28] text-black line-clamp-3 text-left [overflow-wrap:anywhere]">
                          {line.headline}
                        </p>
                      </div>

                      <div
                        className={cn(
                          "flex-1 min-h-0 w-full flex flex-col overflow-hidden",
                          "bg-white/22 backdrop-blur-md backdrop-saturate-150",
                          "border border-white/40 border-t-white/25",
                          "rounded-b-sm px-2.5 py-2",
                          "shadow-[0_4px_16px_rgba(0,0,0,0.35)]",
                        )}
                        aria-live="polite"
                      >
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={`${line.id}-${pageKey}-detail`}
                            className="min-h-0 overflow-y-auto no-scrollbar"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                          >
                            {summary ? (
                              <p className="text-[10px] font-medium normal-case leading-[1.45] text-white line-clamp-4 [overflow-wrap:anywhere] [text-shadow:0_1px_3px_rgba(0,0,0,0.65)]">
                                {summary}
                              </p>
                            ) : (
                              <p className="text-[10px] font-medium normal-case leading-snug text-white/50 italic line-clamp-2">
                                Wire summary unavailable for this headline.
                              </p>
                            )}
                            {line.source ? (
                              <p className="mt-1 text-[8px] font-bold uppercase tracking-wider text-white/45 line-clamp-1">
                                {line.source}
                              </p>
                            ) : null}
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full w-full grid grid-cols-[minmax(3.75rem,34%)_1fr] gap-x-2 items-start py-0.5 text-left">
                      <span className="text-[8px] font-black uppercase tracking-[0.12em] text-[#8ec8ff]/90 leading-[1.25] line-clamp-2 [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
                        {line.label}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wide leading-[1.25] text-white/55 line-clamp-2 min-w-0 [text-shadow:0_1px_4px_rgba(0,0,0,0.9)] [overflow-wrap:anywhere]">
                        {line.headline}
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

