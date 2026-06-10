/** Shared YouTube → privacy-enhanced embed URL (server + docs). */

const EMBED_HOST = "https://www.youtube-nocookie.com";

function isYoutubeHost(host: string): boolean {
  return (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtube-nocookie.com"
  );
}

function appendPlaylistParams(
  embedBase: string,
  listId: string | null,
  index: string | null,
): string {
  if (!listId?.trim()) return embedBase;
  try {
    const url = new URL(embedBase);
    url.searchParams.set("list", listId.trim());
    if (index?.trim()) url.searchParams.set("index", index.trim());
    return url.toString();
  } catch {
    const sep = embedBase.includes("?") ? "&" : "?";
    let q = `list=${encodeURIComponent(listId.trim())}`;
    if (index?.trim()) q += `&index=${encodeURIComponent(index.trim())}`;
    return `${embedBase}${sep}${q}`;
  }
}

/** Parse watch/playlist URLs — preserves `list` so Cut to URL plays full playlists. */
export function normalizeYoutubeEmbedPath(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "");
    const listId = url.searchParams.get("list");
    const index = url.searchParams.get("index");

    if (host === "youtu.be") {
      const id = url.pathname.replace(/^\//, "").split("/")[0];
      if (id) {
        return appendPlaylistParams(`${EMBED_HOST}/embed/${id}`, listId, index);
      }
    }

    if (isYoutubeHost(host)) {
      if (url.pathname.startsWith("/embed/")) {
        const pathOnly = `${EMBED_HOST}${url.pathname.split("?")[0]}`;
        const existingList = url.searchParams.get("list") || listId;
        if (
          pathOnly.endsWith("/embed/videoseries") ||
          url.pathname.includes("videoseries")
        ) {
          const base = `${EMBED_HOST}/embed/videoseries`;
          return appendPlaylistParams(base, existingList, index);
        }
        return appendPlaylistParams(pathOnly, existingList, index);
      }

      if (url.pathname === "/playlist" || url.pathname.startsWith("/playlist")) {
        if (listId) {
          return appendPlaylistParams(
            `${EMBED_HOST}/embed/videoseries`,
            listId,
            index,
          );
        }
      }

      const v = url.searchParams.get("v");
      if (v) {
        if (listId) {
          return appendPlaylistParams(
            `${EMBED_HOST}/embed/videoseries`,
            listId,
            index ?? url.searchParams.get("index"),
          );
        }
        return `${EMBED_HOST}/embed/${v}`;
      }

      const liveMatch = url.pathname.match(/^\/live\/([^/]+)/);
      if (liveMatch?.[1]) {
        return appendPlaylistParams(
          `${EMBED_HOST}/embed/${liveMatch[1]}`,
          listId,
          index,
        );
      }
    }
  } catch {
    /* fall through */
  }

  if (/^[\w-]{6,}$/.test(trimmed) && !trimmed.includes("/")) {
    return `${EMBED_HOST}/embed/${trimmed}`;
  }

  if (/^PL[\w-]+$/.test(trimmed)) {
    return `${EMBED_HOST}/embed/videoseries?list=${encodeURIComponent(trimmed)}`;
  }

  return trimmed.startsWith("http") ? trimmed : null;
}

export function withNewsPlayerParams(embedBase: string): string {
  try {
    const url = new URL(embedBase);
    url.searchParams.set("autoplay", "1");
    url.searchParams.set("mute", "0");
    url.searchParams.set("controls", "0");
    url.searchParams.set("modestbranding", "1");
    url.searchParams.set("rel", "0");
    url.searchParams.set("iv_load_policy", "3");
    url.searchParams.set("cc_load_policy", "0");
    url.searchParams.set("disablekb", "1");
    url.searchParams.set("playsinline", "1");
    url.searchParams.set("fs", "0");
    url.searchParams.set("enablejsapi", "0");
    url.searchParams.set("showinfo", "0");
    url.searchParams.set("autohide", "1");
    if (
      url.searchParams.has("list") ||
      url.pathname.endsWith("/videoseries")
    ) {
      url.searchParams.set("listType", "playlist");
    }
    return url.toString();
  } catch {
    const sep = embedBase.includes("?") ? "&" : "?";
    return `${embedBase}${sep}autoplay=1&mute=0&controls=0&modestbranding=1&rel=0&iv_load_policy=3&cc_load_policy=0&disablekb=1&playsinline=1&fs=0&enablejsapi=0`;
  }
}

export function buildYoutubeEmbedFromSource(source: {
  videoId?: string;
  videoUrl?: string;
  channelId?: string;
}): string | null {
  if (source.channelId?.trim()) {
    return withNewsPlayerParams(
      `${EMBED_HOST}/embed/live_stream?channel=${encodeURIComponent(source.channelId.trim())}`,
    );
  }

  const raw = source.videoUrl?.trim() || source.videoId?.trim();
  if (!raw) return null;

  const path = source.videoUrl?.trim()
    ? normalizeYoutubeEmbedPath(source.videoUrl)
    : `${EMBED_HOST}/embed/${source.videoId!.trim()}`;

  return path ? withNewsPlayerParams(path) : null;
}

/** Stable React key for iframe — ignore autoplay param churn across polls. */
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
