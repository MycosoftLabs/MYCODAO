/** PostMessage commands for YouTube embeds (requires enablejsapi=1 on iframe src). */

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
