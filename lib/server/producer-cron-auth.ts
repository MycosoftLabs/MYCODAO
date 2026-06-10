import { verifyProducerApiKey } from "@/lib/server/news-producer";

function normalizeKey(value: string | undefined): string {
  if (!value) return "";
  let v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

export function verifySchedulerCronAuth(req: Request): boolean {
  const expected =
    normalizeKey(process.env.BLOCKS_SCHEDULER_CRON_SECRET) ||
    normalizeKey(process.env.NEWS_PRODUCER_API_KEY);
  if (!expected) return false;

  const header =
    normalizeKey(req.headers.get("x-blocks-cron-secret") ?? undefined) ||
    normalizeKey(req.headers.get("x-news-producer-key") ?? undefined) ||
    normalizeKey(
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? undefined,
    );

  const url = new URL(req.url);
  const queryToken = normalizeKey(url.searchParams.get("token") ?? undefined);

  return (
    (Boolean(header) && header === expected) ||
    (Boolean(queryToken) && queryToken === expected) ||
    verifyProducerApiKey(req)
  );
}
