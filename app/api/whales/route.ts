import { NextResponse } from "next/server";
import { fetchWhaleMovements } from "@/lib/adapters/whale-alert";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await fetchWhaleMovements();
    return NextResponse.json({
      movements: result.movements,
      fetchedAt: new Date().toISOString(),
      whaleAlertConfigured: result.whaleAlertConfigured,
      message: result.message,
    });
  } catch (e) {
    console.error("whales route:", e);
    return NextResponse.json(
      {
        movements: [],
        fetchedAt: new Date().toISOString(),
        whaleAlertConfigured: Boolean(process.env.WHALE_ALERT_API_KEY?.trim()),
        message: "whales_unavailable",
        error: String(e),
      },
      { status: 503 }
    );
  }
}
