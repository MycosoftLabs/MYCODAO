import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ExternalLink } from "lucide-react";
import { cn } from "../lib/utils";
import {
  buildBigMovers,
  findTickerStrip,
  type TickerGroups,
  type TickerStripItem,
} from "../lib/tickerDisplay";
import type { PulseCalendarEvent, PulseMycoSnapshot, PulseTicker } from "../lib/pulseApi";
import { formatGlobalMarketSessionSummary } from "../lib/marketSessions";
import { fetchGlobalMarketData } from "../services/apiService";

interface GlobalMarketSnapshot {
  SOL?: string;
  BTC?: string;
  ETH?: string;
  status?: string;
}

interface TradeMarketWidgetsProps {
  tickerGroups: TickerGroups;
  tickers: PulseTicker[];
  mycoSnapshot: PulseMycoSnapshot | null;
  chartData: { time: string; price: number; volume?: number }[];
  calendar: PulseCalendarEvent[];
  fearGreed: { value: number; classification: string } | null;
  onOpenMyco?: () => void;
}

function MarketCard({
  title,
  source,
  children,
  className,
}: {
  title: string;
  source?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("glass-bento border-white/5 bg-black/40 flex flex-col min-h-[220px] max-h-80 overflow-hidden", className)}>
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10 shrink-0">
        <h3 className="text-[10px] font-black text-white uppercase tracking-widest truncate">{title}</h3>
        {source ? <span className="text-[8px] font-bold text-dim uppercase tracking-widest shrink-0">{source}</span> : null}
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3">{children}</div>
    </section>
  );
}

function TickerList({ items }: { items: TickerStripItem[] }) {
  if (!items.length) {
    return <p className="text-[9px] font-bold text-dim uppercase py-2">Awaiting live feed…</p>;
  }
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item, i) => (
        <li key={`${item.s}-${i}`} className="flex items-center justify-between py-1 px-1 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-bold text-dim w-12 shrink-0">{item.s}</span>
            <span className="text-[11px] font-mono font-medium truncate">{item.p}</span>
          </div>
          <span className={cn("text-[9px] font-bold shrink-0", item.up ? "text-myco-accent" : "text-red-500")}>{item.c}</span>
        </li>
      ))}
    </ul>
  );
}

