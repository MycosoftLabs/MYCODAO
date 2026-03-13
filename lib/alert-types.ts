/**
 * Alert types for the Market Intelligence Terminal.
 * State is in-memory (or localStorage); optional future API.
 */

export type AlertType =
  | "price_above"
  | "price_below"
  | "pct_move"
  | "proposal_approved"
  | "grant_deployed"
  | "macro_event";

export type Alert = {
  id: string;
  type: AlertType;
  /** Symbol (e.g. BTC, NVDA) or entity name */
  symbol?: string;
  /** Human-readable message for status module */
  message: string;
  /** Optional threshold or payload */
  threshold?: number | string;
  triggeredAt: string; // ISO
  read: boolean;
};

export function createAlert(
  type: AlertType,
  message: string,
  opts: { symbol?: string; threshold?: number | string } = {}
): Alert {
  return {
    id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    symbol: opts.symbol,
    message,
    threshold: opts.threshold,
    triggeredAt: new Date().toISOString(),
    read: false,
  };
}
