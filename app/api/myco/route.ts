import { NextResponse } from "next/server";
import { fetchMycoSnapshot } from "@/lib/adapters/myco";

export async function GET() {
  try {
    const snapshot = await fetchMycoSnapshot();
    return NextResponse.json(snapshot);
  } catch {
    const { getMockMycoSnapshot } = await import("@/lib/mock-data");
    return NextResponse.json(getMockMycoSnapshot());
  }
}
