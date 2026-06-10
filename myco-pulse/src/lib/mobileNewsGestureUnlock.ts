import { kickMobileNewsYoutube } from "./mobileNewsYoutubeKick";

/** Android Chrome/WebView: unmuted YouTube needs a recent user activation. */
const GESTURE_WINDOW_MS = 1500;

let lastUserGestureMs = 0;
let stackedIframe: HTMLIFrameElement | null = null;
let stackedEmbedSrc: string | null = null;
const unlockListeners = new Set<() => void>();

function notifyGestureUnlock(): void {
  unlockListeners.forEach((listener) => listener());
}

export function subscribeMobileNewsGestureUnlock(
  listener: () => void,
): () => void {
  unlockListeners.add(listener);
  return () => unlockListeners.delete(listener);
}

export function markMobileNewsUserGesture(): void {
  lastUserGestureMs = Date.now();
  notifyGestureUnlock();
  applyGestureToStackedIframe();
}

export function hasRecentMobileNewsGesture(): boolean {
  return Date.now() - lastUserGestureMs <= GESTURE_WINDOW_MS;
}

export function forceStackedNewsIframeSrc(
  iframe: HTMLIFrameElement,
  embedSrc: string,
): void {
  const current = iframe.getAttribute("src") ?? iframe.src ?? "";
  if (current === embedSrc) {
    kickMobileNewsYoutube(iframe);
    return;
  }
  iframe.src = "about:blank";
  iframe.src = embedSrc;
  kickMobileNewsYoutube(iframe);
}

function applyGestureToStackedIframe(): void {
  if (!stackedIframe || !stackedEmbedSrc) return;
  if (!hasRecentMobileNewsGesture()) return;
  forceStackedNewsIframeSrc(stackedIframe, stackedEmbedSrc);
}

/** Call from pointerdown (sync) anywhere on News chrome or News tab nav. */
export function handleMobileNewsPointerDown(): void {
  markMobileNewsUserGesture();
}

export function registerMobileNewsStackedPlayer(
  iframe: HTMLIFrameElement | null,
  embedSrc: string | null,
): void {
  stackedIframe = iframe;
  stackedEmbedSrc = embedSrc;

  if (!iframe || !embedSrc) return;

  const activation =
    typeof navigator !== "undefined"
      ? (navigator as Navigator & { userActivation?: { isActive?: boolean } })
          .userActivation?.isActive
      : false;

  if (activation || hasRecentMobileNewsGesture()) {
    forceStackedNewsIframeSrc(iframe, embedSrc);
  }
}

export function clearMobileNewsStackedPlayer(): void {
  stackedIframe = null;
  stackedEmbedSrc = null;
}
