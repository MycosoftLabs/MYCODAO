import type { MarketRow, MycoOverview } from "@mycodao/sdk";
import { CopyButton } from "./client-widgets";
import { formatDate, formatDateTime, formatInt, formatPct, formatPrice, formatUsd, pctClass, releaseChip } from "./labels";
import { ActionLink, Definition, EmptyState, StatusChip } from "./primitives";

const JUPITER_SWAP_URL = "https://jup.ag/swap/SOL-EzYEwn4R5tNkNGw4K2a5a58MJFQESdf1r4UJrV7cpUF3";
const REALMS_BASE = "https://v2.realms.today/dao/";

interface MycoOverviewViewProps {
  overview: MycoOverview;
  /** MYCO row from /markets, used only for its pool link when present. */
  marketRow?: MarketRow | null;
}

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function MycoOverviewView({ overview, marketRow }: MycoOverviewViewProps) {
  const { spec, utilities, market } = overview;
  const realmUrl = spec.governance_realm ? `${REALMS_BASE}${spec.governance_realm}` : null;
  const dexScreenerUrl = marketRow?.url && /dexscreener\.com/i.test(marketRow.url) ? marketRow.url : null;
  const poolUrl = marketRow?.url && !dexScreenerUrl ? marketRow.url : null;
  const isApproved = Boolean(spec.approved_at);

  return (
    <div className="grid gap-8">
      {!isApproved ? (
        <aside role="note" className="border-l-2 border-amber-400/70 bg-amber-400/5 px-4 py-3 text-sm leading-relaxed text-amber-100/90">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-amber-300">Specification awaiting approval</p>
          Specification awaiting approval — rights and terms are not yet published. Holding MYCO gives no royalty, revenue or
          ownership rights.
        </aside>
      ) : null}

      <section aria-labelledby="spec-heading" className="border border-white/10 bg-[#0c0c0c] p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 id="spec-heading" className="text-sm font-bold uppercase tracking-widest text-white">
            {spec.name} specification
          </h2>
          {isApproved ? (
            <span className="text-[11px] uppercase tracking-widest text-white/45">
              Approved {formatDate(spec.approved_at)}
              {spec.approved_by ? ` by ${spec.approved_by}` : ""}
            </span>
          ) : null}
        </div>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Definition label="Symbol">{spec.symbol}</Definition>
          <Definition label="Network">{spec.network}</Definition>
          <Definition label="Total supply">{formatInt(spec.total_supply)}</Definition>
          <Definition label="Decimals">{spec.decimals === null ? "Not recorded" : String(spec.decimals)}</Definition>
        </dl>
        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-widest text-white/45">Mint address</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <code className="min-w-0 break-all font-mono text-sm text-white/90">{spec.mint}</code>
            <CopyButton value={spec.mint} label="Copy mint" />
          </div>
        </div>
        {spec.rights_statement ? <p className="mt-4 text-sm text-white/65">{spec.rights_statement}</p> : null}
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1">
          <ActionLink href={spec.explorer_url}>View on Solscan</ActionLink>
          {realmUrl ? <ActionLink href={realmUrl}>Governance realm</ActionLink> : null}
        </div>
      </section>

      <section aria-labelledby="quote-heading">
        <h2 id="quote-heading" className="mb-3 text-sm font-bold uppercase tracking-widest text-white">
          Market quote
        </h2>
        {market ? (
          <div className="border border-white/10 p-4">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Definition label="Price">{formatPrice(market.price_usd)}</Definition>
              <Definition label="24h change">
                <span className={pctClass(market.change_24h_pct)}>{formatPct(market.change_24h_pct)}</span>
              </Definition>
              <Definition label="Liquidity">{formatUsd(market.liquidity_usd)}</Definition>
              <Definition label="24h volume">{formatUsd(market.volume_24h_usd)}</Definition>
            </dl>
            <p className="mt-3 text-[11px] uppercase tracking-widest text-white/45">
              Source: {market.source} · {formatDateTime(market.observed_at) ?? "Time not recorded"}
            </p>
          </div>
        ) : (
          <EmptyState message="No market quote is available right now." />
        )}
        <div className="mt-3 flex flex-wrap gap-3">
          <ActionLink href={JUPITER_SWAP_URL} variant="primary">
            Get MYCO on Jupiter
          </ActionLink>
          {dexScreenerUrl ? (
            <ActionLink href={dexScreenerUrl} variant="secondary">
              DexScreener pair
            </ActionLink>
          ) : null}
          {poolUrl ? (
            <ActionLink href={poolUrl} variant="secondary">
              Pool on {hostLabel(poolUrl)}
            </ActionLink>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-white/40">Links open third-party services. Swaps are irreversible; check the mint address before trading.</p>
      </section>

      <section aria-labelledby="utilities-heading">
        <h2 id="utilities-heading" className="mb-3 text-sm font-bold uppercase tracking-widest text-white">
          What MYCO does today
        </h2>
        {utilities.length === 0 ? (
          <EmptyState message="No utilities are recorded yet." />
        ) : (
          <ul className="divide-y divide-white/10 border-y border-white/10">
            {utilities.map((utility) => (
              <li key={utility.id} className="grid gap-1 py-3 md:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto] md:items-start md:gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-white">{utility.title}</span>
                  <StatusChip chip={releaseChip(utility.stage)} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-white/75">{utility.user_action}</p>
                  {utility.note ? <p className="mt-0.5 text-sm text-white/50">{utility.note}</p> : null}
                </div>
                <div>
                  {utility.interface_url ? (
                    <ActionLink href={utility.interface_url}>{utility.interface_label ?? "Open"}</ActionLink>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
