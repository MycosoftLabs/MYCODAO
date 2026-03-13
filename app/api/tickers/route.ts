import { NextResponse } from "next/server";
import { fetchTickers } from "@/lib/adapters/tickers";

export async function GET() {
  try {
    const tickers = await fetchTickers();
    return NextResponse.json(tickers);
  } catch {
    const { getMockTickers } = await import("@/lib/mock-data");
    return NextResponse.json(getMockTickers());
  }
}
