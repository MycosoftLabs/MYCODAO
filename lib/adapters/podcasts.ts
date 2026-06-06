/**
 * Podcast episodes: RSS feeds (PODCAST_RSS_URLS comma-separated). No placeholder episodes.
 * Show copy & Season 1 guide: docs/MYCOPOD_PODCAST_REFERENCE_JUN06_2026.md, myco-pulse/src/data/mycopodShow.ts
 */

import type { PodcastEpisode, PodcastMediaKind } from "@/lib/types";
import Parser from "rss-parser";

type RssItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  contentSnippet?: string;
  summary?: string;
  enclosure?: { url?: string; type?: string };
  itunes?: { image?: string; duration?: string };
};

const parser = new Parser();

const RSS_PARSE_TIMEOUT_MS = 18_000;

/** Official MycoPOD feed (MycoDAO podcast on RSS.com). */
export const MYCOPOD_RSS_URL = "https://media.rss.com/mycopod/feed.xml";

/** Default when PODCAST_RSS_URLS is unset — MycoPOD first; optional extra feeds via env. */
const DEFAULT_PODCAST_RSS = [MYCOPOD_RSS_URL] as const;

function parseUrlWithTimeout(feedUrl: string): Promise<Awaited<ReturnType<Parser["parseURL"]>>> {
  return Promise.race([
    parser.parseURL(feedUrl),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("RSS parse timeout")), RSS_PARSE_TIMEOUT_MS);
    }),
  ]);
}

export async function fetchPodcastEpisodes(): Promise<PodcastEpisode[]> {
  const raw = process.env.PODCAST_RSS_URLS?.trim();
  const urls = raw
    ? raw
        .split(",")
        .map((u) => u.trim())
        .filter(Boolean)
    : [...DEFAULT_PODCAST_RSS];
  const out: PodcastEpisode[] = [];
  let idx = 0;
  for (const feedUrl of urls.slice(0, 5)) {
    try {
      const feed = await parseUrlWithTimeout(feedUrl);
      const show = feed.title || "MycoPOD";
      const feedImage =
        (feed as { itunes?: { image?: string } }).itunes?.image ||
        feed.image?.url ||
        undefined;
      for (const rawItem of feed.items.slice(0, 8)) {
        const episode = itemToEpisode(rawItem as RssItem, show, idx++, feedImage);
        if (episode) out.push(episode);
      }
    } catch {
      /* next feed */
    }
  }

  return out.slice(0, 48);
}

function itemToEpisode(
  item: RssItem,
  show: string,
  idx: number,
  feedImage?: string
): PodcastEpisode | null {
  const title = (item.title || "Episode").slice(0, 200);
  const pub = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();
  const itunes = item.itunes;
  const enc = item.enclosure;
  const encUrl = enc?.url?.trim() || "";
  const encType = (enc?.type || "").toLowerCase();

  const youtubeEmbed = item.link ? youtubeEmbedUrl(item.link) : null;

  let mediaKind: PodcastMediaKind = "audio";
  let audioUrl = encUrl;
  let embedUrl: string | undefined;

  if (youtubeEmbed) {
    mediaKind = "video";
    embedUrl = youtubeEmbed;
    if (encType.startsWith("audio/") && encUrl) {
      audioUrl = encUrl;
    } else if (encType.startsWith("video/") && encUrl) {
      audioUrl = encUrl;
    } else {
      audioUrl = encUrl || item.link || "";
    }
  } else if (encType.startsWith("video/") && encUrl) {
    mediaKind = "video";
    audioUrl = encUrl;
  } else if (encType.startsWith("audio/") && encUrl) {
    mediaKind = "audio";
    audioUrl = encUrl;
  } else if (encUrl) {
    if (/\.(mp4|webm|m3u8|mov)(\?|$)/i.test(encUrl)) {
      mediaKind = "video";
      audioUrl = encUrl;
    } else {
      mediaKind = "audio";
      audioUrl = encUrl;
    }
  } else if (item.link) {
    audioUrl = item.link;
    mediaKind = "audio";
  } else {
    return null;
  }

  if (!audioUrl) return null;

  return {
    id: `rss-${idx}-${hashShort(title + pub)}`,
    title,
    show,
    description: (item.contentSnippet || (item as { summary?: string }).summary || "").slice(0, 400),
    audioUrl,
    mediaKind,
    embedUrl,
    image: itunes?.image || feedImage,
    durationSec: itunes?.duration ? parseItunesDuration(String(itunes.duration)) : 1800,
    publishedAt: pub,
  };
}

function hashShort(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

export function youtubeEmbedUrl(link: string): string | null {
  const u = link.trim();
  const m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (m) return `https://www.youtube.com/embed/${m[1]}?rel=0`;
  const live = u.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/);
  if (live) return `https://www.youtube.com/embed/${live[1]}?rel=0`;
  return null;
}

function parseItunesDuration(s: string): number {
  const parts = s.split(":").map((p) => parseInt(p, 10));
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : 1800;
}
