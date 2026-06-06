/**
 * Crypto / DeFi RSS ingestion — real feeds only (no synthetic articles).
 */

import type { NewsItem } from "@/lib/types";
import { fetchNewsFromRssFeeds, type RssFeedSource } from "@/lib/adapters/rss-news-parser";

export type CryptoFeedSource = RssFeedSource;

/** Verified RSS endpoints (Jun 2026). Coinbase/CoinMarketCap blocked or 404 — omitted. */
export const CRYPTO_NEWS_FEEDS: CryptoFeedSource[] = [
  {
    id: "coindesk",
    name: "CoinDesk",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
    defaultTopic: "crypto",
    priority: 10,
    category: "crypto",
  },
  {
    id: "cointelegraph",
    name: "CoinTelegraph",
    url: "https://cointelegraph.com/rss",
    defaultTopic: "crypto",
    priority: 9,
    category: "crypto",
  },
  {
    id: "cointelegraph-btc",
    name: "CoinTelegraph Bitcoin",
    url: "https://cointelegraph.com/rss/tag/bitcoin",
    defaultTopic: "bitcoin",
    priority: 11,
    category: "crypto",
  },
  {
    id: "cointelegraph-sol",
    name: "CoinTelegraph Solana",
    url: "https://cointelegraph.com/rss/tag/solana",
    defaultTopic: "solana",
    priority: 11,
    category: "crypto",
  },
  {
    id: "decrypt",
    name: "Decrypt",
    url: "https://decrypt.co/feed",
    defaultTopic: "crypto",
    priority: 8,
    category: "crypto",
  },
  {
    id: "theblock",
    name: "The Block",
    url: "https://www.theblock.co/rss.xml",
    defaultTopic: "crypto",
    priority: 8,
    category: "crypto",
  },
  {
    id: "bitcoinmagazine",
    name: "Bitcoin Magazine",
    url: "https://bitcoinmagazine.com/.rss/full/",
    defaultTopic: "bitcoin",
    priority: 9,
    category: "crypto",
  },
  {
    id: "solana-blog",
    name: "Solana Blog",
    url: "https://solana.com/news/rss.xml",
    defaultTopic: "solana",
    priority: 10,
    category: "crypto",
  },
];

export async function fetchCryptoNewsFromRss(
  feeds: CryptoFeedSource[] = CRYPTO_NEWS_FEEDS
): Promise<NewsItem[]> {
  return fetchNewsFromRssFeeds(feeds, 8);
}
