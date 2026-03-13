import { NextResponse } from "next/server";
import { getMockLearn } from "@/lib/mock-data";

// TODO: Replace with CMS/content API
export async function GET() {
  const modules = getMockLearn();
  return NextResponse.json(modules);
}
