#!/usr/bin/env node
const base = process.argv[2] || "https://blocks.mycodao.com";
const htmlRes = await fetch(`${base}/blocks/index.html`, { redirect: "follow" });
const html = await htmlRes.text();
const m = html.match(/assets\/(index-[^"']+\.js)/);
console.log("status", htmlRes.status, "bundle", m?.[1] ?? "NOT FOUND");
if (!m) process.exit(1);
const jsRes = await fetch(`${base}/blocks/${m[0]}`);
const text = await jsRes.text();
console.log("js bytes", text.length);
for (const pat of [
  "Streamlabs",
  "Streamlabs Alert",
  "Streamlabs Config",
  "Season 1 Guide",
  "MycoPOD Episodes",
  "select an episode below",
  "MYCOPOD RSS",
  "Hosted by",
  "idleBumper",
  "layout:\"square\"",
]) {
  console.log(pat, text.includes(pat) ? "yes" : "NO");
}