export function TradeMarketWidgets({
  tickerGroups,
  tickers,
  mycoSnapshot,
  chartData,
  calendar,
  fearGreed,
  onOpenMyco,
}: TradeMarketWidgetsProps) {
  const [globalMarket, setGlobalMarket] = useState<GlobalMarketSnapshot>({ status: "SYNCING" });
  const [sessionSummary, setSessionSummary] = useState(() => formatGlobalMarketSessionSummary());

  useEffect(() => {
    let isActive = true;
    void fetchGlobalMarketData().then((data: GlobalMarketSnapshot) => {
      if (isActive) setGlobalMarket(data);
    });
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setSessionSummary(formatGlobalMarketSessionSummary()), 30_000);
    return () => clearInterval(t);
  }, []);

  const bigMovers = useMemo(() => buildBigMovers(tickers, 10), [tickers]);

  const majors = useMemo(() => {
    const pick = (sym: string) => findTickerStrip(tickerGroups, sym);
    return { BTC: pick("BTC"), ETH: pick("ETH"), SOL: pick("SOL") };
  }, [tickerGroups]);

  const vixStrip = useMemo(() => findTickerStrip(tickerGroups, "VIX"), [tickerGroups]);
  const mycoStrip = useMemo(() => findTickerStrip(tickerGroups, "MYCO"), [tickerGroups]);

  const mycoDist = useMemo(() => {
    const dist = mycoSnapshot?.canonical?.distribution ?? [];
    const find = (needle: string) => dist.find((d) => d.title.toLowerCase().includes(needle))?.pct;
    return {
      supply:
        mycoSnapshot?.canonical?.totalSupplyLabel ??
        (mycoSnapshot?.supply ? `${mycoSnapshot.supply.toLocaleString()} MYCO` : null),
      community: find("community"),
      biobank: find("biobank"),
    };
  }, [mycoSnapshot]);

  const tickerSections: { id: keyof TickerGroups; title: string }[] = [
    { id: "crypto", title: "Crypto" },
    { id: "metals", title: "Metals" },
    { id: "commodities", title: "Commodities" },
    { id: "bio", title: "Bio assets" },
    { id: "tech", title: "Tech" },
    { id: "business", title: "Business" },
    { id: "watchlist", title: "Watchlist" },
    { id: "indicators", title: "Global indexes" },
    { id: "bonds", title: "Bonds" },
  ];

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[10px] font-black text-dim uppercase tracking-[0.3em] px-1">Market snapshot</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
        <MarketCard title="Market overview" source={globalMarket.status} className="sm:col-span-2 max-h-none">
          <p className="text-[8px] font-bold text-dim uppercase tracking-[0.2em] mb-3">Sessions: {sessionSummary}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
            {[
              { label: "Bitcoin", strip: majors.BTC, fallback: globalMarket.BTC },
              { label: "Ethereum", strip: majors.ETH, fallback: globalMarket.ETH },
              { label: "Solana", strip: majors.SOL, fallback: globalMarket.SOL },
            ].map((m) => (
              <div key={m.label} className="p-3 border border-white/5 bg-white/[0.02]">
                <span className="text-[9px] font-black text-dim uppercase tracking-widest block mb-1">{m.label}</span>
                <div className="flex justify-between items-end gap-2">
                  <span className="text-lg font-black text-white font-mono truncate">{m.strip?.p ?? m.fallback ?? "—"}</span>
                  {m.strip?.c ? (
                    <span className={cn("text-xs font-bold shrink-0", m.strip.up ? "text-myco-accent" : "text-red-400")}>{m.strip.c}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-3 border border-white/5 bg-black/40">
              <span className="text-[9px] font-black text-dim uppercase tracking-widest block mb-1">Crypto fear &amp; greed</span>
              <span className="text-sm font-black text-myco-accent">
                {fearGreed ? `${fearGreed.classification} (${fearGreed.value})` : "—"}
              </span>
            </div>
            <div className="p-3 border border-white/5 bg-black/40">
              <span className="text-[9px] font-black text-dim uppercase tracking-widest block mb-1">VIX</span>
              <span className="text-sm font-black text-white">{vixStrip?.p ?? "—"}</span>
              {vixStrip?.c ? (
                <span className={cn("ml-2 text-[10px] font-bold", vixStrip.up ? "text-myco-accent" : "text-red-400")}>{vixStrip.c}</span>
              ) : null}
            </div>
          </div>
          <div className="h-32">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="tradeBtcWave" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" hide />
                  <YAxis hide domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#050505", border: "1px solid rgba(255,255,255,0.1)", fontSize: "10px" }}
                    itemStyle={{ color: "#00ff88" }}
                  />
                  <Area type="monotone" dataKey="price" stroke="#00ff88" fillOpacity={1} fill="url(#tradeBtcWave)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-[9px] font-bold text-dim uppercase py-2">No BTC 1h history from /api/ohlc</p>
            )}
          </div>
          <p className="text-[8px] text-dim uppercase tracking-widest mt-1">BTC 1h close</p>
        </MarketCard>

        <MarketCard title="Big movers" source="/api/tickers">
          {bigMovers.length ? (
            <ul className="flex flex-col gap-0.5">
              {bigMovers.map((m, i) => (
                <li key={`${m.s}-${i}`} className="flex flex-col border-b border-white/5 py-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-white">{m.s}</span>
                    <span className={cn("text-[10px] font-bold", m.up ? "text-myco-accent" : "text-red-500")}>{m.c}</span>
                  </div>
                  {m.name ? <p className="text-[8px] text-dim truncate uppercase font-bold">{m.name}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[9px] font-bold text-dim uppercase py-2">Awaiting live movers…</p>
          )}
        </MarketCard>

        {tickerSections.map((section) => (
          <MarketCard key={section.id} title={section.title} source="/api/tickers">
            <TickerList items={tickerGroups[section.id] ?? []} />
          </MarketCard>
        ))}

        <MarketCard title="MYCO ecosystem" source="/api/myco">
          <div className="flex justify-between items-start gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-black text-myco-accent">
                {mycoStrip?.p ? `$${mycoStrip.p}` : mycoSnapshot?.price ? `$${mycoSnapshot.price}` : "—"}
              </span>
              <span className="text-[8px] text-dim font-bold uppercase">Supply: {mycoDist.supply ?? "—"}</span>
              <span className="text-[8px] text-dim font-bold uppercase">
                Community: {mycoDist.community != null ? `${mycoDist.community}%` : "—"}
              </span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span
                className={cn(
                  "text-[10px] font-bold",
                  (mycoStrip?.up ?? (mycoSnapshot?.changePct ?? 0) >= 0) ? "text-myco-accent" : "text-red-400",
                )}
              >
                {mycoStrip?.c ??
                  (mycoSnapshot?.changePct != null
                    ? `${mycoSnapshot.changePct >= 0 ? "+" : ""}${mycoSnapshot.changePct.toFixed(2)}%`
                    : "—")}
              </span>
              <span className="text-[8px] text-dim font-bold uppercase">Chain: Solana</span>
              <span className="text-[8px] text-dim font-bold uppercase">
                Biobank: {mycoDist.biobank != null ? `${mycoDist.biobank}%` : "—"}
              </span>
            </div>
          </div>
          {onOpenMyco ? (
            <button
              type="button"
              className="mt-3 min-h-[44px] text-[9px] font-bold text-dim uppercase hover:text-myco-accent touch-manipulation"
              onClick={onOpenMyco}
            >
              Token details →
            </button>
          ) : null}
        </MarketCard>

        <MarketCard title="Realm treasury" source="Realms">
          <a
            href="https://v2.realms.today/dao/At93fiCMzEkZWBAHxSNjfk7zUHnF3JcxyCyPjZELjK9Y/treasury"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full min-h-[44px] mb-3 bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white hover:bg-myco-accent hover:text-black"
          >
            View realm treasury <ExternalLink className="size-3" />
          </a>
          <dl className="space-y-1.5">
            {[
              { l: "MYCO mint", v: "EzYEwn...vUF3" },
              { l: "Network", v: "Solana Mainnet" },
              { l: "Realm ID", v: "At93fi...K9Y" },
            ].map((f) => (
              <div key={f.l} className="flex justify-between items-center text-[9px] font-bold uppercase border-b border-white/5 py-0.5">
                <dt className="text-dim pr-2">{f.l}</dt>
                <dd className="text-white font-mono shrink-0">{f.v}</dd>
              </div>
            ))}
          </dl>
        </MarketCard>

        <MarketCard title="Economic calendar" source="/api/calendar">
          {calendar.length ? (
            <ul className="flex flex-col gap-2">
              {calendar.slice(0, 12).map((c, i) => (
                <li key={`${c.label}-${i}`} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 shrink-0">
                    <div className={cn("size-1 rounded-full", c.importance === "high" ? "bg-myco-accent" : "bg-dim")} />
                    <span className="text-[9px] font-bold text-dim">{c.date}</span>
                  </div>
                  <span className="text-[10px] font-bold text-white truncate">{c.label}</span>
                  <span className="text-[8px] font-mono text-dim shrink-0">{c.time}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[9px] font-bold text-dim uppercase">No calendar — set FINNHUB_API_KEY</p>
          )}
        </MarketCard>
      </div>
    </div>
  );
}
