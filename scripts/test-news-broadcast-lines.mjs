#!/usr/bin/env node
import https from "https";

const data = await new Promise((res, rej) => {
  https
    .get("https://blocks.mycodao.com/api/news", (r) => {
      let d = "";
      r.on("data", (c) => (d += c));
      r.on("end", () => res(JSON.parse(d)));
    })
    .on("error", rej);
});

const KNOWN = [
  "MARKETS NOW",
  "DAO ALERT",
  "WASHINGTON",
  "REGULATION",
  "BREAKING",
  "BUSINESS",
  "BITCOIN",
  "SOLANA",
  "CRYPTO",
  "DEFI",
  "MACRO",
];

function stripBumperPrefix(title, label) {
  const labelUpper = label.toUpperCase();
  const titleUpper = title.toUpperCase();
  if (!titleUpper.startsWith(labelUpper)) return null;
  const rest = title.slice(label.length);
  if (/^[''']s\b/i.test(rest) || /^[''']/.test(rest.trimStart())) return null;
  if (/^\s+[A-Za-z]/.test(rest) && !/^[\s]*[:\-|—–]/.test(rest)) return null;
  const bumper = rest.match(/^[\s]*[:\-|—–]\s*(.+)$/s);
  if (bumper?.[1]) return bumper[1].trim();
  return null;
}

const lines = data.slice(0, 40).map((item) => {
  for (const label of KNOWN) {
    const headline = stripBumperPrefix(item.title, label);
    if (headline !== null) {
      return { id: item.id, label, headline, source: item.source };
    }
  }
  const label = (item.broadcastLabel || item.category || "MARKETS NOW").toUpperCase();
  const bumperHeadline = stripBumperPrefix(item.title, label);
  return {
    id: item.id,
    label,
    headline: bumperHeadline ?? item.title,
    source: item.source,
  };
});

const empty = lines.filter((l) => !l.headline?.trim());
console.log("items", data.length, "lines", lines.length, "empty headlines", empty.length);
if (empty.length) console.log(empty);
console.log("sample labels", [...new Set(lines.map((l) => l.label))].join(", "));
