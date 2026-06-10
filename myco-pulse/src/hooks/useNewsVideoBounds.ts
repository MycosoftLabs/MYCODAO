import { useLayoutEffect, useState } from "react";
import type { PulseTabId } from "../components/PulseShellNav";
import type { PipPosition, PipSize } from "../lib/newsPersistentPlayerContext";

interface UseNewsVideoBoundsOptions {
  activeTab: PulseTabId;
  showPip: boolean;
  newsVideoAnchor: HTMLElement | null;
  pipMediaSlot: HTMLElement | null;
  pipPosition: PipPosition | null;
  pipSize: PipSize | null;
}

function pickMeasureTarget({
  activeTab,
  showPip,
  newsVideoAnchor,
  pipMediaSlot,
}: UseNewsVideoBoundsOptions): HTMLElement | null {
  if (showPip && pipMediaSlot) return pipMediaSlot;
  if (activeTab === "News" && newsVideoAnchor) return newsVideoAnchor;
  return null;
}

/** Track viewport rect for the news video anchor or PiP slot (ResizeObserver + scroll). */
export function useNewsVideoBounds(options: UseNewsVideoBoundsOptions) {
  const [bounds, setBounds] = useState<DOMRect | null>(null);

  const { activeTab, showPip, newsVideoAnchor, pipMediaSlot, pipPosition, pipSize } =
    options;

  useLayoutEffect(() => {
    const measure = () => {
      const target = pickMeasureTarget({
        activeTab,
        showPip,
        newsVideoAnchor,
        pipMediaSlot,
        pipPosition,
        pipSize,
      });
      setBounds(target ? target.getBoundingClientRect() : null);
    };

    measure();

    const target = pickMeasureTarget({
      activeTab,
      showPip,
      newsVideoAnchor,
      pipMediaSlot,
      pipPosition,
      pipSize,
    });
    const observer = new ResizeObserver(measure);
    if (newsVideoAnchor) observer.observe(newsVideoAnchor);
    if (pipMediaSlot) observer.observe(pipMediaSlot);
    if (target && target !== newsVideoAnchor && target !== pipMediaSlot) {
      observer.observe(target);
    }

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [
    activeTab,
    showPip,
    newsVideoAnchor,
    pipMediaSlot,
    pipPosition?.x,
    pipPosition?.y,
    pipSize?.width,
    pipSize?.videoHeight,
  ]);

  return bounds;
}
