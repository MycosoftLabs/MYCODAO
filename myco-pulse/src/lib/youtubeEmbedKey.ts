/** Client-side stable key for YouTube iframe (playlist, live channel, single video). */
export function youtubeEmbedStableKey(embedUrl: string): string {
  try {
    const url = new URL(embedUrl);
    const list = url.searchParams.get("list");
    if (list) return `pl-${list}`;

    const channel = url.searchParams.get("channel");
    if (channel && url.pathname.includes("live_stream")) {
      return `live-${channel}`;
    }

    const segments = url.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && last !== "embed") {
      return `v-${last}`;
    }

    const v = url.searchParams.get("v");
    if (v) return `v-${v}`;

    return `path-${url.pathname}`;
  } catch {
    return embedUrl;
  }
}
