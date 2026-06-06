import { fetchFinancialNewsFromRss } from "../lib/adapters/financial-news-feeds.ts";
import { fetchCryptoNewsFromRss } from "../lib/adapters/crypto-news-feeds.ts";
import { curatePulseNews } from "../lib/adapters/pulse-news-curator.ts";

const fin = await fetchFinancialNewsFromRss();
const cry = await fetchCryptoNewsFromRss();
console.log(
  "raw",
  fin.length,
  cry.length,
  "bloomberg raw",
  fin.filter((i) => /bloomberg/i.test(i.source)).length
);
const curated = curatePulseNews([...fin, ...cry], 28);
console.log(
  "curated",
  curated.length,
  "bloomberg curated",
  curated.filter((i) => /bloomberg/i.test(i.source)).length
);
const bySource: Record<string, number> = {};
for (const i of curated) bySource[i.source] = (bySource[i.source] ?? 0) + 1;
console.log(bySource);
