/**
 * News: financial RSS (CNBC, Bloomberg, …) + crypto RSS + optional GNews/NewsAPI merge.
 * No synthetic articles.
 */

import type { NewsItem } from "@/lib/types";
import { fetchCryptoNewsFromRss } from "@/lib/adapters/crypto-news-feeds";
import { fetchFinancialNewsFromRss } from "@/lib/adapters/financial-news-feeds";
import { curatePulseNews } from "@/lib/adapters/pulse-news-curator";

const CACHE_TTL_MS = 5 * 60_000;
let cached: NewsItem[] | null = null;
let cachedAt = 0;

function mapApiArticle(
  a: {
    title?: string;
    description?: string;
    url?: string;
    source?: { name?: string };
    publishedAt?: string;
  },
  idx: number,
  topic: NewsItem["newsTopic"],
  category: NewsItem["category"]
): NewsItem | null {
  const articleUrl = (a.url || "").trim();
  if (!/^https?:\/\//i.test(articleUrl)) return null;
  return {
    id: `ext-${topic}-${idx}`,
    source: a.source?.name || "News",
    title: a.title || "",
    summary: a.description || "",
    url: articleUrl,
    tags: topic ? [topic] : [],
    publishedAt: a.publishedAt || new Date().toISOString(),
    category,
    newsTopic: topic,
    feedPriority: topic === "markets" || topic === "business" ? 8 : 6,
  };
}

async function fetchGnewsOrNewsApi(): Promise<NewsItem[]> {
  const gnews = process.env.GNEWS_API_KEY?.trim();
  const newsapi = process.env.NEWS_API_KEY?.trim();
  if (!gnews && !newsapi) return [];

  const out: NewsItem[] = [];
  let idx = 0;

  try {
    if (gnews) {
      const endpoints = [
        `https://gnews.io/api/v4/top-headlines?token=${gnews}&lang=en&max=10&topic=business`,
        `https://gnews.io/api/v4/top-headlines?token=${gnews}&lang=en&max=8&topic=nation`,
      ];
      for (const url of endpoints) {
        const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
        if (!res.ok) continue;
        const json = await res.json();
        const articles = json.articles || json.results || [];
        const topic = url.includes("business") ? "business" : "politics";
        for (const a of articles.slice(0, 10) as Array<{
          title?: string;
          description?: string;
          url?: string;
          source?: { name?: string };
          publishedAt?: string;
        }>) {
          const mapped = mapApiArticle(a, idx++, topic, "markets");
          if (mapped) out.push(mapped);
        }
      }
    } else if (newsapi) {
      const endpoints = [
        `https://newsapi.org/v2/top-headlines?country=us&category=business&apiKey=${newsapi}&pageSize=10`,
        `https://newsapi.org/v2/everything?q=stock+market+OR+Federal+Reserve+OR+earnings&language=en&sortBy=publishedAt&pageSize=8&apiKey=${newsapi}`,
      ];
      for (const url of endpoints) {
        const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
        if (!res.ok) continue;
        const json = await res.json();
        const articles = json.articles || [];
        const topic = url.includes("business") && !url.includes("everything") ? "business" : "markets";
        for (const a of articles.slice(0, 10) as Array<{
          title?: string;
          description?: string;
          url?: string;
          source?: { name?: string };
          publishedAt?: string;
        }>) {
          const mapped = mapApiArticle(a, idx++, topic, "markets");
          if (mapped) out.push(mapped);
        }
      }
    }
  } catch {
    return out;
  }

  return out;
}

export async function fetchNews(opts?: { bypassCache?: boolean }): Promise<NewsItem[]> {
  if (!opts?.bypassCache && cached && Date.now() - cachedAt < CACHE_TTL_MS) return cached;

  const [financialRows, cryptoRows, apiRows] = await Promise.all([
    fetchFinancialNewsFromRss(),
    fetchCryptoNewsFromRss(),
    fetchGnewsOrNewsApi(),
  ]);

  const merged = [...financialRows, ...apiRows, ...cryptoRows];
  if (merged.length === 0) {
    cached = [];
    cachedAt = Date.now();
    return [];
  }

  const curated = curatePulseNews(merged, 28);
  cached = curated;
  cachedAt = Date.now();
  return curated;
}

export function invalidateNewsCache(): void {
  cached = null;
  cachedAt = 0;
}
