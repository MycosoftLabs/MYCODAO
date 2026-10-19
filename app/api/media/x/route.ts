import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Live @MYCODAO posts (including X articles) via the X API v2. Requires X_BEARER_TOKEN; cached to limit API usage. */

const HANDLE = process.env.MYCODAO_X_HANDLE?.trim() || "MYCODAO";
const TTL_MS = 15 * 60_000;
const API = "https://api.x.com/2";

interface XPost {
  id: string;
  text: string;
  created_at: string | null;
  url: string;
  likes: number | null;
  reposts: number | null;
  replies: number | null;
  is_article: boolean;
  article_title: string | null;
  media_url: string | null;
  links: string[];
}

interface XFeed {
  configured: boolean;
  handle: string;
  profile_url: string;
  name: string | null;
  followers: number | null;
  posts: XPost[];
  fetched_at: string;
  error?: string;
}

let cached: { at: number; body: XFeed } | null = null;

async function x<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`X API HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export async function GET() {
  const token = process.env.X_BEARER_TOKEN?.trim();
  const base: XFeed = { configured: Boolean(token), handle: HANDLE, profile_url: `https://x.com/${HANDLE}`, name: null, followers: null, posts: [], fetched_at: new Date().toISOString() };
  if (!token) return NextResponse.json({ ...base, error: "X API key not configured (set X_BEARER_TOKEN on the server)." });
  if (cached && Date.now() - cached.at < TTL_MS) return NextResponse.json(cached.body);
  try {
    const user = await x<{ data?: { id: string; name: string; public_metrics?: { followers_count?: number } } }>(
      `/users/by/username/${HANDLE}?user.fields=public_metrics`,
      token,
    );
    if (!user.data) throw new Error("X user not found");
    const timeline = await x<{
      data?: Array<{
        id: string;
        text: string;
        created_at?: string;
        public_metrics?: { like_count?: number; retweet_count?: number; reply_count?: number };
        entities?: { urls?: Array<{ expanded_url?: string }> };
        article?: { title?: string };
        attachments?: { media_keys?: string[] };
      }>;
      includes?: { media?: Array<{ media_key: string; url?: string; preview_image_url?: string }> };
    }>(
      `/users/${user.data.id}/tweets?max_results=20&exclude=replies&tweet.fields=created_at,public_metrics,entities,article,attachments&expansions=attachments.media_keys&media.fields=url,preview_image_url`,
      token,
    );
    const media = new Map((timeline.includes?.media ?? []).map((m) => [m.media_key, m.url ?? m.preview_image_url ?? null]));
    const body: XFeed = {
      ...base,
      name: user.data.name,
      followers: user.data.public_metrics?.followers_count ?? null,
      posts: (timeline.data ?? []).map((t) => ({
        id: t.id,
        text: t.text,
        created_at: t.created_at ?? null,
        url: `https://x.com/${HANDLE}/status/${t.id}`,
        likes: t.public_metrics?.like_count ?? null,
        reposts: t.public_metrics?.retweet_count ?? null,
        replies: t.public_metrics?.reply_count ?? null,
        is_article: Boolean(t.article?.title),
        article_title: t.article?.title ?? null,
        media_url: t.attachments?.media_keys?.map((k) => media.get(k)).find(Boolean) ?? null,
        links: (t.entities?.urls ?? []).map((u) => u.expanded_url).filter((u): u is string => Boolean(u)),
      })),
      fetched_at: new Date().toISOString(),
    };
    cached = { at: Date.now(), body };
    return NextResponse.json(body);
  } catch (error) {
    if (cached) return NextResponse.json(cached.body);
    return NextResponse.json({ ...base, error: String(error) }, { status: 503 });
  }
}
