import React, { useCallback, useEffect, useRef } from "react";
import { Maximize2, X, GripHorizontal, Radio } from "lucide-react";
import { cn } from "../lib/utils";
import { useNewsProgram } from "../lib/newsProgramContext";
import { useNewsPersistentPlayer } from "../lib/newsPersistentPlayerContext";
import {
  clampPipPosition,
  clampPipSize,
  DEFAULT_PIP_SIZE,
  defaultPipPosition,
  PIP_CHROME_HEIGHT,
  pipTotalHeight,
} from "../lib/newsPipLayout";
import type { PipSize } from "../lib/newsPipLayout";
import { useMediaMinMd } from "../hooks/useMediaMinMd";
import type { PulseTabId } from "./PulseShellNav";

const PIP_LABEL = "News";

interface NewsFloatingPlayerProps {
  activeTab: PulseTabId;
  setActiveTab: (tab: PulseTabId) => void;
}

/** Draggable PiP on tablet/desktop only (768px+); never on phone. */
export function NewsFloatingPlayer({
  activeTab,
  setActiveTab,
}: NewsFloatingPlayerProps) {
  const {
    userStoppedPip,
    setUserStoppedPip,
    pipPosition,
    setPipPosition,
    pipSize,
    setPipSize,
    stopPlayback,
    registerPipMediaSlot,
  } = useNewsPersistentPlayer();

  const { playbackUrl, showBumper, bumperUrl } = useNewsProgram();
  const hasProgramSurface = Boolean(playbackUrl) || (showBumper && bumperUrl);
  const pipEnabled = useMediaMinMd();

  const isNewsTab = activeTab === "News";
  /** PiP is desktop-only — mobile layout unchanged when leaving News. */
  const showPip =
    pipEnabled && !isNewsTab && hasProgramSurface && !userStoppedPip;

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const resizeRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originWidth: number;
    originVideoHeight: number;
  } | null>(null);

  const resolvedSize = pipSize ?? DEFAULT_PIP_SIZE;
  const resolvedPosition = pipPosition ?? defaultPipPosition(resolvedSize);

  useEffect(() => {
    if (isNewsTab) {
      setUserStoppedPip(false);
    }
  }, [isNewsTab, setUserStoppedPip]);

  useEffect(() => {
    if (!showPip) return;
    if (!pipSize) setPipSize(DEFAULT_PIP_SIZE);
    if (!pipPosition) setPipPosition(defaultPipPosition(pipSize ?? DEFAULT_PIP_SIZE));
  }, [showPip, pipSize, pipPosition, setPipSize, setPipPosition]);

  useEffect(() => {
    if (!showPip || !pipPosition) return;

    const onWindowResize = () => {
      const size = clampPipSize(pipSize ?? DEFAULT_PIP_SIZE);
      setPipSize(size);
      setPipPosition(clampPipPosition(pipPosition.x, pipPosition.y, size));
    };

    window.addEventListener("resize", onWindowResize);
    return () => window.removeEventListener("resize", onWindowResize);
  }, [showPip, pipPosition, pipSize, setPipPosition, setPipSize]);

  const applyPipSize = useCallback(
    (next: PipSize) => {
      const clamped = clampPipSize(next);
      setPipSize(clamped);
      if (pipPosition) {
        setPipPosition(
          clampPipPosition(pipPosition.x, pipPosition.y, clamped),
        );
      }
    },
    [pipPosition, setPipPosition, setPipSize],
  );

  const onExpand = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      setActiveTab("News");
    },
    [setActiveTab],
  );

  const onClosePip = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      stopPlayback();
    },
    [stopPlayback],
  );

  const onDragPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (resizeRef.current) return;
      const pos = pipPosition ?? defaultPipPosition(resolvedSize);
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: pos.x,
        originY: pos.y,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [pipPosition, resolvedSize],
  );

  const onDragPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      setPipPosition(
        clampPipPosition(
          drag.originX + dx,
          drag.originY + dy,
          resolvedSize,
        ),
      );
    },
    [resolvedSize, setPipPosition],
  );

  const onDragPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    },
    [],
  );

  const onResizePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      event.preventDefault();
      resizeRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originWidth: resolvedSize.width,
        originVideoHeight: resolvedSize.videoHeight,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [resolvedSize],
  );

  const onResizePointerMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const resize = resizeRef.current;
      if (!resize || resize.pointerId !== event.pointerId) return;
      const dx = event.clientX - resize.startX;
      const dy = event.clientY - resize.startY;
      applyPipSize({
        width: resize.originWidth + dx,
        videoHeight: resize.originVideoHeight + dy,
      });
    },
    [applyPipSize],
  );

  const onResizePointerUp = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const resize = resizeRef.current;
      if (!resize || resize.pointerId !== event.pointerId) return;
      resizeRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    },
    [],
  );

  if (!showPip) {
    return null;
  }

  return (
    <div
      className={cn("news-floating-player news-floating-player--pip")}
      style={{
        position: "fixed",
        top: resolvedPosition.y,
        left: resolvedPosition.x,
        width: resolvedSize.width,
        height: pipTotalHeight(resolvedSize),
        zIndex: 55,
      }}
    >
      <div className="news-floating-player-chrome flex items-center gap-1 px-2 py-1.5 bg-[var(--myco-bg)]/95 border border-white/10 border-b-0 touch-manipulation shrink-0">
        <div
          className="flex items-center gap-1 flex-1 min-w-0 min-h-[44px] cursor-grab active:cursor-grabbing"
          onPointerDown={onDragPointerDown}
          onPointerMove={onDragPointerMove}
          onPointerUp={onDragPointerUp}
          onPointerCancel={onDragPointerUp}
        >
          <GripHorizontal className="size-4 text-dim shrink-0" aria-hidden />
          <Radio
            className="size-3 text-myco-accent shrink-0 animate-pulse"
            aria-hidden
          />
          <span className="text-[10px] font-bold uppercase tracking-wider truncate flex-1 min-w-0">
            {PIP_LABEL}
          </span>
        </div>

        <button
          type="button"
          onClick={onExpand}
          onPointerDown={(event) => event.stopPropagation()}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-sm hover:bg-white/10 text-white touch-manipulation shrink-0"
          aria-label="Expand to News"
        >
          <Maximize2 className="size-4" />
        </button>

        <button
          type="button"
          onClick={onClosePip}
          onPointerDown={(event) => event.stopPropagation()}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-sm hover:bg-white/10 text-dim hover:text-white touch-manipulation shrink-0"
          aria-label="Close and stop News player"
        >
          <X className="size-4" />
        </button>
      </div>

      <div
        className="relative overflow-hidden flex-1 min-h-0 border border-white/10 border-t-0 bg-transparent"
        style={{ height: resolvedSize.videoHeight }}
      >
        <div
          ref={registerPipMediaSlot}
          className="absolute inset-0"
          data-news-media-slot="pip"
        />

        <button
          type="button"
          className="news-floating-player-resize-handle"
          aria-label="Resize picture-in-picture player"
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          onPointerCancel={onResizePointerUp}
        />
      </div>
    </div>
  );
}
