/** Layout constants and helpers for the floating News PiP player. */

export interface PipPosition {
  x: number;
  y: number;
}

export interface PipSize {
  width: number;
  videoHeight: number;
}

export const PIP_CHROME_HEIGHT = 40;
export const PIP_DEFAULT_WIDTH = 300;
export const PIP_DEFAULT_VIDEO_HEIGHT = 169;
export const PIP_MARGIN = 16;
export const PIP_BOTTOM_NAV_RESERVE = 72;
export const PIP_MIN_WIDTH = 160;
export const PIP_MIN_VIDEO_HEIGHT = 90;
export const PIP_MAX_WIDTH_RATIO = 0.92;
export const PIP_MAX_VIDEO_HEIGHT_RATIO = 0.55;

export const DEFAULT_PIP_SIZE: PipSize = {
  width: PIP_DEFAULT_WIDTH,
  videoHeight: PIP_DEFAULT_VIDEO_HEIGHT,
};

function viewportLimits() {
  if (typeof window === "undefined") {
    return { maxWidth: 640, maxVideoHeight: 480 };
  }
  return {
    maxWidth: Math.floor(window.innerWidth * PIP_MAX_WIDTH_RATIO),
    maxVideoHeight: Math.floor(
      (window.innerHeight - PIP_BOTTOM_NAV_RESERVE - PIP_MARGIN) *
        PIP_MAX_VIDEO_HEIGHT_RATIO,
    ),
  };
}

export function clampPipSize(size: PipSize): PipSize {
  const { maxWidth, maxVideoHeight } = viewportLimits();
  return {
    width: Math.min(
      Math.max(PIP_MIN_WIDTH, size.width),
      Math.max(PIP_MIN_WIDTH, maxWidth),
    ),
    videoHeight: Math.min(
      Math.max(PIP_MIN_VIDEO_HEIGHT, size.videoHeight),
      Math.max(PIP_MIN_VIDEO_HEIGHT, maxVideoHeight),
    ),
  };
}

export function pipTotalHeight(size: PipSize): number {
  return PIP_CHROME_HEIGHT + size.videoHeight;
}

export function defaultPipPosition(size: PipSize = DEFAULT_PIP_SIZE): PipPosition {
  if (typeof window === "undefined") {
    return { x: PIP_MARGIN, y: PIP_MARGIN };
  }
  const totalH = pipTotalHeight(size);
  return {
    x: Math.max(PIP_MARGIN, window.innerWidth - size.width - PIP_MARGIN),
    y: Math.max(
      PIP_MARGIN,
      window.innerHeight - totalH - PIP_BOTTOM_NAV_RESERVE - PIP_MARGIN,
    ),
  };
}

export function clampPipPosition(
  x: number,
  y: number,
  size: PipSize,
): PipPosition {
  if (typeof window === "undefined") return { x, y };
  const totalH = pipTotalHeight(size);
  const maxX = Math.max(PIP_MARGIN, window.innerWidth - size.width - PIP_MARGIN);
  const maxY = Math.max(
    PIP_MARGIN,
    window.innerHeight - totalH - PIP_BOTTOM_NAV_RESERVE - PIP_MARGIN,
  );
  return {
    x: Math.min(Math.max(PIP_MARGIN, x), maxX),
    y: Math.min(Math.max(PIP_MARGIN, y), maxY),
  };
}
