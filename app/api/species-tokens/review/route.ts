import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Reviewer BFF: forwards approved/rejected findings to the tokenization service.
 * After approval the worker auto-mints (known untokenized) and/or transfers rewards.
 */
export async function POST(request: Request) {
  const reviewerKey = process.env.TOKENIZATION_REVIEWER_KEY?.trim();
  const serviceUrl = process.env.SPECIES_TOKEN_SERVICE_URL?.trim()?.replace(/\/$/, "");
  if (!reviewerKey || !serviceUrl || reviewerKey.length < 32) {
    return NextResponse.json(
      { error: "Reviewer access is not configured.", reason: "reviewer_unconfigured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  const gate = request.headers.get("x-species-reviewer-key")?.trim();
  if (!gate || gate.length !== reviewerKey.length || gate !== reviewerKey) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  try {
    const upstream = await fetch(`${serviceUrl}/v1/review`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${reviewerKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "content-type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "The species token service is unavailable.", reason: "service_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
