import type { ContentItem } from "@mycodao/sdk";
import { feedLabel, formatDate, isExternal, resultStatusChip } from "./labels";
import { StatusChip } from "./primitives";

interface FeedRowProps {
  item: ContentItem;
}

export function FeedRow({ item }: FeedRowProps) {
  const date = formatDate(item.published_at);
  const detail = item.why_it_matters ?? (item.summary && item.summary !== item.title ? item.summary : null);
  const actionLabel = item.action_label ?? "Open";
  return (
    <li className="border-b border-white/10 py-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] uppercase tracking-widest text-white/45">
        <StatusChip chip={resultStatusChip(item.result_status)} />
        <span>{feedLabel(item.feed)}</span>
        {item.source_name ? <span className="normal-case tracking-normal text-white/55">· {item.source_name}</span> : null}
        <span>· {date ?? "No date recorded"}</span>
      </div>
      <p className="mt-1 text-sm font-semibold leading-snug text-white sm:text-base">{item.title}</p>
      {detail ? <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-white/60">{detail}</p> : null}
      {item.action_url ? (
        <a
          href={item.action_url}
          target={isExternal(item.action_url) ? "_blank" : undefined}
          rel={isExternal(item.action_url) ? "noopener noreferrer" : undefined}
          className="mt-1 inline-flex min-h-[44px] items-center text-xs font-bold uppercase tracking-widest text-[#00ff88] hover:underline"
        >
          {actionLabel}
          {isExternal(item.action_url) ? <span aria-hidden="true">&nbsp;↗</span> : null}
        </a>
      ) : null}
    </li>
  );
}
