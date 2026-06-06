import { NextResponse } from "next/server";
import { fetchPredictionMarkets } from "@/lib/adapters/prediction-markets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const bundle = await fetchPredictionMarkets();
    return NextResponse.json(bundle);
  } catch (e) {
    console.error("prediction-markets route:", e);
    return NextResponse.json(
      {
        polymarket: [],
        kalshi: [],
        politics: [],
        fetchedAt: new Date().toISOString(),
        sources: {
          whaleAlertConfigured: Boolean(process.env.WHALE_ALERT_API_KEY?.trim()),
          polymarket: false,
          kalshi: false,
        },
        error: String(e),
      },
      { status: 503 }
    );
  }
}
