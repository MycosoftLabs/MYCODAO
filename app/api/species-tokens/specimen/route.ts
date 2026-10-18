import { mindexSpecimen } from "@/lib/server/species-catalog-mindex";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request) {
  const taxonId = new URL(request.url).searchParams.get("taxonId") || "";
  return mindexSpecimen(taxonId);
}
