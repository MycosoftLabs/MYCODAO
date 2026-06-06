import React, { useState, useEffect } from 'react';
import {
  Eye,
  Clock,
  Target,
  Globe,
  BarChart3,
  Activity,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Landmark,
  Scale,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  fetchPredictionMarkets,
  fetchWhaleMovements,
  type PulsePredictionMarket,
  type PulseWhaleMovement,
} from '../lib/pulseApi';

type WhaleTab = 'WHALE_ALERT' | 'POLYMARKET' | 'KALSHI' | 'POLITICS';

const TAB_META: { id: WhaleTab; label: string; icon: React.ReactNode }[] = [
  { id: 'WHALE_ALERT', label: 'Whale Alert', icon: <Activity className="size-3" /> },
  { id: 'POLYMARKET', label: 'Polymarket', icon: <Globe className="size-3" /> },
  { id: 'KALSHI', label: 'Kalshi', icon: <Scale className="size-3" /> },
  { id: 'POLITICS', label: 'Politics', icon: <Landmark className="size-3" /> },
];

function MarketCard({ row }: { row: PulsePredictionMarket }) {
  const platformColor = row.platform === 'kalshi' ? 'text-emerald-400' : 'text-blue-300';
  return (
    <a
      href={row.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 border border-white/5 bg-white/[0.02] hover:border-blue-500/30 transition-all group"
    >
      <div className="flex justify-between items-start gap-2 mb-2">
        <p className="text-[10px] font-bold text-white leading-snug flex-1 group-hover:text-myco-accent transition-colors">
          {row.title}
        </p>
        <ExternalLink className="size-3 text-dim shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="flex flex-wrap gap-3 text-[8px] font-bold uppercase tracking-widest">
        <span className={platformColor}>{row.platform}</span>
        {row.outcome ? <span className="text-blue-300">{row.outcome}</span> : null}
        {row.volume ? <span className="text-dim">Vol {row.volume}</span> : null}
        {row.probability ? <span className="text-myco-accent">P {row.probability}</span> : null}
      </div>
    </a>
  );
}

export const WhaleWatch = () => {
  const [activeTab, setActiveTab] = useState<WhaleTab>('WHALE_ALERT');
  const [movements, setMovements] = useState<PulseWhaleMovement[]>([]);
  const [polymarket, setPolymarket] = useState<PulsePredictionMarket[]>([]);
  const [kalshi, setKalshi] = useState<PulsePredictionMarket[]>([]);
  const [politics, setPolitics] = useState<PulsePredictionMarket[]>([]);
  const [whaleAlertConfigured, setWhaleAlertConfigured] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  const fetchFull = async () => {
    const [whaleRes, markets] = await Promise.all([fetchWhaleMovements(), fetchPredictionMarkets()]);
    setMovements(whaleRes.movements);
    setWhaleAlertConfigured(Boolean(whaleRes.whaleAlertConfigured));
    setStatusMessage(whaleRes.message);
    setPolymarket(markets.polymarket);
    setKalshi(markets.kalshi);
    setPolitics(markets.politics);
    setLoading(false);
  };

  useEffect(() => {
    fetchFull();
    const interval = setInterval(fetchFull, 15_000);
    return () => clearInterval(interval);
  }, []);

  const activeMarkets =
    activeTab === 'POLYMARKET' ? polymarket : activeTab === 'KALSHI' ? kalshi : politics;

  return (
    <div className="w-full h-full flex flex-col bg-black overflow-hidden font-mono border border-white/5">
      <div className="p-4 bg-white/[0.02] border-b border-white/5 flex flex-col gap-4 shrink-0">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="size-8 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center p-1.5 animate-pulse">
              <Target className="size-full text-red-500" />
            </div>
            <div>
              <h3 className="text-[10px] font-black text-white uppercase tracking-widest leading-none">
                Whale Watch Protocol
              </h3>
              <span className="text-[8px] font-bold text-red-400 uppercase tracking-widest">
                Whale Alert · Polymarket · Kalshi · Politics
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[8px] text-dim uppercase">
            <Eye className="size-3 text-myco-accent" />
            <Clock className="size-3" />
            15s refresh
          </div>
        </div>

        <div className="flex gap-1 h-8">
          {TAB_META.map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex-1 text-[7px] font-black uppercase tracking-tighter flex items-center justify-center gap-1 border transition-all min-w-0 px-0.5',
                activeTab === id
                  ? 'bg-white/10 border-white/30 text-white'
                  : 'bg-black border-white/5 text-dim hover:bg-white/5'
              )}
            >
              {icon}
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
        {loading && (
          <div className="flex items-center justify-center h-full gap-2 text-dim text-[10px] uppercase">
            <RefreshCw className="size-4 animate-spin" /> Syncing live feeds…
          </div>
        )}

        {!loading && activeTab === 'WHALE_ALERT' && (
          <div className="space-y-2">
            {!whaleAlertConfigured && (
              <div className="p-3 border border-amber-500/30 bg-amber-500/5 text-[9px] text-amber-200/90 leading-relaxed mb-3">
                Set <span className="font-bold">WHALE_ALERT_API_KEY</span> on the Pulse API (port 3004) for on-chain
                transfers from{' '}
                <a
                  href="https://whale-alert.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-myco-accent"
                >
                  whale-alert.io
                </a>{' '}
                /{' '}
                <a
                  href="https://x.com/whale_alert"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-myco-accent"
                >
                  @whale_alert
                </a>
                . Showing large Polymarket trades until configured.
              </div>
            )}

            {movements.length === 0 ? (
              <p className="text-[9px] text-dim uppercase text-center py-8">
                No whale movements in the last hour
                {statusMessage ? ` (${statusMessage})` : ''}
              </p>
            ) : (
              <>
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[7px] font-black text-dim uppercase tracking-widest border-b border-white/5">
                  <span className="col-span-2">Type</span>
                  <span className="col-span-2">From</span>
                  <span className="col-span-2">To</span>
                  <span className="col-span-2">Amount</span>
                  <span className="col-span-2">USD</span>
                  <span className="col-span-1">Asset</span>
                  <span className="col-span-1 text-right">Age</span>
                </div>
                {movements.map((w) => (
                  <a
                    key={w.id}
                    href={w.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="grid grid-cols-12 gap-2 p-3 border border-white/5 hover:bg-white/[0.03] transition-colors items-center"
                  >
                    <span
                      className={cn(
                        'col-span-2 text-[9px] font-black flex items-center gap-1',
                        w.type === 'BUY'
                          ? 'text-myco-accent'
                          : w.type === 'SELL'
                            ? 'text-red-400'
                            : 'text-blue-300'
                      )}
                    >
                      {w.type === 'BUY' ? (
                        <ArrowUpRight className="size-3" />
                      ) : w.type === 'SELL' ? (
                        <ArrowDownRight className="size-3" />
                      ) : (
                        <Activity className="size-3" />
                      )}
                      {w.type}
                    </span>
                    <span className="col-span-2 text-[9px] text-white/80 font-mono truncate">{w.from}</span>
                    <span className="col-span-2 text-[9px] text-dim font-mono truncate">{w.to}</span>
                    <span className="col-span-2 text-[9px] font-bold text-white truncate">{w.amount}</span>
                    <span className="col-span-2 text-[9px] text-dim">{w.usd}</span>
                    <span className="col-span-1 text-[9px] font-black text-myco-accent">{w.symbol}</span>
                    <span className="col-span-1 text-[8px] text-dim text-right">{w.timeAgo}</span>
                  </a>
                ))}
              </>
            )}
          </div>
        )}

        {!loading && activeTab !== 'WHALE_ALERT' && (
          <div className="space-y-3">
            {activeTab === 'POLITICS' && (
              <p className="text-[8px] text-dim uppercase tracking-widest border-b border-white/5 pb-2">
                Trump · Senators · Congress · Elections — Polymarket + Kalshi
              </p>
            )}
            {activeMarkets.length === 0 ? (
              <p className="text-[9px] text-dim uppercase text-center py-8">No live markets returned</p>
            ) : (
              activeMarkets.map((row) => <MarketCard key={`${row.platform}-${row.id}`} row={row} />)
            )}
            {activeTab === 'POLYMARKET' && (
              <p className="text-[8px] text-dim text-center pt-2">
                <BarChart3 className="inline size-3 mr-1 text-blue-400" />
                Live via gamma-api.polymarket.com
              </p>
            )}
            {activeTab === 'KALSHI' && (
              <p className="text-[8px] text-dim text-center pt-2">
                <Scale className="inline size-3 mr-1 text-emerald-400" />
                Live via Kalshi trade API
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
