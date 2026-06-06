/**
 * Shared RSS → NewsItem mapping for Pulse (real feeds only).
 */

import Parser from "rss-parser";
import type { NewsItem } from "@/lib/types";

export type RssItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  contentSnippet?: string;
  summary?: string;
  creator?: string;
  categories?: string[];
};

export interface RssFeedSource {
  id: string;
  name: string;
  url: string;
  defaultTopic: NewsItem["newsTopic"];
  priority: number;
  category: NewsItem["category"];
}

const parser = new Parser({
  timeout: 10_000,
  headers: { "User-Agent": "MycoDAO-Pulse/1.0 (+https://pulse.mycodao.com)" },
});

function hashKey(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export function rssItemToNewsItem(
  item: RssItem,
  source: RssFeedSource,
  idx: number
): NewsItem | null {
  const title = (item.title || "").trim();
  const url = (item.link || "").trim();
  if (!title || !/^https?:\/\//i.test(url)) return null;

  const publishedAt = item.isoDate
    ? new Date(item.isoDate).toISOString()
    : item.pubDate
      ? new Date(item.pubDate).toISOString()
      : new Date().toISOString();

  const summary = (item.contentSnippet || item.summary || "").trim().slice(0, 400);
  const tags = (item.categories || []).map((c) => String(c).toLowerCase()).filter(Boolean);

  return {
    id: `rss-${source.id}-${idx}-${hashKey(url)}`,
    source: source.name,
    title,
    summary,
    url,
    tags,
    publishedAt,
    category: source.category,
    newsTopic: source.defaultTopic,
    feedPriority: source.priority,
  };
}

export async function fetchNewsFromRssFeeds(
  feeds: RssFeedSource[],
  itemsPerFeed = 10
): Promise<NewsItem[]> {
  const batches = await Promise.all(
    feeds.map(async (source) => {
      try {
        const feed = await parser.parseURL(source.url);
        return feed.items.slice(0, itemsPerFeed).map((raw, i) =>
          rssItemToNewsItem(raw as RssItem, source, i)
        );
      } catch {
        return [];
      }
    })
  );

  const out: NewsItem[] = [];
  let idx = 0;
  for (const batch of batches) {
    for (const mapped of batch) {
      if (!mapped) continue;
      out.push({ ...mapped, id: `rss-${mapped.id}-${idx++}` });
    }
  }
  return out;
}
