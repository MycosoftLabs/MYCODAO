import { NextResponse } from "next/server";
import { fetchCnbcMarkets } from "@/lib/adapters/cnbc-markets";

export async function GET() {
  try {
    const rows = await fetchCnbcMarkets();
    return NextResponse.json(rows);
  } catch (e) {
    console.error("cnbc-markets route:", e);
    return NextResponse.json(
      { error: "cnbc_markets_unavailable", detail: String(e) },
      { status: 503 }
    );
  }
}
