/** Client-side YouTube embed params (mirrors repo root lib/news-channel-embed.ts). */

export function withNewsPlayerParams(
  embedBase: string,
  options?: { preferMutedAutoplay?: boolean },
): string {
  const preferMuted = options?.preferMutedAutoplay ?? false;
  try {
    const url = new URL(embedBase);
    url.searchParams.delete("cc_load_policy");
    url.searchParams.delete("cc_lang_pref");
    url.searchParams.set("autoplay", "1");
    url.searchParams.set("mute", preferMuted ? "1" : "0");
    url.searchParams.set("controls", "0");
    url.searchParams.set("modestbranding", "1");
    url.searchParams.set("rel", "0");
    url.searchParams.set("iv_load_policy", "3");
    url.searchParams.set("cc_load_policy", "0");
    url.searchParams.set("disablekb", "1");
    url.searchParams.set("playsinline", "1");
    url.searchParams.set("fs", "0");
    url.searchParams.set("enablejsapi", "1");
    if (typeof window !== "undefined" && window.location?.origin) {
      url.searchParams.set("origin", window.location.origin);
    }
    url.searchParams.set("showinfo", "0");
    url.searchParams.set("autohide", "1");
    if (url.searchParams.has("list") || url.pathname.endsWith("/videoseries")) {
      url.searchParams.set("listType", "playlist");
    }
    return url.toString();
  } catch {
    const sep = embedBase.includes("?") ? "&" : "?";
    const mute = preferMuted ? "1" : "0";
    return `${embedBase}${sep}autoplay=1&mute=${mute}&controls=0&modestbranding=1&rel=0&iv_load_policy=3&cc_load_policy=0&disablekb=1&playsinline=1&fs=0&enablejsapi=1`;
  }
}

export function isYoutubeEmbedUrl(url: string): boolean {
  return /youtube\.com|youtube-nocookie\.com|youtu\.be/i.test(url);
}
