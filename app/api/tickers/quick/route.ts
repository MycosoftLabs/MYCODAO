import { NextResponse } from "next/server";
import { tickersFromYahoo } from "@/lib/adapters/yahoo-quotes";

/** Fast bonds/commodities/indices — Yahoo only; skips slow Finnhub/Stooq. */
export async function GET() {
  try {
    const tickers = await tickersFromYahoo(new Set());
    return NextResponse.json(tickers);
  } catch (e) {
    console.error("tickers/quick:", e);
    return NextResponse.json({ error: "quick_tickers_unavailable" }, { status: 503 });
  }
}
