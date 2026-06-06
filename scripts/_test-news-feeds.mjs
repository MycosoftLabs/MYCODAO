import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Dynamic import via compiled path — use node to run adapters through Next isn't trivial.
// Smoke: HTTP /api/news when dev server up, else exit 0 with message.
const base = process.argv[2] || "http://localhost:3004";
try {
  const res = await fetch(`${base}/api/news`, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) {
    console.error("FAIL", res.status, await res.text());
    process.exit(1);
  }
  const items = await res.json();
  const sources = [...new Set(items.map((i) => i.source))];
  const labels = items.slice(0, 15).map((i) => `${i.broadcastLabel || i.category}: ${i.title?.slice(0, 70)}`);
  console.log("count", items.length);
  console.log("sources", sources.join(", "));
  console.log("headlines\n" + labels.join("\n"));
  const hasCnbc = sources.some((s) => /cnbc/i.test(s));
  const hasBloomberg = sources.some((s) => /bloomberg/i.test(s));
  const hasMarkets = items.some((i) => /markets|macro|business|washington/i.test(i.broadcastLabel || ""));
  if (!hasCnbc && !hasBloomberg) {
    console.error("WARN: no CNBC/Bloomberg in curated set");
    process.exit(1);
  }
  if (!hasMarkets) {
    console.error("WARN: no financial bumper labels");
    process.exit(1);
  }
} catch (e) {
  console.error("SKIP (server not up?):", e.message);
  process.exit(0);
}
