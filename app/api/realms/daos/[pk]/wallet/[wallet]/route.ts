import { NextRequest, NextResponse } from "next/server";
import { fetchWalletDaoParticipation } from "@/lib/adapters/realms";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ pk: string; wallet: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { pk, wallet } = await context.params;

  if (!pk?.trim() || !wallet?.trim()) {
    return NextResponse.json({ participation: null }, { status: 400 });
  }

  try {
    const participation = await fetchWalletDaoParticipation(pk.trim(), wallet.trim());
    return NextResponse.json({
      participation,
      fetchedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("realms wallet participation:", e);
    return NextResponse.json(
      { participation: null, error: "realms_unavailable", detail: String(e) },
      { status: 503 }
    );
  }
}
