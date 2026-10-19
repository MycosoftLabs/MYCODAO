import { NextResponse } from "next/server";
import {
  FUNGAL_TOPICS,
  cachedFungal,
  europePmc,
  latestFungalNews,
  latestFungalResearch,
  type TopicId,
} from "@/lib/server/fungal-research-feed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Live fungal science by topic (?topic=<id>|news; default: newest across topics). */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const topicParam = params.get("topic");
  const limit = Math.min(30, Math.max(1, Number(params.get("limit")) || 12));
  const topics = Object.entries(FUNGAL_TOPICS).map(([id, t]) => ({ id, label: t.label }));
  try {
    if (topicParam === "news") return NextResponse.json({ topics, topic: "news", items: await latestFungalNews(limit) });
    if (topicParam && topicParam in FUNGAL_TOPICS) {
      const topic = topicParam as TopicId;
      return NextResponse.json({ topics, topic, items: (await cachedFungal(topic, () => europePmc(topic, 30))).slice(0, limit) });
    }
    return NextResponse.json({ topics, topic: "latest", items: await latestFungalResearch(limit) });
  } catch (error) {
    return NextResponse.json({ topics, error: "Fungal research feed unavailable", detail: String(error), items: [] }, { status: 503 });
  }
}