/**
 * Curate, dedupe, and mix financial + crypto headlines for Pulse (not topic-blocked).
 */

import type { NewsItem, NewsTopic } from "@/lib/types";

const TOPIC_LABELS: Record<NewsTopic, string> = {
  bitcoin: "BITCOIN",
  solana: "SOLANA",
  defi: "DEFI",
  regulation: "REGULATION",
  macro: "MACRO",
  markets: "MARKETS NOW",
  business: "BUSINESS",
  politics: "WASHINGTON",
  crypto: "CRYPTO",
  mycodao: "DAO ALERT",
};

const FINANCIAL_TOPICS = new Set<NewsTopic>([
  "markets",
  "macro",
  "business",
  "politics",
  "regulation",
]);

const CRYPTO_TOPICS = new Set<NewsTopic>([
  "bitcoin",
  "solana",
  "defi",
  "crypto",
  "mycodao",
]);

const TOPIC_KEYWORDS: Record<NewsTopic, RegExp> = {
  bitcoin: /\b(bitcoin|btc|satoshi|halving)\b/i,
  solana: /\b(solana|sol\b|jito|phantom|marinade)\b/i,
  defi: /\b(defi|dex|liquidity|yield|staking|aave|uniswap|jupiter)\b/i,
  regulation: /\b(sec|cftc|regulat|lawsuit|ban|compliance|enforcement)\b/i,
  macro: /\b(fed|fomc|inflation|cpi|ppi|treasury|rate cut|jobs report|gdp|recession|powell|yield curve)\b/i,
  markets: /\b(s&p|nasdaq|dow|stocks|equities|earnings|futures|wall street|russell|vix)\b/i,
  business: /\b(ceo|merger|acquisition|ipo|layoff|quarterly|revenue|profit|corporate|retail|bank|airline)\b/i,
  politics: /\b(trump|biden|congress|senate|tariff|sanction|election|white house|debt ceiling|shutdown|geopolit|opec)\b/i,
  crypto: /\b(crypto|blockchain|token|web3|nft)\b/i,
  mycodao: /\b(myco|mycodao|mindex|biobank|desci)\b/i,
};

const MARKET_RELEVANCE =
  /\b(market|stocks|fed|tariff|trade|economy|inflation|gdp|earnings|investor|dollar|bond|treasury|oil|china|recession|rate|bank|wall street|nasdaq|s&p|dow|crypto|bitcoin|commodit)\b/i;

const TRUSTED_FINANCIAL_SOURCE =
  /\b(cnbc|bloomberg|marketwatch|wsj|wall street journal|yahoo finance|politico|federal reserve|npr|guardian business)\b/i;

/** First floating page — always lead Bitcoin / crypto (Pulse identity). */
export const FIRST_PAGE_CRYPTO_LEAD_SLOTS = 7;

const CRYPTO_LEAD_ORDER: NewsTopic[] = ["bitcoin", "solana", "defi", "crypto", "mycodao"];

const TOPIC_TARGETS: Partial<Record<NewsTopic, number>> = {
  bitcoin: 4,
  solana: 3,
  crypto: 3,
  defi: 2,
  mycodao: 1,
  markets: 5,
  macro: 4,
  business: 4,
  politics: 3,
  regulation: 2,
};

const SOURCE_FLOORS: { test: RegExp; min: number; lane: "financial" | "any" }[] = [
  { test: /cnbc/i, min: 4, lane: "financial" },
  { test: /bloomberg/i, min: 3, lane: "financial" },
  { test: /marketwatch|wsj|yahoo finance/i, min: 2, lane: "financial" },
];

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function detectTopic(item: NewsItem): NewsTopic {
  if (item.newsTopic && item.category === "markets") {
    if (FINANCIAL_TOPICS.has(item.newsTopic)) return item.newsTopic;
  }
  if (item.newsTopic && item.category === "crypto") {
    if (CRYPTO_TOPICS.has(item.newsTopic)) return item.newsTopic;
  }
  if (item.newsTopic && !CRYPTO_TOPICS.has(item.newsTopic) && item.category === "markets") {
    return item.newsTopic;
  }

  const blob = `${item.title} ${item.summary} ${item.tags.join(" ")}`;
  const order: NewsTopic[] = [
    "mycodao",
    "markets",
    "macro",
    "business",
    "politics",
    "regulation",
    "bitcoin",
    "solana",
    "defi",
    "crypto",
  ];
  for (const topic of order) {
    if (TOPIC_KEYWORDS[topic].test(blob)) return topic;
  }
  return item.category === "markets" ? "markets" : "crypto";
}

