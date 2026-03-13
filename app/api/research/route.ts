import { NextResponse } from "next/server";
import { getMockResearch } from "@/lib/mock-data";

export async function GET() {
  const data = getMockResearch();
  return NextResponse.json(data);
}
