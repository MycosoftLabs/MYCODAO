import {
  applyYoutubeAudienceLevels,
  subscribeYoutubeEmbedEvents,
} from "./youtubeEmbedCommands";

const MOBILE_AUDIENCE_VOLUME = 85;

/** Android/mobile stacked layout — unmuted play nudge after iframe is in the DOM. */
export function kickMobileNewsYoutube(
  iframe: HTMLIFrameElement | null | undefined,
): void {
  if (!iframe) return;
  subscribeYoutubeEmbedEvents(iframe);
  applyYoutubeAudienceLevels(iframe, false, MOBILE_AUDIENCE_VOLUME);
}

export function scheduleMobileNewsYoutubeKicks(
  iframe: HTMLIFrameElement | null | undefined,
): () => void {
  const delays = [0, 200, 500, 1000, 1800, 3000];
  const timers = delays.map((ms) =>
    window.setTimeout(() => kickMobileNewsYoutube(iframe), ms),
  );
  return () => timers.forEach((id) => window.clearTimeout(id));
}