function isMarketRelevant(item: NewsItem, topic: NewsTopic): boolean {
  if (topic !== "politics") return true;
  if (TRUSTED_FINANCIAL_SOURCE.test(item.source)) return true;
  const blob = `${item.title} ${item.summary}`;
  return MARKET_RELEVANCE.test(blob);
}

function scoreItem(item: NewsItem, topic: NewsTopic): number {
  const ageMs = Date.now() - new Date(item.publishedAt).getTime();
  const recency = Math.max(0, 100 - ageMs / 60_000);
  const priority = item.feedPriority ?? 5;
  const breaking = /\b(breaking|just in|alert|surge|crash|record)\b/i.test(item.title) ? 15 : 0;
  const premium = TRUSTED_FINANCIAL_SOURCE.test(item.source) ? 14 : 0;
  const topicBoost =
    topic === "bitcoin" || topic === "solana"
      ? 12
      : CRYPTO_TOPICS.has(topic)
        ? 8
        : FINANCIAL_TOPICS.has(topic)
          ? 6
          : 0;
  return recency + priority + breaking + premium + topicBoost;
}

function assignBroadcastLabel(item: NewsItem, topic: NewsTopic): string {
  if (item.broadcastLabel) return item.broadcastLabel;
  if (/\b(breaking|just in|alert)\b/i.test(item.title)) return "BREAKING";
  return TOPIC_LABELS[topic];
}

function itemCategory(topic: NewsTopic): NewsItem["category"] {
  if (topic === "mycodao") return "mycodao";
  if (FINANCIAL_TOPICS.has(topic)) return "markets";
  return "crypto";
}

function dedupeItems(items: NewsItem[]): NewsItem[] {
  const seenUrl = new Set<string>();
  const seenTitle = new Set<string>();
  const out: NewsItem[] = [];
  for (const item of items) {
    const urlKey = item.url.toLowerCase();
    const titleKey = normalizeTitle(item.title);
    if (!urlKey || seenUrl.has(urlKey) || seenTitle.has(titleKey)) continue;
    seenUrl.add(urlKey);
    seenTitle.add(titleKey);
    out.push(item);
  }
  return out;
}

function enrichItems(raw: NewsItem[]): NewsItem[] {
  return raw
    .map((item) => {
      const topic = detectTopic(item);
      return {
        ...item,
        newsTopic: topic,
        broadcastLabel: assignBroadcastLabel(item, topic),
        tags: [...new Set([...item.tags, topic])],
        category: itemCategory(topic),
      };
    })
    .filter((item) => isMarketRelevant(item, item.newsTopic!));
}

function pickByTopicTargets(enriched: NewsItem[]): NewsItem[] {
  const byTopic = new Map<NewsTopic, NewsItem[]>();
  for (const item of enriched) {
    const topic = item.newsTopic!;
    const list = byTopic.get(topic) ?? [];
    list.push(item);
    byTopic.set(topic, list);
  }
  for (const [topic, list] of Array.from(byTopic.entries())) {
    list.sort((a, b) => scoreItem(b, topic) - scoreItem(a, topic));
    byTopic.set(topic, list);
  }

  const picked: NewsItem[] = [];
  const counts: Partial<Record<NewsTopic, number>> = {};

  for (const [topic, target] of Object.entries(TOPIC_TARGETS) as [NewsTopic, number][]) {
    const pool = byTopic.get(topic) ?? [];
    for (const item of pool) {
      if ((counts[topic] ?? 0) >= target) break;
      picked.push(item);
      counts[topic] = (counts[topic] ?? 0) + 1;
    }
  }

  for (const item of enriched) {
    if (picked.some((p) => p.id === item.id)) continue;
    picked.push(item);
  }

  return picked;
}

