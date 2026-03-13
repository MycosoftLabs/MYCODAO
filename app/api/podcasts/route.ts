import { NextResponse } from "next/server";
import { getMockPodcasts } from "@/lib/mock-data";

// TODO: Replace with real podcast RSS/API
export async function GET() {
  const podcasts = getMockPodcasts();
  return NextResponse.json(podcasts);
}
