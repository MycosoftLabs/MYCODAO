import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Myco DAO YouTube channel (also used by config/blocks-producer/news-channel-schedule.json). */
const CHANNEL_ID = process.env.MYCODAO_YOUTUBE_CHANNEL_ID?.trim() || "UCxolKooMEXN8bg5hCtCB7Eg";
const TTL_MS = 15 * 60_000;

interface YoutubeVideo {
  id: string;
  title: string;
  published_at: string;
  url: string;
  thumbnail: string;
  description: string;
  views: number | null;
}

let cached: { at: number; body: { channel: string; channel_url: string; videos: YoutubeVideo[]; fetched_at: string } } | null = null;

function tag(xml: string, name: string): string {
  return xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1]?.trim() ?? "";
}

function decode(text: string): string {
  return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

export async function GET() {
  if (cached && Date.now() - cached.at < TTL_MS) return NextResponse.json(cached.body);
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) throw new Error(`YouTube feed HTTP ${res.status}`);
    const xml = await res.text();
    const videos = xml
      .split("<entry>")
      .slice(1)
      .map((entry): YoutubeVideo => {
        const id = tag(entry, "yt:videoId");
        const views = entry.match(/<media:statistics views="(\d+)"/)?.[1];
        return {
          id,
          title: decode(tag(entry, "title")),
          published_at: tag(entry, "published"),
          url: `https://www.youtube.com/watch?v=${id}`,
          thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
          description: decode(tag(entry, "media:description")).slice(0, 400),
          views: views ? Number(views) : null,
        };
      })
      .filter((v) => v.id);
    cached = {
      at: Date.now(),
      body: {
        channel: decode(tag(xml, "title")) || "Myco DAO",
        channel_url: `https://www.youtube.com/channel/${CHANNEL_ID}`,
        videos,
        fetched_at: new Date().toISOString(),
      },
    };
    return NextResponse.json(cached.body, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch (error) {
    if (cached) return NextResponse.json(cached.body);
    return NextResponse.json({ error: "YouTube feed unavailable", detail: String(error) }, { status: 503 });
  }
}
