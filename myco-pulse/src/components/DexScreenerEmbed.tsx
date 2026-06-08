import { dexScreenerEmbedUrl, dexScreenerPairUrl, MYCO_DEX_PAIR } from "../lib/mycoTokenConfig";
import { ExternalLink } from "lucide-react";

interface DexScreenerEmbedProps {
  pairAddress?: string;
  className?: string;
  height?: number;
}

export function DexScreenerEmbed({
  pairAddress = MYCO_DEX_PAIR,
  className = "",
  height = 640,
}: DexScreenerEmbedProps) {
  const embedSrc = dexScreenerEmbedUrl(pairAddress);
  const pageUrl = dexScreenerPairUrl(pairAddress);

  return (
    <div className={`flex flex-col gap-2 min-h-0 ${className}`}>
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-dim">
          DexScreener · chart · trades · chat
        </span>
        <a
          href={pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-myco-accent hover:underline min-h-[44px] px-2"
        >
          Open full page
          <ExternalLink className="size-3" />
        </a>
      </div>
      <div
        className="relative w-full rounded-sm border border-white/10 overflow-hidden bg-black/60"
        style={{ minHeight: height }}
      >
        <iframe
          title="MYCO DexScreener"
          src={embedSrc}
          className="absolute inset-0 w-full h-full border-0"
          allow="clipboard-write"
          loading="lazy"
        />
      </div>
    </div>
  );
}
