import { NextRequest, NextResponse } from "next/server";
import {
  fetchRealmsDaoDetail,
  fetchRealmsDaoMembers,
  fetchRealmsDaoProposals,
  fetchRealmsDaoTreasury,
} from "@/lib/adapters/realms";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ pk: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { pk } = await context.params;
  const url = new URL(request.url);
  const withProposals = url.searchParams.get("proposals") === "1";
  const withTreasury = url.searchParams.get("treasury") === "1";
  const withMembers = url.searchParams.get("members") === "1";

  if (!pk?.trim()) {
    return NextResponse.json({ dao: null, proposals: [] }, { status: 400 });
  }

  const trimmed = pk.trim();

  try {
    const dao = await fetchRealmsDaoDetail(trimmed);
    const [proposals, treasury, members] = await Promise.all([
      withProposals ? fetchRealmsDaoProposals(trimmed) : Promise.resolve([]),
      withTreasury ? fetchRealmsDaoTreasury(trimmed) : Promise.resolve([]),
      withMembers ? fetchRealmsDaoMembers(trimmed) : Promise.resolve([]),
    ]);

    return NextResponse.json({
      dao,
      proposals,
      treasury: withTreasury ? treasury : undefined,
      members: withMembers ? members : undefined,
      fetchedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("realms dao detail route:", e);
    return NextResponse.json(
      { dao: null, proposals: [], error: "realms_unavailable", detail: String(e) },
      { status: 503 }
    );
  }
}
