/**
 * CNBC, Bloomberg, and broader financial / business / market-politics RSS — real feeds only.
 */

import type { NewsItem } from "@/lib/types";
import { fetchNewsFromRssFeeds, type RssFeedSource } from "@/lib/adapters/rss-news-parser";

export const FINANCIAL_NEWS_FEEDS: RssFeedSource[] = [
  {
    id: "cnbc-top",
    name: "CNBC",
    url: "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    defaultTopic: "markets",
    priority: 14,
    category: "markets",
  },
  {
    id: "cnbc-finance",
    name: "CNBC Finance",
    url: "https://www.cnbc.com/id/15839135/device/rss/rss.html",
    defaultTopic: "markets",
    priority: 14,
    category: "markets",
  },
  {
    id: "cnbc-economy",
    name: "CNBC Economy",
    url: "https://www.cnbc.com/id/20910258/device/rss/rss.html",
    defaultTopic: "macro",
    priority: 14,
    category: "markets",
  },
  {
    id: "cnbc-politics",
    name: "CNBC Politics",
    url: "https://www.cnbc.com/id/10000113/device/rss/rss.html",
    defaultTopic: "politics",
    priority: 13,
    category: "markets",
  },
  {
    id: "bloomberg-markets",
    name: "Bloomberg Markets",
    url: "https://feeds.bloomberg.com/markets/news.rss",
    defaultTopic: "markets",
    priority: 14,
    category: "markets",
  },
  {
    id: "bloomberg-economics",
    name: "Bloomberg Economics",
    url: "https://feeds.bloomberg.com/economics/news.rss",
    defaultTopic: "macro",
    priority: 14,
    category: "markets",
  },
  {
    id: "bloomberg-politics",
    name: "Bloomberg Politics",
    url: "https://feeds.bloomberg.com/politics/news.rss",
    defaultTopic: "politics",
    priority: 13,
    category: "markets",
  },
  {
    id: "marketwatch",
    name: "MarketWatch",
    url: "https://www.marketwatch.com/rss/topstories",
    defaultTopic: "markets",
    priority: 12,
    category: "markets",
  },
  {
    id: "yahoo-finance",
    name: "Yahoo Finance",
    url: "https://finance.yahoo.com/news/rssindex",
    defaultTopic: "business",
    priority: 11,
    category: "markets",
  },
  {
    id: "wsj-markets",
    name: "WSJ Markets",
    url: "https://feeds.a.dj.com/rss/RSSMarketsMain.xml",
    defaultTopic: "markets",
    priority: 12,
    category: "markets",
  },
  {
    id: "politico-economy",
    name: "Politico Economy",
    url: "https://rss.politico.com/economy.xml",
    defaultTopic: "politics",
    priority: 12,
    category: "markets",
  },
  {
    id: "npr-business",
    name: "NPR Business",
    url: "https://feeds.npr.org/1006/rss.xml",
    defaultTopic: "business",
    priority: 10,
    category: "markets",
  },
  {
    id: "guardian-business",
    name: "The Guardian Business",
    url: "https://www.theguardian.com/business/rss",
    defaultTopic: "business",
    priority: 10,
    category: "markets",
  },
  {
    id: "fed-press",
    name: "Federal Reserve",
    url: "https://www.federalreserve.gov/feeds/press_all.xml",
    defaultTopic: "macro",
    priority: 13,
    category: "markets",
  },
];

export async function fetchFinancialNewsFromRss(
  feeds: RssFeedSource[] = FINANCIAL_NEWS_FEEDS
): Promise<NewsItem[]> {
  return fetchNewsFromRssFeeds(feeds, 10);
}