function applySourceFloors(picked: NewsItem[], enriched: NewsItem[], limit: number): NewsItem[] {
  const out = [...picked];
  for (const { test, min } of SOURCE_FLOORS) {
    let have = out.filter((p) => test.test(p.source)).length;
    if (have >= min) continue;
    const candidates = enriched
      .filter((item) => test.test(item.source) && !out.some((p) => p.id === item.id))
      .sort((a, b) => scoreItem(b, b.newsTopic!) - scoreItem(a, a.newsTopic!));
    for (const item of candidates) {
      if (out.length >= limit) break;
      out.push(item);
      have += 1;
      if (have >= min) break;
    }
  }
  return out.slice(0, limit);
}

function buildCryptoLeadPool(items: NewsItem[]): NewsItem[] {
  const byTopic = new Map<NewsTopic, NewsItem[]>();
  for (const item of items) {
    if (!CRYPTO_TOPICS.has(item.newsTopic!)) continue;
    const topic = item.newsTopic!;
    const list = byTopic.get(topic) ?? [];
    list.push(item);
    byTopic.set(topic, list);
  }
  for (const [topic, list] of Array.from(byTopic.entries())) {
    list.sort((a, b) => scoreItem(b, topic) - scoreItem(a, topic));
    byTopic.set(topic, list);
  }
  const out: NewsItem[] = [];
  for (const topic of CRYPTO_LEAD_ORDER) {
    out.push(...(byTopic.get(topic) ?? []));
  }
  return out;
}

function buildFinancialPool(items: NewsItem[]): NewsItem[] {
  const pool = items.filter((i) => FINANCIAL_TOPICS.has(i.newsTopic!));
  pool.sort((a, b) => scoreItem(b, b.newsTopic!) - scoreItem(a, a.newsTopic!));
  return pool;
}

/**
 * Lead with Bitcoin/crypto, then interleave CNBC/Bloomberg/financial (not category-blocked).
 */
export function mixHeadlineOrder(items: NewsItem[], limit: number): NewsItem[] {
  const crypto = buildCryptoLeadPool(items);
  const financial = buildFinancialPool(items);
  const used = new Set<string>();
  const out: NewsItem[] = [];

  const pushFrom = (pool: NewsItem[], index: { value: number }) => {
    while (index.value < pool.length) {
      const item = pool[index.value++];
      if (used.has(item.id)) continue;
      used.add(item.id);
      out.push(item);
      return true;
    }
    return false;
  };

  const ci = { value: 0 };
  const fi = { value: 0 };

  while (out.length < limit && (ci.value < crypto.length || fi.value < financial.length)) {
    if (out.length < FIRST_PAGE_CRYPTO_LEAD_SLOTS) {
      if (!pushFrom(crypto, ci) && !pushFrom(financial, fi)) break;
      continue;
    }

    pushFrom(crypto, ci);
    if (out.length >= limit) break;
    pushFrom(crypto, ci);
    if (out.length >= limit) break;
    pushFrom(financial, fi);
  }

  for (const item of items) {
    if (out.length >= limit) break;
    if (used.has(item.id)) continue;
    used.add(item.id);
    out.push(item);
  }

  return out.slice(0, limit);
}

export function curatePulseNews(raw: NewsItem[], limit = 28): NewsItem[] {
  const enriched = enrichItems(dedupeItems(raw));
  const picked = applySourceFloors(pickByTopicTargets(enriched), enriched, limit * 2);
  return mixHeadlineOrder(picked, limit);
}
