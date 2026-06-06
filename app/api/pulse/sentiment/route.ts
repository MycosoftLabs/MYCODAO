import { NextResponse } from "next/server";
import { fetchFearGreedIndex } from "@/lib/adapters/fear-greed";

export async function GET() {
  try {
    const fearGreed = await fetchFearGreedIndex();
    if (!fearGreed) {
      return NextResponse.json({ error: "sentiment_unavailable" }, { status: 503 });
    }
    return NextResponse.json(fearGreed);
  } catch (e) {
    console.error("sentiment route:", e);
    return NextResponse.json({ error: "sentiment_unavailable", detail: String(e) }, { status: 503 });
  }
}
