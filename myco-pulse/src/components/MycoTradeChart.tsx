import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../lib/utils";
import { pulseApiUrl } from "../lib/apiOrigin";

export type MycoTimeframe = "day" | "hour4" | "hour1" | "minute15";

export interface MycoCandle {
  t: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume_usd: number;
}

export interface MycoHistory {
  timeframe: MycoTimeframe;
  dex: string | null;
  pool: string;
  pool_name: string | null;
  pool_created_at: string | null;
  reserve_usd: number | null;
  price_usd: number | null;
  price_change_24h_pct: number | null;
  volume_24h_usd: number | null;
  transactions_24h: { buys: number; sells: number } | null;
  last_price_usd: number | null;
  last_trade_at: string | null;
  last_trade_day: string | null;
  all_time_high_usd: number | null;
  all_time_high_day: string | null;
  candles: MycoCandle[];
  dexscreener_pairs_active: boolean;
  liquidity_status: "active" | "low" | "none" | "unknown";
  low_liquidity_threshold_usd: number;
  dexscreener_url: string;
  geckoterminal_url: string;
}

interface MycoTrade {
  tx_hash: string;
  at: string;
  side: "buy" | "sell";
  price_usd: number | null;
  myco_amount: number | null;
  volume_usd: number | null;
  wallet: string | null;
}

const TIMEFRAME_LABELS: Record<MycoTimeframe, string> = {
  day: "1D",
  hour4: "4H",
  hour1: "1H",
  minute15: "15M",
};

const VISIBLE_CANDLES: Record<MycoTimeframe, number> = { day: 365, hour4: 180, hour1: 168, minute15: 192 };
const CHART_W = 1000;
const PRICE_H = 200;
const VOL_H = 48;
const GAP = 8;
const AXIS_W = 72;
const REFRESH_MS = 60_000;

export function formatMycoPrice(value?: number | null): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "—";
  return `$${value < 0.01 ? value.toPrecision(4) : value.toFixed(4)}`;
}

