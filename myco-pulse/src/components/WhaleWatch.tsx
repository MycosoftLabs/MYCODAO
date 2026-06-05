import React, { useState, useEffect } from 'react';
import {
  Shield,
  Eye,
  Clock,
  Search,
  Target,
  Globe,
  BarChart3,
  Activity,
  BrainCircuit,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getWhaleActivity } from '../services/jupiterSwap';
import { fetchPolymarketWhales, generateNeuralReport } from '../services/apiService';
import { STUDIO_POLYMARKET, type StudioPolyRow, type StudioWhaleRow } from '../data/studioPresets';

export const WhaleWatch = () => {
  const [activeTab, setActiveTab] = useState<'BLOCKCHAIN' | 'POLYMARKET' | 'INTELLIGENCE'>('BLOCKCHAIN');
  const [activities, setActivities] = useState<StudioWhaleRow[]>([]);
  const [polyData, setPolyData] = useState<StudioPolyRow[]>([]);
  const [intelReport, setIntelReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [intelLoading, setIntelLoading] = useState(false);

  useEffect(() => {
    const fetchFull = async () => {
      const [whaleData, polymarketData] = await Promise.all([getWhaleActivity(), fetchPolymarketWhales()]);
      setActivities(Array.isArray(whaleData) ? whaleData : []);
      const polyRows = Array.isArray(polymarketData) && polymarketData.length
        ? polymarketData.map((row: unknown, i: number) => {
            const r = row as Record<string, unknown>;
            return {
              id: String(r.id ?? i),
              title: String(r.title ?? r.question ?? 'Market'),
              outcome: String(r.outcome ?? r.side ?? '—'),
              volume: String(r.volume ?? '—'),
              probability: String(r.probability ?? '—'),
            };
          })
        : STUDIO_POLYMARKET;
      setPolyData(polyRows);
      setLoading(false);
    };
    fetchFull();
    const interval = setInterval(fetchFull, 15_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab !== 'INTELLIGENCE' || intelReport) return;
    setIntelLoading(true);
    generateNeuralReport('pulse-whale-watch')
      .then((text) => setIntelReport(text))
      .finally(() => setIntelLoading(false));
  }, [activeTab, intelReport]);

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
                Active Scanning: MULTI_INDEX
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
          {(['BLOCKCHAIN', 'POLYMARKET', 'INTELLIGENCE'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'flex-1 text-[8px] font-black uppercase tracking-tighter flex items-center justify-center gap-1.5 border transition-all',
                activeTab === tab
                  ? 'bg-white/10 border-white/30 text-white'
                  : 'bg-black border-white/5 text-dim hover:bg-white/5'
              )}
            >
              {tab === 'BLOCKCHAIN' && <Activity className="size-3" />}
              {tab === 'POLYMARKET' && <Globe className="size-3" />}
              {tab === 'INTELLIGENCE' && <BrainCircuit className="size-3" />}
              {tab === 'BLOCKCHAIN' ? 'Ledger' : tab === 'POLYMARKET' ? 'Predictions' : 'Intel'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
        {loading && (
          <div className="flex items-center justify-center h-full gap-2 text-dim text-[10px] uppercase">
            <RefreshCw className="size-4 animate-spin" /> Syncing…
          </div>
        )}

        {!loading && activeTab === 'BLOCKCHAIN' && (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[7px] font-black text-dim uppercase tracking-widest border-b border-white/5">
              <span className="col-span-2">Type</span>
              <span className="col-span-3">Wallet</span>
              <span className="col-span-2">Amount</span>
              <span className="col-span-2">USD</span>
              <span className="col-span-2">Token</span>
              <span className="col-span-1 text-right">Age</span>
            </div>
            {activities.map((w) => (
              <div
                key={w.sig}
                className="grid grid-cols-12 gap-2 p-3 border border-white/5 hover:bg-white/[0.03] transition-colors items-center"
              >
                <span
                  className={cn(
                    'col-span-2 text-[9px] font-black flex items-center gap-1',
                    w.type === 'BUY' ? 'text-myco-accent' : w.type === 'SELL' ? 'text-red-400' : 'text-blue-300'
                  )}
                >
                  {w.type === 'BUY' ? <ArrowUpRight className="size-3" /> : w.type === 'SELL' ? <ArrowDownRight className="size-3" /> : <Activity className="size-3" />}
                  {w.type}
                </span>
                <span className="col-span-3 text-[9px] text-white/80 font-mono truncate">{w.wallet}</span>
                <span className="col-span-2 text-[9px] font-bold text-white">{w.amount}</span>
                <span className="col-span-2 text-[9px] text-dim">{w.usd}</span>
                <span className="col-span-2 text-[9px] font-black text-myco-accent">{w.token}</span>
                <span className="col-span-1 text-[8px] text-dim text-right">{w.timeAgo}</span>
              </div>
            ))}
          </div>
        )}

        {!loading && activeTab === 'POLYMARKET' && (
          <div className="space-y-3">
            {polyData.map((row) => (
              <div
                key={row.id}
                className="p-4 border border-white/5 bg-white/[0.02] hover:border-blue-500/30 transition-all"
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <p className="text-[10px] font-bold text-white leading-snug flex-1">{row.title}</p>
                  <BarChart3 className="size-4 text-blue-400 shrink-0" />
                </div>
                <div className="flex flex-wrap gap-3 text-[8px] font-bold uppercase tracking-widest">
                  <span className="text-blue-300">{row.outcome}</span>
                  <span className="text-dim">Vol {row.volume}</span>
                  <span className="text-myco-accent">P {row.probability}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && activeTab === 'INTELLIGENCE' && (
          <div className="h-full flex flex-col gap-4">
            <div className="flex items-center gap-3 border border-myco-accent/30 bg-myco-accent/5 p-4">
              <Shield className="size-8 text-myco-accent shrink-0" />
              <div>
                <p className="text-[10px] font-black text-myco-accent uppercase tracking-widest">
                  Pulse Neural Brief
                </p>
                <p className="text-[8px] text-dim uppercase mt-1">Studio preset — Codex wires MAS / Gemini</p>
              </div>
            </div>
            {intelLoading ? (
              <div className="flex items-center justify-center flex-1 gap-2 text-dim text-[10px] uppercase">
                <BrainCircuit className="size-4 animate-pulse" /> Generating brief…
              </div>
            ) : (
              <pre className="flex-1 text-[10px] text-white/85 leading-relaxed whitespace-pre-wrap font-mono border border-white/5 p-4 bg-black/40 overflow-y-auto no-scrollbar">
                {intelReport}
              </pre>
            )}
            <button
              type="button"
              className="py-2 border border-white/10 text-[8px] font-bold uppercase text-dim hover:text-white hover:border-myco-accent/50 transition-all flex items-center justify-center gap-2"
              onClick={() => {
                setIntelReport(null);
                setIntelLoading(true);
                generateNeuralReport('pulse-whale-watch-refresh').then((t) => {
                  setIntelReport(t);
                  setIntelLoading(false);
                });
              }}
            >
              <RefreshCw className="size-3" /> Refresh Intel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
