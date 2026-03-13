/**
 * News adapter: try external API when key is set, fallback to mock.
 * Set NEWS_API_KEY or GNEWS_API_KEY in env to enable; dashboard works without.
 */

import type { NewsItem } from "@/lib/types";
import { getMockNews } from "@/lib/mock-data";

const CACHE_TTL_MS = 5 * 60_000;
let cached: NewsItem[] | null = null;
let cachedAt = 0;

export async function fetchNews(): Promise<NewsItem[]> {
  if (cached && Date.now() - cachedAt < CACHE_TTL_MS) return cached;
  const mock = getMockNews();
  const apiKey = process.env.GNEWS_API_KEY || process.env.NEWS_API_KEY;
  if (!apiKey) {
    return mock;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const url =
      typeof process.env.GNEWS_API_KEY !== "undefined"
        ? `https://gnews.io/api/v4/top-headlines?token=${process.env.GNEWS_API_KEY}&lang=en&max=15`
        : `https://newsapi.org/v2/top-headlines?country=us&apiKey=${process.env.NEWS_API_KEY}&pageSize=15`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return mock;
    const json = await res.json();
    const articles = json.articles || json.results || [];
    const mapped: NewsItem[] = (articles.slice(0, 12) as Array<{ title?: string; description?: string; url?: string; source?: { name?: string }; publishedAt?: string }>).map(
      (a, i) => ({
        id: `ext-${i}`,
        source: a.source?.name || "News",
        title: a.title || "",
        summary: a.description || "",
        url: a.url || "#",
        tags: [],
        publishedAt: a.publishedAt || new Date().toISOString(),
        category: "markets" as const,
      })
    );
    if (mapped.length === 0) return mock;
    cached = mapped;
    cachedAt = Date.now();
    return mapped;
  } catch {
    cached = null;
    return mock;
  }
}
