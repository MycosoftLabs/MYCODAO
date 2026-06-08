#!/usr/bin/env node
import fs from "node:fs";

async function prodText() {
  const html = await (await fetch("https://blocks.mycodao.com/blocks/index.html")).text();
  const m = html.match(/assets\/(index-[^"']+\.js)/);
  return (await fetch(`https://blocks.mycodao.com/blocks/${m[0]}`)).text();
}

function localText() {
  const htmlPath = "public/blocks/index.html";
  if (!fs.existsSync(htmlPath)) return "";
  const html = fs.readFileSync(htmlPath, "utf8");
  const m = html.match(/assets\/(index-[^"']+\.js)/);
  if (!m) return "";
  const p = `public/blocks/${m[0]}`;
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

const patterns = [
  "Streamlabs Alert",
  "Streamlabs Config",
  "Hosted by",
  "Season 1 Guide",
  'layout:"square"',
  "idlePresentation",
  "select an episode below",
  "MYCOPOD_HOST_BIOS",
  "order-first",
];

const prod = await prodText();
const local = localText();
console.log("prod bytes", prod.length, "local bytes", local.length);
for (const p of patterns) {
  console.log(
    p.padEnd(28),
    "prod:",
    prod.includes(p) ? "yes" : "NO",
    "| local:",
    local.includes(p) ? "yes" : "NO",
  );
}
