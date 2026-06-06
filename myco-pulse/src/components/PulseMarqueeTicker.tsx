import React from "react";
import { cn } from "../lib/utils";
import type { TickerStripItem } from "../lib/tickerDisplay";
import type { PulseNewsItem } from "../lib/pulseApi";
import type { StudioTickerSegment } from "../data/studioPresets";

interface PulseMarqueeTickerProps {
  items?: TickerStripItem[];
  segments?: StudioTickerSegment[];
  label?: string;
  className?: string;
}

function renderQuoteStrip(items: TickerStripItem[], dupKey: string) {
  return (
    <div key={dupKey} className="pulse-ticker-crawl shrink-0">
      {items.map((t, i) => (
        <React.Fragment key={`${dupKey}-${t.s}-${i}`}>
          {i > 0 && <span className="ticker-sep">|</span>}
          <span className="inline-flex items-baseline gap-1.5 px-2 font-mono text-[9px] sm:text-[10px]">
            <span className="text-white/75 font-bold">{t.s}</span>
            <span className="text-white/50 font-mono">{t.p}</span>
            <span className={cn("font-black", t.up ? "text-[#00ff88]" : "text-red-400")}>{t.c}</span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

function renderSegmentStrip(segments: StudioTickerSegment[], dupKey: string) {
  return (
    <div key={dupKey} className="pulse-ticker-crawl shrink-0">
      {segments.map((seg, i) => (
        <React.Fragment key={`${dupKey}-${seg.kind}-${i}`}>
          {i > 0 && <span className="ticker-sep">|</span>}
          {seg.kind === "quote" ? (
            <span className="inline-flex items-baseline gap-1.5 px-1 font-mono text-[9px] sm:text-[10px]">
              <span className="text-white/80 font-bold">{seg.sym}</span>
              {seg.price ? (
                <span className="text-white/55 font-mono">{seg.price}</span>
              ) : null}
              <span className={cn("font-black", seg.up ? "text-[#00ff88]" : "text-red-400")}>
                {seg.change}
              </span>
            </span>
          ) : (
            <span className="px-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-white/50">
              {seg.text}
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

const FALLBACK_SEGMENTS: StudioTickerSegment[] = [
  { kind: "quote", sym: "BTC", price: "—", change: "—", up: true, text: "—" },
  { kind: "quote", sym: "ETH", price: "—", change: "—", up: true, text: "—" },
  { kind: "quote", sym: "SOL", price: "—", change: "—", up: true, text: "—" },
  { kind: "quote", sym: "SPX", price: "—", change: "—", up: true, text: "—" },
  { kind: "quote", sym: "MYCO", price: "—", change: "—", up: true, text: "—" },
];

export function PulseMarqueeTicker({ items, segments, label = "TAPE", className }: PulseMarqueeTickerProps) {
  const hasQuotes = Boolean(items?.length);
  const hasSegments = Boolean(segments?.length);
  const activeSegments = hasSegments ? segments! : hasQuotes ? null : FALLBACK_SEGMENTS;

  return (
    <div className={cn("h-6 bg-black border-t border-white/10 flex items-center overflow-hidden shrink-0 z-50", className)}>
      <span className="shrink-0 px-3 text-[9px] font-black text-myco-accent uppercase tracking-widest border-r border-white/10 h-full flex items-center bg-black">
        {label}
      </span>
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="ticker-track">
          {activeSegments ? (
            <>
              {renderSegmentStrip(activeSegments, "a")}
              {renderSegmentStrip(activeSegments, "b")}
            </>
          ) : (
            <>
              {renderQuoteStrip(items!, "a")}
              {renderQuoteStrip(items!, "b")}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function newsToTickerSegments(
  news: PulseNewsItem[],
  quotes: TickerStripItem[]
): StudioTickerSegment[] {
  const out: StudioTickerSegment[] = [];
  const lines = news.slice(0, 10);
  lines.forEach((item, i) => {
    const q = quotes[i % Math.max(quotes.length, 1)];
    if (q) {
      out.push({ kind: "quote", sym: q.s, price: q.p, change: q.c, up: q.up, text: q.c });
    }
    const label = (item.category || "CRYPTO").toUpperCase();
    const snippet =
      item.title.length > 48 ? `${item.title.slice(0, 48)}…` : item.title;
    out.push({ kind: "news", text: `${label}: ${snippet}` });
  });
  return out;
}
