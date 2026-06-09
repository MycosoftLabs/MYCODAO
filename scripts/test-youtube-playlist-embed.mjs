/**
 * Quick check: playlist URLs must include list= in embed output.
 * Run: node scripts/test-youtube-playlist-embed.mjs
 */
import { createRequire } from "module";

const require = createRequire(import.meta.url);
// ts compiled at runtime via dynamic import of built logic — duplicate minimal test
const EMBED_HOST = "https://www.youtube-nocookie.com";

function appendPlaylistParams(embedBase, listId, index) {
  if (!listId?.trim()) return embedBase;
  const url = new URL(embedBase);
  url.searchParams.set("list", listId.trim());
  if (index?.trim()) url.searchParams.set("index", index.trim());
  return url.toString();
}

function normalizeYoutubeEmbedPath(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const url = new URL(trimmed);
  const host = url.hostname.replace(/^www\./, "");
  const listId = url.searchParams.get("list");
  const index = url.searchParams.get("index");
  if (host === "youtu.be") {
    const id = url.pathname.replace(/^\//, "").split("/")[0];
    if (id) return appendPlaylistParams(`${EMBED_HOST}/embed/${id}`, listId, index);
  }
  if (url.pathname === "/playlist") {
    if (listId) return `${EMBED_HOST}/embed/videoseries?list=${encodeURIComponent(listId)}`;
  }
  const v = url.searchParams.get("v");
  if (v) return appendPlaylistParams(`${EMBED_HOST}/embed/${v}`, listId, index);
  return null;
}

const cases = [
  [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLtest123",
    "list=PLtest123",
  ],
  ["https://www.youtube.com/playlist?list=PLonly456", "videoseries"],
];

let failed = 0;
for (const [input, mustInclude] of cases) {
  const out = normalizeYoutubeEmbedPath(input);
  if (!out || !out.includes(mustInclude)) {
    console.error("FAIL", input, "=>", out);
    failed++;
  } else {
    console.log("OK", mustInclude, "in", out);
  }
}
process.exit(failed ? 1 : 0);
