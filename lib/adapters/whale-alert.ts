/**
 * Crypto whale movements — Whale Alert REST API (WHALE_ALERT_API_KEY) with
 * supplemental large Polymarket trades when the key is absent.
 * @see https://developer.whale-alert.io/documentation/
 * @see https://whale-alert.io/
 */

import type { WhaleMovement } from "@/lib/types";

const WHALE_ALERT_BASE = "https://api.whale-alert.io/v1";
const POLY_TRADES_URL = "https://data-api.polymarket.com/trades";
const MIN_USD_WHALE = Number(process.env.WHALE_ALERT_MIN_USD ?? "500000");
const POLY_TRADE_MIN_USD = Number(process.env.POLY_WHALE_TRADE_MIN_USD ?? "2500");

function formatUsd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function formatAmount(amount: number, symbol: string): string {
  if (!Number.isFinite(amount)) return "—";
  const sym = symbol.toUpperCase();
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M ${sym}`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(2)}K ${sym}`;
  if (amount >= 1) return `${amount.toFixed(2)} ${sym}`;
  return `${amount} ${sym}`;
}

function timeAgoFromUnix(ts: number): string {
  const sec = Math.max(0, Math.floor(Date.now() / 1000 - ts));
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

function truncateAddr(addr: string, head = 6, tail = 4): string {
  const a = (addr || "").trim();
  if (a.length <= head + tail + 2) return a || "—";
  return `${a.slice(0, head)}…${a.slice(-tail)}`;
}

function mapTransactionType(raw: string, fromType?: string, toType?: string): WhaleMovement["type"] {
  const t = (raw || "").toLowerCase();
  if (t.includes("mint")) return "MINT";
  if (t.includes("burn")) return "BURN";
  if (fromType === "exchange" && toType !== "exchange") return "BUY";
  if (toType === "exchange" && fromType !== "exchange") return "SELL";
  return "TRANSFER";
}

type WhaleAlertOwner = { address?: string; owner?: string; owner_type?: string };
type WhaleAlertTx = {
  blockchain?: string;
  symbol?: string;
  hash?: string;
  transaction_type?: string;
  timestamp?: number;
  amount?: number;
  amount_usd?: number;
  from?: WhaleAlertOwner;
  to?: WhaleAlertOwner;
};

async function fetchWhaleAlertTransactions(apiKey: string): Promise<WhaleMovement[]> {
  const start = Math.floor(Date.now() / 1000) - 3600;
  const url = new URL(`${WHALE_ALERT_BASE}/transactions`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("min_value", String(MIN_USD_WHALE));
  url.searchParams.set("start", String(start));
  url.searchParams.set("limit", "80");

  const res = await fetch(url.toString(), {
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];

  const body = (await res.json()) as { result?: string; transactions?: WhaleAlertTx[] };
  if (body.result !== "success" || !Array.isArray(body.transactions)) return [];

  return body.transactions
    .filter((tx) => (tx.amount_usd ?? 0) >= MIN_USD_WHALE)
    .map((tx, i) => {
      const usdValue = tx.amount_usd ?? 0;
      const symbol = (tx.symbol || "—").toUpperCase();
      const fromAddr = tx.from?.address || tx.from?.owner || "unknown";
      const toAddr = tx.to?.address || tx.to?.owner || "unknown";
      const type = mapTransactionType(
        tx.transaction_type || "transfer",
        tx.from?.owner_type,
        tx.to?.owner_type
      );
      const ts = tx.timestamp ?? Math.floor(Date.now() / 1000);
      const ownerLabel = tx.from?.owner || tx.to?.owner;
      const text = ownerLabel
        ? `${type} ${formatAmount(tx.amount ?? 0, symbol)} (${formatUsd(usdValue)}) — ${ownerLabel}`
        : `${type} ${formatAmount(tx.amount ?? 0, symbol)} (${formatUsd(usdValue)})`;

      return {
        id: tx.hash || `wa-${ts}-${i}`,
        source: "whale_alert" as const,
        blockchain: tx.blockchain,
        symbol,
        amount: formatAmount(tx.amount ?? 0, symbol),
        usd: formatUsd(usdValue),
        usdValue,
        from: truncateAddr(fromAddr),
        to: truncateAddr(toAddr),
        wallet: truncateAddr(fromAddr),
        type,
        timeAgo: timeAgoFromUnix(ts),
        timestamp: ts,
        text,
        url: tx.hash ? `https://whale-alert.io/` : "https://whale-alert.io/",
        txHash: tx.hash,
      };
    })
    .sort((a, b) => b.timestamp - a.timestamp);
}

type PolyTrade = {
  side?: string;
  size?: number;
  price?: number;
  timestamp?: number;
  title?: string;
  outcome?: string;
  slug?: string;
  eventSlug?: string;
  transactionHash?: string;
  proxyWallet?: string;
  pseudonym?: string;
  name?: string;
};

async function fetchLargePolymarketTrades(): Promise<WhaleMovement[]> {
  const url = `${POLY_TRADES_URL}?limit=120`;
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];

  const rows = (await res.json()) as PolyTrade[];
  if (!Array.isArray(rows)) return [];

  return rows
    .map((t, i) => {
      const size = t.size ?? 0;
      const price = t.price ?? 0;
      const usdValue = size * price;
      return { t, usdValue, i };
    })
    .filter(({ usdValue }) => usdValue >= POLY_TRADE_MIN_USD)
    .sort((a, b) => b.usdValue - a.usdValue)
    .slice(0, 40)
    .map(({ t, usdValue, i }) => {
      const side = (t.side || "BUY").toUpperCase();
      const type: WhaleMovement["type"] = side === "SELL" ? "SELL" : "BUY";
      const ts = t.timestamp ?? Math.floor(Date.now() / 1000);
      const wallet = t.proxyWallet || t.pseudonym || t.name || "polymarket";
      const slug = t.eventSlug || t.slug;
      const url = slug ? `https://polymarket.com/event/${slug}` : "https://polymarket.com/";

      return {
        id: t.transactionHash || `poly-${ts}-${i}`,
        source: "polymarket_trade" as const,
        blockchain: "polygon",
        symbol: "USDC",
        amount: `${(t.size ?? 0).toLocaleString()} shares`,
        usd: formatUsd(usdValue),
        usdValue,
        from: truncateAddr(wallet),
        to: t.outcome || "market",
        wallet: truncateAddr(String(wallet)),
        type,
        timeAgo: timeAgoFromUnix(ts),
        timestamp: ts,
        text: `${type} ${t.outcome || "position"} on "${(t.title || "market").slice(0, 72)}"`,
        url,
        txHash: t.transactionHash,
      };
    });
}

export async function fetchWhaleMovements(): Promise<{
  movements: WhaleMovement[];
  whaleAlertConfigured: boolean;
  message?: string;
}> {
  const apiKey = process.env.WHALE_ALERT_API_KEY?.trim();
  const whaleAlertConfigured = Boolean(apiKey);

  if (apiKey) {
    try {
      const fromWhaleAlert = await fetchWhaleAlertTransactions(apiKey);
      if (fromWhaleAlert.length) {
        return { movements: fromWhaleAlert, whaleAlertConfigured: true };
      }
    } catch (e) {
      console.error("whale-alert adapter:", e);
    }
  }

  try {
    const supplemental = await fetchLargePolymarketTrades();
    if (supplemental.length) {
      return {
        movements: supplemental,
        whaleAlertConfigured,
        message: whaleAlertConfigured
          ? "whale_alert_empty_using_polymarket_trades"
          : "set_WHALE_ALERT_API_KEY_for_on_chain_whales",
      };
    }
  } catch (e) {
    console.error("polymarket whale trades:", e);
  }

  return {
    movements: [],
    whaleAlertConfigured,
    message: whaleAlertConfigured
      ? "no_recent_whales"
      : "set_WHALE_ALERT_API_KEY_for_on_chain_whales",
  };
}