function formatUsd(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toFixed(value < 10 ? 2 : 0)}`;
}

function formatTick(t: number, tf: MycoTimeframe): string {
  const d = new Date(t);
  return tf === "day"
    ? d.toLocaleDateString([], { month: "short", day: "numeric", year: "2-digit" })
    : d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function shortAddress(a: string | null): string {
  return a ? `${a.slice(0, 4)}…${a.slice(-4)}` : "—";
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "";
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function useMycoHistory(tf: MycoTimeframe) {
  const [history, setHistory] = useState<MycoHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const load = () => {
      fetch(pulseApiUrl(`/api/myco/history?tf=${tf}`), { cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<MycoHistory>) : null))
        .then((h) => active && h && setHistory(h))
        .catch(() => undefined)
        .finally(() => active && setIsLoading(false));
    };
    setIsLoading(true);
    load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [tf]);
  return { history, isLoading };
}

function useMycoTrades() {
  const [trades, setTrades] = useState<MycoTrade[] | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  useEffect(() => {
    let active = true;
    const load = () =>
      fetch(pulseApiUrl("/api/myco/trades"), { cache: "no-store" })
        .then((r) => r.json() as Promise<{ trades?: MycoTrade[]; rate_limited?: boolean }>)
        .then((j) => {
          if (!active) return;
          setIsRateLimited(Boolean(j?.rate_limited));
          setTrades(j?.trades ?? []);
        })
        .catch(() => active && setTrades([]));
    void load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);
  return { trades, isRateLimited };
}

function CandleChart({ candles, tf }: { candles: MycoCandle[]; tf: MycoTimeframe }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const geometry = useMemo(() => {
    const lows = candles.map((c) => c.low).filter((v) => v > 0);
    const highs = candles.map((c) => c.high);
    const min = Math.min(...lows);
    const max = Math.max(...highs);
    const pad = (max - min) * 0.06 || max * 0.05 || 1e-9;
    const lo = Math.max(0, min - pad);
    const hi = max + pad;
    const maxVol = Math.max(...candles.map((c) => c.volume_usd), 1);
    const plotW = CHART_W - AXIS_W;
    const step = plotW / candles.length;
    const y = (p: number) => PRICE_H - ((p - lo) / (hi - lo || 1)) * PRICE_H;
    return { lo, hi, maxVol, step, plotW, y };
  }, [candles]);

  const { lo, hi, maxVol, step, plotW, y } = geometry;
  const bodyW = Math.max(1, Math.min(10, step * 0.7));
  const priceTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => lo + (hi - lo) * f);
  const dateTickEvery = Math.max(1, Math.floor(candles.length / 5));
  const hovered = hoverIndex != null ? candles[hoverIndex] : candles[candles.length - 1];
  const hoveredChange = hovered && hovered.open > 0 ? ((hovered.close - hovered.open) / hovered.open) * 100 : 0;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * CHART_W;
    const i = Math.floor(x / step);
    setHoverIndex(i >= 0 && i < candles.length ? i : null);
  };

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 font-mono text-[10px] text-white/70">
        <span className="text-white/45">{hovered ? formatTick(hovered.t, tf) : ""}</span>
        <span>O {formatMycoPrice(hovered?.open)}</span>
        <span>H {formatMycoPrice(hovered?.high)}</span>
        <span>L {formatMycoPrice(hovered?.low)}</span>
        <span>C {formatMycoPrice(hovered?.close)}</span>
        <span className={hoveredChange >= 0 ? "text-myco-accent" : "text-red-400"}>
          {hoveredChange >= 0 ? "+" : ""}
          {hoveredChange.toFixed(2)}%
        </span>
        <span>Vol {formatUsd(hovered?.volume_usd)}</span>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHART_W} ${PRICE_H + GAP + VOL_H + 16}`}
        className="h-64 w-full touch-none select-none md:h-72"
        preserveAspectRatio="none"
        role="img"
        aria-label={`MYCO ${TIMEFRAME_LABELS[tf]} candlestick chart with volume`}
        onPointerMove={onMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        {priceTicks.map((p) => (
          <g key={p}>
            <line x1={0} x2={plotW} y1={y(p)} y2={y(p)} stroke="rgba(255,255,255,0.06)" vectorEffect="non-scaling-stroke" />
            <text x={plotW + 6} y={y(p) + 3} fontSize="10" fill="rgba(255,255,255,0.45)" fontFamily="monospace">
              {formatMycoPrice(p)}
            </text>
          </g>
        ))}
        {candles.map((c, i) => {
          const cx = i * step + step / 2;
          const isUp = c.close >= c.open;
          const color = isUp ? "#00ff88" : "#ef4444";
          const top = y(Math.max(c.open, c.close));
          const bottom = y(Math.min(c.open, c.close));
          const volH = (c.volume_usd / maxVol) * VOL_H;
          return (
            <g key={c.t}>
              <line x1={cx} x2={cx} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <rect x={cx - bodyW / 2} y={top} width={bodyW} height={Math.max(1, bottom - top)} fill={color} />
              <rect
                x={cx - bodyW / 2}
                y={PRICE_H + GAP + VOL_H - volH}
                width={bodyW}
                height={volH}
                fill={color}
                opacity={0.35}
              />
            </g>
          );
        })}
        {candles.map((c, i) =>
          i % dateTickEvery === 0 ? (
            <text
              key={`d-${c.t}`}
              x={i * step + step / 2}
              y={PRICE_H + GAP + VOL_H + 13}
              fontSize="10"
              fill="rgba(255,255,255,0.4)"
              textAnchor="middle"
              fontFamily="monospace"
            >
              {formatTick(c.t, tf)}
            </text>
          ) : null
        )}
        {hoverIndex != null ? (
          <line
            x1={hoverIndex * step + step / 2}
            x2={hoverIndex * step + step / 2}
            y1={0}
            y2={PRICE_H + GAP + VOL_H}
            stroke="rgba(255,255,255,0.35)"
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </svg>
    </div>
  );
}

interface MycoTradeChartProps {
  onHistory?: (history: MycoHistory) => void;
}

/** Real MYCO / SOL pool trading data: OHLCV candles, volume and recent swaps. */
export function MycoTradeChart({ onHistory }: MycoTradeChartProps) {
  const [tf, setTf] = useState<MycoTimeframe>("day");
  const { history, isLoading } = useMycoHistory(tf);
  const { trades, isRateLimited } = useMycoTrades();

  useEffect(() => {
    if (history) onHistory?.(history);
  }, [history, onHistory]);

  const visible = useMemo(
    () => (history?.candles ?? []).slice(-VISIBLE_CANDLES[tf]),
    [history, tf]
  );

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 border border-white/10 bg-white/[0.02] p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">
            {history?.pool_name ?? "MYCO / SOL"} · {history?.dex ?? "DEX"} · {visible.length} candles
          </p>
          <div className="flex gap-1" role="group" aria-label="Chart timeframe">
            {(Object.keys(TIMEFRAME_LABELS) as MycoTimeframe[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTf(id)}
                aria-pressed={tf === id}
                className={cn(
                  "min-h-[32px] min-w-[40px] border px-2 text-[10px] font-black touch-manipulation",
                  tf === id ? "border-myco-accent bg-myco-accent/10 text-myco-accent" : "border-white/10 text-dim hover:text-white"
                )}
              >
                {TIMEFRAME_LABELS[id]}
              </button>
            ))}
          </div>
        </div>
        {visible.length > 1 ? (
          <CandleChart candles={visible} tf={tf} />
        ) : (
          <p className="flex h-64 items-center justify-center text-center text-[11px] text-dim md:h-72">
            {isLoading
              ? "Loading MYCO trading history…"
              : `No ${TIMEFRAME_LABELS[tf]} trades in this window. The pool last traded ${
                  history?.last_trade_at ? relativeTime(history.last_trade_at) : "at an unknown time"
                }; try a longer timeframe.`}
          </p>
        )}
      </div>

      <div className="flex min-h-0 flex-col border border-white/10 bg-white/[0.02] p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/50">
          Recent trades <span className="font-normal normal-case tracking-normal text-white/35">· on-chain</span>
        </p>
        {trades === null ? (
          <p className="text-[11px] text-dim">Loading trades…</p>
        ) : trades.length === 0 ? (
          <p className="text-[11px] text-dim">
            {isRateLimited
              ? "GeckoTerminal is rate-limiting requests; trades will load on the next refresh."
              : "No swaps found in the pool's recent on-chain history."}
          </p>
        ) : (
          <ul className="max-h-72 min-h-0 flex-1 overflow-y-auto no-scrollbar">
            {trades.slice(0, 30).map((trade) => (
              <li key={trade.tx_hash} className="border-b border-white/5 py-1.5 last:border-b-0">
                <a
                  href={`https://solscan.io/tx/${trade.tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid grid-cols-[40px_1fr_auto] items-center gap-2 font-mono text-[10px] hover:bg-white/[0.03]"
                >
                  <span className={cn("font-black uppercase", trade.side === "buy" ? "text-myco-accent" : "text-red-400")}>
                    {trade.side}
                  </span>
                  <span className="min-w-0 truncate text-white/80">
                    {trade.myco_amount != null
                      ? trade.myco_amount >= 1
                        ? Math.round(trade.myco_amount).toLocaleString()
                        : trade.myco_amount.toPrecision(2)
                      : "—"}{" "}
                    MYCO
                    <span className="text-white/40"> · {formatMycoPrice(trade.price_usd)}</span>
                  </span>
                  <span className="text-right text-white/60">
                    {formatUsd(trade.volume_usd)}
                    <span className="block text-[9px] text-white/35">
                      {relativeTime(trade.at)} · {shortAddress(trade.wallet)}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
