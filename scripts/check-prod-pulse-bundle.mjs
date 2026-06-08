#!/usr/bin/env node
const base = process.argv[2] || "https://blocks.mycodao.com";
const res = await fetch(`${base}/blocks/index.html`, { redirect: "follow" });
const html = await res.text();
const m = html.match(/assets\/(index-[^"']+\.js)/);
console.log("status", res.status, "bundle", m?.[1] ?? "NOT FOUND");
if (!m) process.exit(1);
const jsRes = await fetch(`${base}/blocks/${m[0]}`);
const text = await jsRes.text();
console.log("js bytes", text.length);
for (const pat of [
  "prefetchPulseNewsBundle",
  "pulseNewsToBroadcastLines",
  "buildLiveNewsTickerSegments",
  "FloatingNewsRail",
  "fetchPulseNews",
  "HeadlineVerticalTicker",
]) {
  console.log(pat, text.includes(pat) ? "yes" : "NO");
}
