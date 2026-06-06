/**
 * In-memory Finnhub webhook events (last N). Used to invalidate ticker cache on market updates.
 */

import { invalidateTickerCache } from "@/lib/adapters/tickers";

export interface FinnhubWebhookEvent {
  id: string;
  type: string;
  symbol?: string;
  receivedAt: string;
  payload: unknown;
}

const MAX_EVENTS = 50;
const events: FinnhubWebhookEvent[] = [];

export function pushFinnhubWebhookEvent(type: string, payload: unknown, symbol?: string): FinnhubWebhookEvent {
  const evt: FinnhubWebhookEvent = {
    id: `fh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    symbol,
    receivedAt: new Date().toISOString(),
    payload,
  };
  events.unshift(evt);
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;

  const t = type.toLowerCase();
  if (t.includes("trade") || t.includes("quote") || t.includes("price")) {
    invalidateTickerCache();
  }
  return evt;
}

export function listFinnhubWebhookEvents(limit = 20): FinnhubWebhookEvent[] {
  return events.slice(0, Math.max(1, Math.min(limit, MAX_EVENTS)));
}
