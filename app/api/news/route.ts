import { NextResponse } from "next/server";
import { fetchNews, invalidateNewsCache } from "@/lib/adapters/news";

export async function GET(request: Request) {
  try {
    const refresh = new URL(request.url).searchParams.get("refresh") === "1";
    if (refresh) invalidateNewsCache();
    const news = await fetchNews({ bypassCache: refresh });
    return NextResponse.json(news);
  } catch (e) {
    console.error("news route:", e);
    return NextResponse.json({ error: "news_unavailable", detail: String(e) }, { status: 503 });
  }
}
