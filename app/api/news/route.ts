import { NextResponse } from "next/server";
import { fetchNews } from "@/lib/adapters/news";

export async function GET() {
  try {
    const news = await fetchNews();
    return NextResponse.json(news);
  } catch {
    const { getMockNews } = await import("@/lib/mock-data");
    return NextResponse.json(getMockNews());
  }
}
