/** PostMessage commands for YouTube embeds (requires enablejsapi=1 on iframe src). */

export const YOUTUBE_PLAYER_STATE = {
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

export function postYoutubeEmbedCommand(
  iframe: HTMLIFrameElement | null | undefined,
  func: string,
  args: unknown[] = [],
): void {
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(
    JSON.stringify({ event: "command", func, args }),
    "*",
  );
}

export function setYoutubeEmbedMuted(
  iframe: HTMLIFrameElement | null | undefined,
  muted: boolean,
): void {
  postYoutubeEmbedCommand(iframe, muted ? "mute" : "unMute");
}

export function setYoutubeEmbedVolume(
  iframe: HTMLIFrameElement | null | undefined,
  volumePercent: number,
): void {
  const clamped = Math.max(0, Math.min(100, Math.round(volumePercent)));
  postYoutubeEmbedCommand(iframe, "setVolume", [clamped]);
}

export function playYoutubeEmbed(
  iframe: HTMLIFrameElement | null | undefined,
): void {
  postYoutubeEmbedCommand(iframe, "playVideo");
}

/** Volume first while muted, then unmute + play — avoids mobile pause after unMute. */
export function applyYoutubeAudienceLevels(
  iframe: HTMLIFrameElement | null | undefined,
  muted: boolean,
  volumePercent: number,
): void {
  if (!iframe) return;
  if (muted) {
    setYoutubeEmbedMuted(iframe, true);
    return;
  }
  setYoutubeEmbedVolume(iframe, volumePercent);
  setYoutubeEmbedMuted(iframe, false);
  playYoutubeEmbed(iframe);
}

/** Ask the embed to post player state / readiness events to the parent window. */
export function subscribeYoutubeEmbedEvents(
  iframe: HTMLIFrameElement | null | undefined,
): void {
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(
    JSON.stringify({ event: "listening", id: iframe.id || "news-yt-embed" }),
    "*",
  );
  postYoutubeEmbedCommand(iframe, "addEventListener", ["onStateChange"]);
}

export function parseYoutubeEmbedMessage(
  data: unknown,
): { event?: string; info?: number | Record<string, unknown> } | null {
  if (typeof data !== "string") return null;
  try {
    const parsed = JSON.parse(data) as {
      event?: string;
      info?: number | Record<string, unknown>;
    };
    return parsed?.event ? parsed : null;
  } catch {
    return null;
  }
}

export function readYoutubePlayerState(
  info: number | Record<string, unknown> | undefined,
): number | null {
  if (typeof info === "number") return info;
  if (info && typeof info === "object" && "playerState" in info) {
    const state = info.playerState;
    return typeof state === "number" ? state : null;
  }
  return null;
}
