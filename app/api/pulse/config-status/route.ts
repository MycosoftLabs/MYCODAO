import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Which integration env vars are set (boolean only — no values). For ops dashboards. */
function present(v: string | undefined): boolean {
  return Boolean(v?.trim());
}

export async function GET() {
  return NextResponse.json({
    service: "mycodao-pulse",
    time: new Date().toISOString(),
    configured: {
      MAS_API_URL: present(process.env.MAS_API_URL),
      MINDEX_API_URL: present(process.env.MINDEX_API_URL),
      NATUREOS_API_URL: present(process.env.NATUREOS_API_URL),
      MINDEX_INTERNAL_TOKEN: present(process.env.MINDEX_INTERNAL_TOKEN),
      FINNHUB_API_KEY: present(process.env.FINNHUB_API_KEY),
      FINNHUB_WEBHOOK_SECRET: present(process.env.FINNHUB_WEBHOOK_SECRET),
      CRYPTO_NEWS_RSS: true,
      GNEWS_API_KEY: present(process.env.GNEWS_API_KEY),
      NEWS_API_KEY: present(process.env.NEWS_API_KEY),
      TRADING_BROKER_BASE_URL: present(process.env.TRADING_BROKER_BASE_URL),
      PULSE_TRADING_API_KEY: present(process.env.PULSE_TRADING_API_KEY),
      PODCAST_RSS_URLS: present(process.env.PODCAST_RSS_URLS),
      MYCO_SOLANA_MINT: present(process.env.MYCO_SOLANA_MINT),
      SUPABASE_URL: present(process.env.SUPABASE_URL),
      SUPABASE_ANON_KEY: present(process.env.SUPABASE_ANON_KEY),
      SUPABASE_SERVICE_ROLE_KEY: present(process.env.SUPABASE_SERVICE_ROLE_KEY),
      PULSE_MAS_PROXY_SECRET: present(process.env.PULSE_MAS_PROXY_SECRET),
      NEXT_PUBLIC_BASE_PATH: present(process.env.NEXT_PUBLIC_BASE_PATH),
      NEXT_PUBLIC_PULSE_SSE: present(process.env.NEXT_PUBLIC_PULSE_SSE),
      WHALE_ALERT_API_KEY: present(process.env.WHALE_ALERT_API_KEY),
      REALMS_V2_API_URL: present(process.env.REALMS_V2_API_URL),
    },
    realms: {
      exploreUrl: "https://v2.realms.today/explore",
      launchpadUrl: "https://v2.realms.today/launchpad",
      publicApiDefault: "https://v2.realms.today/api/v1",
    },
  });
}
