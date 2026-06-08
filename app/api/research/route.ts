import { NextResponse } from "next/server";
import { fetchResearchItems } from "@/lib/adapters/research";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    40,
    Math.max(8, parseInt(searchParams.get("limit") || "24", 10) || 24)
  );

  try {
    const data = await fetchResearchItems(limit);
    return NextResponse.json(data);
  } catch (e) {
    console.error("research route:", e);
    return NextResponse.json({ error: "research_unavailable", detail: String(e) }, { status: 503 });
  }
}
