import { NextResponse } from "next/server";
import { fetchTickers, getStaleTickerCache } from "@/lib/adapters/tickers";

export async function GET(request: Request) {
  try {
    const refresh = new URL(request.url).searchParams.get("refresh") === "1";
    const tickers = await fetchTickers({ bypassCache: refresh });
    if (tickers.length > 0) return NextResponse.json(tickers);
    const stale = getStaleTickerCache();
    if (stale.length > 0) return NextResponse.json(stale);
    return NextResponse.json([]);
  } catch (e) {
    console.error("tickers route:", e);
    const stale = getStaleTickerCache();
    if (stale.length > 0) return NextResponse.json(stale);
    return NextResponse.json({ error: "tickers_unavailable", detail: String(e) }, { status: 503 });
  }
}
