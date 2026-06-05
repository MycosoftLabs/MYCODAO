import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SPECIMENS } from './data/fungIp';
import { 
  BarChart3, 
  BookOpen, 
  Globe, 
  LayoutDashboard, 
  Mic2, 
  Settings, 
  TrendingUp, 
  Zap,
  Maximize2,
  Minimize2,
  Sparkles,
  RefreshCw,
  Moon,
  Sun,
  Coins,
  ShieldCheck,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Box,
  Cpu,
  Database,
  Lock,
  Play,
  Volume2,
  Info,
  Dna,
  FlaskConical,
  Microscope,
  Stethoscope,
  Terminal,
  LineChart,
  PieChart,
  Wifi,
  Radio,
  Share2,
  Users,
  ExternalLink,
  Wallet,
  History,
  Plus,
  Minus,
  Search,
  Video,
  Compass,
  ExternalLink as LinkIcon,
  Bell,
  Bot,
  Rss,
  BrainCircuit,
  Shield
} from 'lucide-react';
import { cn } from './lib/utils';
import { 
  AreaChart, 
  Area, 
  Tooltip, 
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import * as RGL from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { CNBCNewsWidget } from './components/CNBCNewsWidget';
import { MatrixSwap } from './components/MatrixSwap';
import { WhaleWatch } from './components/WhaleWatch';
import { logToSupabase } from './lib/supabase';
import { useRealTimeData } from './hooks/useRealTimeData';
import { fetchLiquidityPools } from './services/apiService';
import { WalletDisplay } from './components/WalletDisplay';
import { TradeHistory } from './components/TradeHistory';
import {
  EMPTY_CHART_DATA,
  EMPTY_TICKER_GROUPS,
  tickerToAssetRow,
  buildTickerGroups,
} from './lib/tickerDisplay';
import { fetchPulseConfigStatus } from './lib/pulseApi';
import { STUDIO_ORACLE_INSIGHT, mergeTickerGroupsWithStudio } from './data/studioPresets';

// Handle RGL ESM/CJS interop
const Grid = (RGL as any).default || RGL;
const ResponsiveGridLayout = Grid.WidthProvider(Grid.Responsive);

const initialLayouts = {
  lg: [
    { i: 'overview', x: 0, y: 0, w: 4, h: 2 },
    { i: 'crypto', x: 4, y: 0, w: 3, h: 2 },
    { i: 'metals', x: 7, y: 0, w: 2, h: 2 },
    { i: 'big_movers', x: 9, y: 0, w: 3, h: 2 },
    
    { i: 'commodities', x: 0, y: 2, w: 3, h: 2 },
    { i: 'bio_assets', x: 3, y: 2, w: 3, h: 2 },
    { i: 'tech', x: 6, y: 2, w: 3, h: 2 },
    { i: 'business', x: 9, y: 2, w: 3, h: 2 },
    
    { i: 'news_mini', x: 0, y: 4, w: 4, h: 2 },
    { i: 'podcast_mini', x: 4, y: 4, w: 4, h: 2 },
    { i: 'learn_mini', x: 8, y: 4, w: 4, h: 2 },
    
    { i: 'watchlist', x: 0, y: 6, w: 3, h: 2 },
    { i: 'indicators', x: 3, y: 6, w: 3, h: 2 },
    { i: 'eco', x: 6, y: 6, w: 3, h: 2 },
    { i: 'funding', x: 9, y: 6, w: 3, h: 2 },
    
    { i: 'research', x: 0, y: 8, w: 3, h: 2 },
    { i: 'calendar', x: 3, y: 8, w: 3, h: 2 },
    { i: 'quick_links', x: 6, y: 8, w: 3, h: 2 },
    { i: 'status', x: 9, y: 8, w: 3, h: 2 },

    { i: 'whale_watch_mini', x: 0, y: 10, w: 6, h: 2 },
    { i: 'mindex_mini', x: 6, y: 10, w: 6, h: 2 },
  ]
};

// --- TERMINAL COMPONENTS ---

const Ticker = ({ groups = EMPTY_TICKER_GROUPS }: { groups?: typeof EMPTY_TICKER_GROUPS }) => (
  <div className="h-8 bg-black border-b border-myco-accent/20 flex items-center overflow-hidden shrink-0 z-50">
    <div className="ticker-track">
      {[...(groups.crypto || []), ...(groups.tech || [])].map((t, i) => (
        <div key={i} className="inline-flex items-center gap-2 px-6 border-r border-myco-accent/10 h-full group cursor-pointer hover:bg-myco-accent/5">
          <span className="text-[10px] font-bold text-dim group-hover:text-white transition-colors uppercase">{t.s}</span>
          <span className="text-[11px] font-mono font-medium">{t.p}</span>
          <span className={cn("text-[10px] font-bold", t.up ? "text-myco-accent" : "text-red-500")}>
            {t.c}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const WidgetWrapper = ({ children, title, onToggleFull, isFull, id }: any) => (
  <div className={cn(
    "w-full h-full glass-bento flex flex-col overflow-hidden group relative rounded-none transition-all duration-300",
    isFull ? "border-myco-accent shadow-[0_0_20px_rgba(0,255,136,0.15)] z-10" : ""
  )}>
    <div className="flex items-center justify-between p-3 border-b border-myco-border bg-black/20 drag-handle cursor-grab active:cursor-grabbing">
      <div className="flex items-center gap-2">
        <Activity className="w-3 h-3 text-myco-accent" />
        <h3 className="text-[10px] font-bold text-dim uppercase tracking-widest">{title}</h3>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={() => onToggleFull(id)}
          className="p-1 hover:text-myco-accent text-dim transition-colors"
        >
          {isFull ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
        </button>
      </div>
    </div>
    <div className="flex-1 p-3 overflow-hidden relative">
      {children}
    </div>
  </div>
);

const NavItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-2 border-l-2 transition-all group",
      active 
        ? "border-myco-accent bg-myco-accent/5 text-myco-accent font-bold" 
        : "border-transparent text-dim hover:text-white hover:bg-white/5"
    )}
  >
    <Icon className="w-4 h-4" />
    <span className="text-xs uppercase tracking-widest leading-none">{label}</span>
  </button>
);

// --- SUB-VIEWS ---

const PulseDashboard = ({ 
  aiInsight, 
  layouts, 
  setLayouts,
  onLayoutChange, 
  setActiveTab,
  tickerGroups = EMPTY_TICKER_GROUPS,
  chartData = EMPTY_CHART_DATA,
  whales = [],
  loading = false
}: any) => {
  const [fullWidget, setFullWidget] = useState<string | null>(null);
  const [savedLayouts, setSavedLayouts] = useState<any>(null);
  const [globalMarket, setGlobalMarket] = useState<any>({ SOL: '...', BTC: '...', ETH: '...', status: 'SYNCING' });

  useEffect(() => {
    import('./services/apiService').then(({ fetchGlobalMarketData }) => {
      fetchGlobalMarketData().then(data => setGlobalMarket(data));
    });
  }, []);

  const toggleFull = (id: string) => {
    if (fullWidget === id) {
      if (savedLayouts) {
        setLayouts(savedLayouts);
      }
      setFullWidget(null);
    } else {
      if (!fullWidget) {
        setSavedLayouts(layouts);
      }
      const newLayouts = { ...layouts };
      Object.keys(newLayouts).forEach(bp => {
        newLayouts[bp] = newLayouts[bp].map((item: any) => {
          if (item.i === id) {
             const growW = bp === 'lg' ? 12 : bp === 'md' ? 6 : 4;
             return { ...item, x: 0, y: 0, w: growW, h: 10 }; 
          }
          return { ...item, w: bp === 'lg' ? 3 : 2, h: 2 };
        });
      });
      setLayouts(newLayouts);
      setFullWidget(id);
    }
  };

  const MarketOverviewDetailed = () => (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'BITCOIN', val: globalMarket.BTC, change: '+1.2%', color: 'text-orange-500' },
          { label: 'ETHEREUM', val: globalMarket.ETH, change: '-0.4%', color: 'text-blue-400' },
          { label: 'SOLANA', val: globalMarket.SOL, change: '+4.5%', color: 'text-myco-accent' }
        ].map((m, i) => (
          <div key={i} className="p-4 glass-bento border-white/5 bg-white/[0.02]">
            <span className="text-[10px] font-black text-dim uppercase tracking-widest block mb-2">{m.label}</span>
            <div className="flex justify-between items-end">
              <span className="text-2xl font-black text-white font-mono">{m.val}</span>
              <span className={cn("text-xs font-bold", m.change.startsWith('+') ? "text-myco-accent" : "text-red-400")}>{m.change}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
        <div className="glass-bento p-6 border-white/5 bg-black/40 flex flex-col">
           <div className="flex justify-between items-center mb-4">
              <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                <BarChart3 className="size-3 text-myco-accent" />
                Aggregated Volatility Index
              </h4>
              <div className="flex gap-2">
                 <div className="px-2 py-0.5 bg-myco-accent/20 text-myco-accent text-[8px] font-bold uppercase rounded-sm border border-myco-accent/30">Live Trace</div>
              </div>
           </div>
           <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorWave" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00ff88" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" hide />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#050505', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px' }}
                    itemStyle={{ color: '#00ff88' }}
                  />
                  <Area type="monotone" dataKey="price" stroke="#00ff88" fillOpacity={1} fill="url(#colorWave)" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div className="glass-bento p-6 border-white/5 bg-black/40 flex flex-col justify-center items-center text-center gap-4">
              <Compass className="size-8 text-myco-accent animate-pulse" />
              <div>
                <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Market Sentiment</p>
                <div className="text-2xl font-black text-myco-accent">GREED (74)</div>
              </div>
           </div>
           <div className="glass-bento p-6 border-white/5 bg-black/40 flex flex-col justify-center items-center text-center gap-4">
              <Zap className="size-8 text-yellow-400" />
              <div>
                <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1">MINDEX Velocity</p>
                <div className="text-2xl font-black text-white">4.2 TB/s</div>
              </div>
           </div>
           <div className="col-span-2 glass-bento p-6 border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div className="flex gap-4">
                 <div className="size-10 bg-myco-accent flex items-center justify-center p-2 rounded-sm shrink-0">
                    <FlaskConical className="size-6 text-black" />
                 </div>
                 <div>
                    <h5 className="text-[10px] font-black text-white uppercase tracking-widest">Protocol Intelligence</h5>
                    <p className="text-[9px] text-dim font-bold uppercase leading-tight mt-1">Cross-chain liquidity bridge optimized via Myco Oracle X-402.</p>
                 </div>
              </div>
              <button className="px-4 py-2 border border-myco-accent text-myco-accent text-[9px] font-black uppercase hover:bg-myco-accent hover:text-black">Run Diagnostics</button>
           </div>
        </div>
      </div>
    </div>
  );

  const TickerList = ({ items }: any) => (
    <div className="flex flex-col gap-0.5 overflow-hidden">
      {items?.map((item: any, i: number) => (
        <div 
          key={i} 
          className="flex items-center justify-between py-1 px-1 group cursor-pointer hover:bg-myco-accent/10 transition-colors"
          onClick={() => setActiveTab('Markets')}
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-dim group-hover:text-white transition-colors w-12">{item.s}</span>
            <span className="text-[11px] font-mono font-medium">{item.p}</span>
          </div>
          <div className="flex items-center gap-2">
             <span className={cn("text-[9px] font-bold", item.up ? "text-myco-accent" : "text-red-500")}>
               {item.c}
             </span>
             {/* Small Sparkline simulation */}
             <div className="w-10 h-3 flex items-end gap-[1px] opacity-40">
                {[1,2,3,4].map(j => (
                   <div 
                     key={j} 
                     className={cn("w-full bg-current", item.up ? "text-myco-accent" : "text-red-500")}
                     style={{ height: `${20 + Math.random() * 80}%` }}
                   />
                ))}
             </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex-1 relative overflow-hidden flex flex-col bg-black">
      {loading && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-myco-accent overflow-hidden z-[100]">
          <div className="h-full bg-white/40 animate-[loading_1s_infinite]" style={{ width: '40%' }} />
        </div>
      )}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 6, sm: 3, xs: 1, xxs: 1 }}
          rowHeight={80}
          draggableHandle=".drag-handle"
          margin={[0, 0]}
          containerPadding={[0, 0]}
          onLayoutChange={onLayoutChange}
        >
          {/* Market Overview */}
          <div key="overview">
             <WidgetWrapper title="Market Overview" id="overview" onToggleFull={toggleFull} isFull={fullWidget === 'overview'}>
                {fullWidget === 'overview' ? (
                  <MarketOverviewDetailed />
                ) : (
                  <div className="h-full flex flex-col justify-between py-1">
                    <div className="space-y-1">
                        <span className="text-[8px] font-bold text-dim uppercase tracking-[0.2em] block">Status: OPEN // {globalMarket.status}</span>
                        <p className="text-xs font-bold leading-tight uppercase text-white/90">BTC at {globalMarket.BTC}, SOL at ${globalMarket.SOL}. Market sync stable.</p>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                        <button className="flex-1 py-1 px-2 glass-bento border-white/10 text-[9px] font-bold uppercase hover:bg-myco-accent hover:text-black">Indices</button>
                        <button className="flex-1 py-1 px-2 glass-bento border-white/10 text-[9px] font-bold uppercase hover:bg-myco-accent hover:text-black">Sentiment</button>
                    </div>
                  </div>
                )}
             </WidgetWrapper>
          </div>

          {/* Asset Groups */}
          <div key="crypto">
             <WidgetWrapper title="— CRYPTO —" id="crypto" onToggleFull={toggleFull} isFull={fullWidget === 'crypto'}>
                <TickerList items={tickerGroups.crypto} />
             </WidgetWrapper>
          </div>
          <div key="metals">
             <WidgetWrapper title="— METALS —" id="metals" onToggleFull={toggleFull} isFull={fullWidget === 'metals'}>
                <TickerList items={tickerGroups.indicators} />
             </WidgetWrapper>
          </div>
          <div key="big_movers">
             <WidgetWrapper title="— BIG MOVERS —" id="big_movers" onToggleFull={toggleFull} isFull={fullWidget === 'big_movers'}>
                <div className="flex flex-col gap-0.5">
                   {[
                      { s: 'ATOM', p: '1.81', c: '+2.60%', up: true, d: 'DEX expansion...' },
                      { s: 'MYCO', p: '0.0423', c: '+1.91%', up: true, d: 'Biobank milestone...' },
                      { s: 'VIX', p: '14.25', c: '+1.90%', up: true, d: 'Volatility spike...' },
                   ].map((m, i) => (
                      <div key={i} className="flex flex-col border-b border-white/5 py-1">
                         <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-white">{m.s}</span>
                            <span className="text-myco-accent text-[10px] font-bold">{m.c}</span>
                         </div>
                         <p className="text-[8px] text-dim truncate uppercase font-bold">{m.d}</p>
                      </div>
                   ))}
                </div>
             </WidgetWrapper>
          </div>

          <div key="commodities">
             <WidgetWrapper title="— COMMODITIES —" id="commodities" onToggleFull={toggleFull} isFull={fullWidget === 'commodities'}>
                <TickerList items={tickerGroups.commodities} />
             </WidgetWrapper>
          </div>
          <div key="bio_assets">
             <WidgetWrapper title="— BIO ASSETS —" id="bio_assets" onToggleFull={toggleFull} isFull={fullWidget === 'bio_assets'}>
                <TickerList items={tickerGroups.bio} />
             </WidgetWrapper>
          </div>
          <div key="tech">
             <WidgetWrapper title="— TECH —" id="tech" onToggleFull={toggleFull} isFull={fullWidget === 'tech'}>
                <TickerList items={tickerGroups.tech} />
             </WidgetWrapper>
          </div>
          <div key="business">
             <WidgetWrapper title="— BUSINESS —" id="business" onToggleFull={toggleFull} isFull={fullWidget === 'business'}>
                <TickerList items={tickerGroups.business} />
             </WidgetWrapper>
          </div>

          <div key="news_mini">
             <WidgetWrapper title="— NEWS —" id="news_mini" onToggleFull={toggleFull} isFull={fullWidget === 'news_mini'}>
                <div className="flex flex-col gap-3 h-full overflow-hidden">
                   {[
                      { t: '1h', m: 'Solana ecosystem sees sustained developer activity', tags: ['NETWORK', 'GOVERNANCE'] },
                      { t: '2h', m: 'Decentralized biobanks gain traction for research data', tags: ['BIOBANK', 'MYCO'] },
                      { t: '3h', m: 'TradFi indices hold steady amid macro uncertainty', tags: ['MACRO', 'SPY'] },
                   ].map((n, i) => (
                      <div key={i} className="flex gap-2">
                         <span className="text-[9px] font-mono text-dim shrink-0">{n.t}</span>
                         <div className="flex flex-col">
                            <p className="text-[10px] font-bold text-white/90 leading-tight line-clamp-2">{n.m}</p>
                            <div className="flex gap-1 mt-1">
                               {n.tags.map(tag => <span key={tag} className="text-[7px] border border-white/10 px-1 text-dim uppercase">{tag}</span>)}
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             </WidgetWrapper>
          </div>

          <div key="podcast_mini">
             <WidgetWrapper title="— PODCASTS —" id="podcast_mini" onToggleFull={toggleFull} isFull={fullWidget === 'podcast_mini'}>
                <div className="flex flex-col gap-3">
                   {[
                      { l: 'Governance and Funding in DAOs', v: '30:42', i: Play },
                      { l: 'Biobank Data and Tissue Licensing', v: '35:00', i: Volume2 },
                      { l: 'Financial Literacy: Reading a Ticker', v: '15:00', i: Play },
                   ].map((p, i) => (
                      <div key={i} className="flex items-center gap-3 group cursor-pointer hover:bg-myco-accent/5 p-1">
                         <p.i className="size-3 text-myco-accent" />
                         <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-white group-hover:text-myco-accent transition-colors">{p.l}</span>
                            <span className="text-[8px] text-dim uppercase">MycoDAO Podcast • {p.v}</span>
                         </div>
                      </div>
                   ))}
                </div>
             </WidgetWrapper>
          </div>

          <div key="learn_mini">
             <WidgetWrapper title="— LEARN —" id="learn_mini" onToggleFull={toggleFull} isFull={fullWidget === 'learn_mini'}>
                <div className="flex flex-col gap-1.5 h-full overflow-hidden">
                   {[
                      { n: 'What is a Ticker?', d: '3m', l: 'Beginner' },
                      { n: 'Governance Tokens Explained', d: '5m', l: 'Intermediate' },
                      { n: 'Biobank Incentives and Data', d: '7m', l: 'Advanced' },
                      { n: 'Reading Sparklines', d: '2m', l: 'Beginner' },
                   ].map((l, i) => (
                      <div key={i} className="flex justify-between items-center group cursor-pointer hover:bg-white/5 py-1">
                         <div className="flex items-center gap-2">
                           <span className={cn("text-[7px] border px-1 uppercase shrink-0 w-16 text-center", l.l === 'Beginner' ? 'border-myco-accent text-myco-accent' : 'border-dim text-dim')}>{l.l}</span>
                           <span className="text-[9px] font-bold text-white/90 truncate">{l.n}</span>
                         </div>
                         <span className="text-[8px] font-mono text-dim shrink-0">{l.d}</span>
                      </div>
                   ))}
                   <button className="mt-auto text-[8px] font-bold text-dim uppercase text-left hover:text-myco-accent">All lessons →</button>
                </div>
             </WidgetWrapper>
          </div>

          <div key="watchlist">
             <WidgetWrapper title="— WATCHLIST —" id="watchlist" onToggleFull={toggleFull} isFull={fullWidget === 'watchlist'}>
                <TickerList items={tickerGroups.crypto.slice(0, 5)} />
                <button className="mt-2 text-[8px] font-bold text-dim uppercase text-left hover:text-myco-accent" onClick={() => setActiveTab('Markets')}>Markets →</button>
             </WidgetWrapper>
          </div>

          <div key="indicators">
             <WidgetWrapper title="— MARKET INDICATORS —" id="indicators" onToggleFull={toggleFull} isFull={fullWidget === 'indicators'}>
                <TickerList items={tickerGroups.indicators} />
             </WidgetWrapper>
          </div>

          <div key="eco">
             <WidgetWrapper title="— MYCO ECOSYSTEM —" id="eco" onToggleFull={toggleFull} isFull={fullWidget === 'eco'}>
                <div className="h-full flex flex-col justify-between py-1">
                   <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                         <span className="text-sm font-black text-myco-accent">$0.0418</span>
                         <span className="text-[8px] text-dim font-bold uppercase">Supply: 210M</span>
                         <span className="text-[8px] text-dim font-bold uppercase">Community: 30%</span>
                      </div>
                      <div className="flex flex-col items-end">
                         <span className="text-[10px] font-bold text-myco-accent">+1.44%</span>
                         <span className="text-[8px] text-dim font-bold uppercase">Chain: Solana</span>
                         <span className="text-[8px] text-dim font-bold uppercase">Biobank: 22%</span>
                      </div>
                   </div>
                   <button className="text-[8px] font-bold text-dim uppercase text-left hover:text-myco-accent mt-2" onClick={() => setActiveTab('MYCO')}>Token details →</button>
                </div>
             </WidgetWrapper>
          </div>

          <div key="funding">
             <WidgetWrapper title="— REALM TREASURY —" id="funding" onToggleFull={toggleFull} isFull={fullWidget === 'funding'}>
                <div className="flex flex-col gap-1.5 h-full overflow-hidden">
                   <div className="flex flex-col gap-4 mb-4">
                      <div className="flex justify-between items-end border-b border-white/5 pb-2">
                         <span className="text-[10px] font-bold text-dim uppercase">Governance State</span>
                         <span className="text-xs font-mono text-myco-accent">SYNCHRONIZED</span>
                      </div>
                      <a href="https://app.realms.today/dao/At93fiCMzEkZWBAHxSNjfk7zUHnF3JcxyCyPjZELjK9Y/treasury/v2" target="_blank" rel="noreferrer" className="w-full py-3 bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white hover:bg-myco-accent hover:text-black text-center">
                         View Realm Treasury
                      </a>
                   </div>
                   <div className="space-y-1.5 overflow-y-auto no-scrollbar">
                      {[
                         { l: 'DAO Mint', v: 'EzYEwn...vUF3' },
                         { l: 'Network', v: 'Solana Mainnet' },
                         { l: 'Realm ID', v: 'At93fi...K9Y' },
                      ].map((f, i) => (
                         <div key={i} className="flex justify-between items-center text-[9px] font-bold uppercase border-b border-white/5 py-0.5">
                            <span className="text-dim pr-2">{f.l}</span>
                            <span className="text-white font-mono shrink-0">{f.v}</span>
                         </div>
                      ))}
                   </div>
                </div>
             </WidgetWrapper>
          </div>

          <div key="research">
             <WidgetWrapper title="— RESEARCH —" id="research" onToggleFull={toggleFull} isFull={fullWidget === 'research'}>
                <div className="flex flex-col gap-3 h-full overflow-hidden">
                   {[
                      { d: 'Mar 11', t: 'Q1 Community Grants: 12 projects funded', c: 'ECOSYSTEM' },
                      { d: 'Mar 10', t: 'Science funding round opens March 1', c: 'FUNDING' },
                      { d: 'Mar 9', t: 'Biobank activity: +23% samples indexed', c: 'BIOBANK' },
                   ].map((r, i) => (
                      <div key={i} className="flex flex-col gap-0.5">
                         <span className="text-[8px] font-bold text-myco-accent uppercase tracking-widest">{r.c} {r.d}</span>
                         <p className="text-[10px] font-bold text-white/90 leading-tight line-clamp-2">{r.t}</p>
                      </div>
                   ))}
                </div>
             </WidgetWrapper>
          </div>

          <div key="calendar">
             <WidgetWrapper title="— CALENDAR / EVENTS —" id="calendar" onToggleFull={toggleFull} isFull={fullWidget === 'calendar'}>
                <div className="flex flex-col gap-2 overflow-y-auto no-scrollbar h-full pr-1">
                   {[
                      { d: 'Feb 18', e: 'CPI Release', t: '8:30 ET' },
                      { d: 'Feb 20', e: 'FOMC Minutes', t: '2:00 ET' },
                      { d: 'Feb 21', e: 'NVDA Earnings', t: '4:00 ET' },
                      { d: 'Feb 24', e: 'PCE Inflation', t: '8:30 ET' },
                   ].map((c, i) => (
                      <div key={i} className="flex items-center justify-between group cursor-pointer hover:bg-white/5">
                         <div className="flex items-center gap-2 shrink-0">
                            <div className="size-1 rounded-full bg-dim group-hover:bg-myco-accent" />
                            <span className="text-[9px] font-bold text-dim group-hover:text-white transition-colors">{c.d}</span>
                         </div>
                         <span className="text-[10px] font-bold text-white truncate px-2">{c.e}</span>
                         <span className="text-[8px] font-mono text-dim shrink-0">{c.t}</span>
                      </div>
                   ))}
                </div>
             </WidgetWrapper>
          </div>

          <div key="quick_links">
             <WidgetWrapper title="— QUICK LINKS —" id="quick_links" onToggleFull={toggleFull} isFull={fullWidget === 'quick_links'}>
                <div className="flex flex-wrap gap-1">
                   {['Markets', 'News', 'Podcasts', 'Learn', 'MYCO', 'Settings'].map(l => (
                      <button 
                         key={l}
                         onClick={() => setActiveTab(l)}
                         className="px-3 py-1 bg-white/5 border border-white/10 text-[9px] font-bold uppercase text-dim hover:text-white hover:border-myco-accent"
                      >
                         {l}
                      </button>
                   ))}
                </div>
             </WidgetWrapper>
          </div>

          <div key="status">
             <WidgetWrapper title="— STATUS —" id="status" onToggleFull={toggleFull} isFull={fullWidget === 'status'}>
                <div className="flex flex-col gap-2 h-full justify-between">
                   <div className="flex items-center gap-2">
                       <div className="size-1.5 rounded-full bg-myco-accent shadow-[0_0_8px_var(--color-myco-accent)]" />
                       <span className="text-[9px] font-bold text-myco-accent uppercase tracking-widest leading-none">LIVE</span>
                   </div>
                   <p className="text-[10px] font-bold text-white leading-tight uppercase">Fed signals data-dependent path on rates</p>
                   <button className="text-[8px] font-bold text-dim uppercase text-left hover:text-myco-accent">Clear</button>
                </div>
             </WidgetWrapper>
          </div>

          <div key="whale_watch_mini">
             <WidgetWrapper title="— WHALE WATCH —" id="whale_watch_mini" onToggleFull={toggleFull} isFull={fullWidget === 'whale_watch_mini'}>
                <div className="grid grid-cols-2 gap-4 h-full overflow-hidden">
                   <div className="space-y-1">
                      <span className="text-[8px] font-bold text-blue-400 uppercase tracking-widest">Polymarket</span>
                      <div className="p-2 bg-blue-500/5 border border-blue-500/20 rounded-sm">
                         <p className="text-[9px] font-bold text-white leading-tight truncate uppercase">0xWhale bet $420k on Trump YES</p>
                      </div>
                   </div>
                   <div className="space-y-1">
                      <span className="text-[8px] font-bold text-red-400 uppercase tracking-widest">Politician</span>
                      <div className="p-2 bg-red-500/5 border border-red-500/20 rounded-sm">
                         <p className="text-[9px] font-bold text-white leading-tight truncate uppercase">Pelosi bought $1.2M NVDA</p>
                      </div>
                   </div>
                </div>
                <button className="absolute bottom-2 right-2 text-[8px] font-bold text-dim uppercase hover:text-myco-accent" onClick={() => setActiveTab('Trade')}>Whale Terminal →</button>
             </WidgetWrapper>
          </div>

          <div key="mindex_mini">
             <WidgetWrapper title="— MINDEX SYSTEM —" id="mindex_mini" onToggleFull={toggleFull} isFull={fullWidget === 'mindex_mini'}>
                <div className="flex items-center gap-4 h-full">
                   <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center">
                         <span className="text-[8px] font-bold text-dim uppercase">Sync Stability</span>
                         <span className="text-[9px] font-mono text-myco-accent">99.8%</span>
                      </div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                         <div className="h-full bg-myco-accent animate-pulse" style={{ width: '99.8%' }} />
                      </div>
                      <p className="text-[9px] text-dim font-bold uppercase mt-2">MINDEX node sync heartbeat stable.</p>
                   </div>
                   <div className="size-10 glass-bento flex items-center justify-center bg-myco-accent text-black shrink-0">
                      <Database className="size-5" />
                    </div>
                </div>
                <button className="absolute bottom-2 right-2 text-[8px] font-bold text-dim uppercase hover:text-myco-accent" onClick={() => setActiveTab('FungIP')}>FungIP Console →</button>
             </WidgetWrapper>
          </div>

        </ResponsiveGridLayout>
      </div>

      {/* FOOTER TAPE - BLOOMBERG STYLE */}
      <div className="h-6 bg-black border-t border-white/10 flex items-center overflow-hidden shrink-0 z-50">
         <div className="ticker-track">
            <div className="inline-flex items-center gap-4 px-6 h-full">
               <span className="text-[9px] font-black text-myco-accent uppercase">TAPE</span>
               {[...tickerGroups.crypto, ...tickerGroups.tech, ...tickerGroups.indicators].map((t, i) => (
                  <div key={i} className="flex items-center gap-2 border-r border-white/5 pr-4 h-full">
                     <span className="text-[9px] font-bold text-white">{t.s}</span>
                     <span className="text-[9px] font-mono text-white/70">{t.p}</span>
                     <span className={cn("text-[9px] font-bold", t.up ? "text-myco-accent" : "text-red-500")}>{t.c}</span>
                  </div>
               ))}
            </div>
         </div>
      </div>
      
      <div className="scanline" />
    </div>
  );
};

const MarketView = ({ assets = [] }: any) => {
  const [filter, setFilter] = useState('ALL');
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);
  
  const filteredAssets = filter === 'ALL' ? assets : assets.filter((a: any) => a.type === filter);

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6 bg-[#050505]">
      <div className="flex gap-4 mb-6 shrink-0 h-10 overflow-x-auto no-scrollbar pb-2">
        {['ALL', 'SOL', 'BTC', 'DESCI', 'MYCO', 'XSTOCK', 'DEFI'].map(t => (
          <button 
            key={t} 
            onClick={() => setFilter(t)}
            className={cn(
              "px-6 glass-bento text-[10px] font-bold tracking-widest uppercase transition-all",
              filter === t ? "bg-myco-accent text-black border-myco-accent" : "hover:bg-myco-accent hover:text-black hover:border-myco-accent"
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex-1 glass-bento p-0 overflow-hidden flex flex-col border-white/5">
        <div className="grid grid-cols-12 p-4 border-b border-white/10 text-[10px] font-bold uppercase tracking-widest opacity-50 bg-black/40">
          <span className="col-span-3">Instrument</span>
          <span className="col-span-2 text-right">Price</span>
          <span className="col-span-2 text-right">24H Delta</span>
          <span className="col-span-2 text-right">Market Cap</span>
          <span className="col-span-3 text-right">Volume Stream</span>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {filteredAssets.length === 0 && (
            <div className="p-12 text-center text-dim text-[11px] uppercase tracking-widest">
              No market data — /api/tickers returned empty. Configure FINNHUB_API_KEY or CoinGecko on VM.
            </div>
          )}
          {filteredAssets.map((a, i) => (
            <div key={i} className="flex flex-col border-b border-white/5 group">
              <div 
                onClick={() => setExpandedAsset(expandedAsset === a.symbol ? null : a.symbol)}
                className="grid grid-cols-12 p-4 hover:bg-white/[0.02] transition-colors items-center cursor-pointer"
              >
                <div className="col-span-3 flex items-center gap-3">
                  <div className="size-8 glass-bento flex items-center justify-center p-2 bg-white/[0.03]">
                    <IconBySymbol symbol={a.symbol} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold tracking-tight text-white mb-0.5">{a.symbol}</span>
                    <span className="text-[8px] font-bold text-dim uppercase tracking-widest">{a.type}</span>
                  </div>
                </div>
                <span className="col-span-2 text-right font-mono font-medium text-sm text-white/90">{a.price}</span>
                <span className={cn("col-span-2 text-right font-bold text-xs", a.up ? "text-myco-accent" : "text-red-500")}>
                  {a.change}
                </span>
                <span className="col-span-2 text-right text-[10px] font-mono text-dim tracking-tighter">{a.mcap}</span>
                <div className="col-span-3 flex justify-end items-center gap-4">
                  <div className="h-8 w-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={EMPTY_CHART_DATA}>
                        <Area type="monotone" dataKey="value" stroke={a.up ? "#00ff88" : "#ef4444"} fillOpacity={1} fill={a.up ? "rgba(0,255,136,0.05)" : "rgba(239,68,68,0.05)"} strokeWidth={1.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <ChevronRight className={cn("size-4 text-dim transition-transform", expandedAsset === a.symbol ? "rotate-90" : "")} />
                </div>
              </div>
              
              <AnimatePresence>
                {expandedAsset === a.symbol && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-black/40 border-t border-white/5"
                  >
                    <div className="p-8 grid grid-cols-12 gap-8">
                      <div className="col-span-12 lg:col-span-4 space-y-6">
                         <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-dim uppercase tracking-widest">Available Exchanges & Pools</span>
                            <div className="flex flex-wrap gap-2 mt-2">
                               {a.exchanges?.map(ex => (
                                 <span key={ex} className="px-3 py-1 bg-white/5 border border-white/10 text-[9px] font-bold text-white uppercase tracking-widest">{ex}</span>
                               ))}
                               {a.pools?.map(pool => (
                                 <span key={pool} className="px-3 py-1 bg-myco-accent/10 border border-myco-accent/20 text-[9px] font-bold text-myco-accent uppercase tracking-widest">{pool}</span>
                               ))}
                            </div>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 glass-bento bg-white/5">
                               <span className="text-[9px] font-bold text-dim uppercase block mb-1">FDV</span>
                               <span className="text-sm font-bold font-mono">{a.fdv}</span>
                            </div>
                            <div className="p-4 glass-bento bg-white/5">
                               <span className="text-[9px] font-bold text-dim uppercase block mb-1">Liquidity</span>
                               <span className="text-sm font-bold font-mono">{a.liq}</span>
                            </div>
                         </div>
                         <div className="flex flex-col gap-2">
                            <button className="w-full py-3 bg-myco-accent text-black font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(0,255,136,0.3)] transition-all">
                               <Zap className="size-3 fill-black" /> Initiate Trade Protocol
                            </button>
                            <button className="w-full py-3 border border-white/10 text-white font-black uppercase text-xs tracking-widest hover:bg-white/5">
                               Initiate Staking
                            </button>
                         </div>
                      </div>
                      
                      <div className="col-span-12 lg:col-span-4 space-y-4">
                         <h4 className="text-[10px] font-bold text-dim uppercase tracking-widest">Network Verification Links</h4>
                         <div className="grid grid-cols-1 gap-2">
                            {a.explorer && (
                              <a href={a.explorer} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-white/5 border border-white/10 hover:border-myco-accent transition-all group">
                                 <span className="text-[10px] font-bold uppercase tracking-widest">Blockchain explorer</span>
                                 <ExternalLink className="size-3 text-dim group-hover:text-myco-accent" />
                              </a>
                            )}
                            {a.coingecko && (
                              <a href={a.coingecko} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-white/5 border border-white/10 hover:border-myco-accent transition-all group">
                                 <span className="text-[10px] font-bold uppercase tracking-widest">Coingecko / CMC</span>
                                 <ExternalLink className="size-3 text-dim group-hover:text-myco-accent" />
                              </a>
                            )}
                            {a.dexscreener && (
                              <a href={a.dexscreener} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-white/5 border border-white/10 hover:border-myco-accent transition-all group">
                                 <span className="text-[10px] font-bold uppercase tracking-widest">Dexscreener Stream</span>
                                 <ExternalLink className="size-3 text-dim group-hover:text-myco-accent" />
                              </a>
                            )}
                            {a.binance && (
                              <a href={a.binance} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-white/5 border border-white/10 hover:border-myco-accent transition-all group">
                                 <span className="text-[10px] font-bold uppercase tracking-widest">Binance / Kucoin</span>
                                 <ExternalLink className="size-3 text-dim group-hover:text-myco-accent" />
                              </a>
                            )}
                         </div>
                      </div>

                      <div className="col-span-12 lg:col-span-4">
                         <h4 className="text-[10px] font-bold text-dim uppercase tracking-widest mb-4">Neural Analytics Walkthrough</h4>
                         <div className="p-6 bg-myco-accent/5 border border-myco-accent/20 rounded-sm">
                            <p className="text-xs italic leading-relaxed text-myco-accent/80">"Analyzing {a.symbol} liquidity depth across {a.exchanges?.length} exchanges. Sell pressure is currently diminishing, reflecting high accumulation in the DeSci sector. Protocol suggests potential for breakout."</p>
                            <button className="mt-6 flex items-center gap-2 text-[10px] font-bold text-myco-accent border-b border-myco-accent border-dashed pb-0.5 hover:opacity-80 transition-opacity">
                               <BookOpen className="size-3" /> Access GitBook Research File
                            </button>
                         </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TradeView = ({ prices, chartData, whales }: any) => {
  const [liquidityPools, setLiquidityPools] = useState<any[]>([]);

  useEffect(() => {
    logToSupabase({ type: 'SYSTEM', message: 'User entered Matrix/Whale Trade View' });
    const loadPools = async () => {
      const pools = await fetchLiquidityPools();
      setLiquidityPools(pools);
    };
    loadPools();
    const interval = setInterval(loadPools, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 p-6 overflow-hidden flex flex-col bg-[#050505] gap-8">
      <div className="max-w-[1700px] mx-auto w-full flex justify-between items-center shrink-0">
         <div className="flex flex-col">
            <div className="flex items-center gap-3">
               <div className="size-4 bg-myco-accent border border-myco-accent/20 flex items-center justify-center p-0.5">
                  <Terminal className="text-black size-full" />
               </div>
               <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Market Terminal</h1>
            </div>
            <div className="flex items-center gap-2 mt-1">
               <div className="size-1.5 bg-myco-accent rounded-full animate-pulse shadow-[0_0_8px_rgba(30,255,188,0.5)]" />
               <span className="text-[10px] font-bold text-dim uppercase tracking-[0.4em]">L3 Protocol Verified</span>
            </div>
         </div>
         <WalletDisplay />
      </div>

      <div className="flex-1 grid grid-cols-12 gap-8 max-w-[1700px] mx-auto w-full overflow-hidden pb-8">
        {/* Left: Execution Hub */}
        <div className="col-span-12 xl:col-span-4 flex flex-col h-full space-y-6 overflow-hidden">
          <div className="h-[65%] glass-bento overflow-hidden border-myco-accent/20 bg-myco-accent/[0.01]">
            <MatrixSwap />
          </div>
          
          <div className="flex-1 flex flex-col min-h-0">
             <div className="flex items-center gap-2 mb-3 px-1">
                <BarChart3 className="size-3 text-blue-400" />
                <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Live Liquidity Index</span>
             </div>
             <div className="flex-1 glass-bento border-white/5 bg-black/40 overflow-y-auto no-scrollbar">
                <div className="grid grid-cols-4 p-3 border-b border-white/10 bg-white/[0.05] sticky top-0 z-10 backdrop-blur-md">
                   <span className="text-[8px] font-black text-dim uppercase">Pair</span>
                   <span className="text-[8px] font-black text-dim uppercase">Liquidity</span>
                   <span className="text-[8px] font-black text-dim uppercase">Vol 24H</span>
                   <span className="text-[8px] font-black text-dim uppercase text-right">Yield</span>
                </div>
                {liquidityPools.length === 0 && (
                  <div className="p-6 text-[9px] text-dim uppercase text-center">No liquidity pools from DexScreener for MYCO.</div>
                )}
                {liquidityPools.map((pool) => (
                   <div key={pool.id} className="grid grid-cols-4 p-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors items-center">
                      <div className="flex flex-col">
                         <span className="text-[10px] font-black text-white">{pool.name}</span>
                         <span className="text-[7px] font-bold text-dim uppercase italic">{pool.dexId}</span>
                      </div>
                      <span className="text-[10px] font-mono text-dim tracking-tighter">${(pool.liquidity / 1e6).toFixed(1)}M</span>
                      <span className="text-[10px] font-mono text-dim tracking-tighter">${(pool.volume / 1e3).toFixed(0)}K</span>
                      <span className="text-[10px] font-black text-myco-accent text-right">{pool.apr}</span>
                   </div>
                ))}
             </div>
          </div>
        </div>

        {/* Right: Intelligence Hub + Ledger */}
        <div className="col-span-12 xl:col-span-8 flex flex-col h-full space-y-6 overflow-hidden">
          <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
             {/* Whale Watch Surveillance */}
             <div className="col-span-12 lg:col-span-7 flex flex-col h-full overflow-hidden">
                <div className="flex justify-between items-end mb-4 shrink-0">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="size-2 bg-red-500 rounded-full animate-pulse" />
                      <h2 className="text-xl font-black tracking-tighter uppercase text-white">Neural Surveillance</h2>
                    </div>
                    <p className="text-[9px] text-dim uppercase tracking-[0.2em] font-bold">On-chain Ledger Analysis</p>
                  </div>
                </div>
                <div className="flex-1 glass-bento overflow-hidden border-white/5 bg-black/40 shadow-[0_0_50px_rgba(255,0,0,0.05)]">
                   <WhaleWatch />
                </div>
             </div>

             {/* Personal Ledger / Trade History */}
             <div className="col-span-12 lg:col-span-5 flex flex-col h-full overflow-hidden">
                <div className="flex justify-between items-end mb-4 shrink-0">
                   <div className="flex flex-col">
                      <div className="flex items-center gap-3 mb-1">
                         <div className="size-2 bg-blue-500 rounded-full animate-pulse" />
                         <h2 className="text-xl font-black tracking-tighter uppercase text-white">Execution Ledger</h2>
                      </div>
                      <p className="text-[9px] text-dim uppercase tracking-[0.2em] font-bold">Authenticated Order History</p>
                   </div>
                </div>
                <div className="flex-1 glass-bento overflow-hidden border-white/5 bg-black/40">
                   <TradeHistory />
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PodcastView = () => {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [streamStats, setStreamStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPodcastData = async () => {
      try {
        const res = await fetch('/api/podcasts', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setEpisodes(Array.isArray(data) ? data : []);
        } else {
          setEpisodes([]);
        }
        setStreamStats(null);
      } catch (e) {
         console.error('Error fetching podcast data', e);
         setEpisodes([]);
      } finally {
         setLoading(false);
      }
    };
    fetchPodcastData();
    const interval = setInterval(fetchPodcastData, 60000); // Polling for stream stats
    return () => clearInterval(interval);
  }, []);

  return (
  <div className="flex-1 flex flex-col p-6 gap-6 h-screen overflow-hidden bg-[#050505]">
    <div className="flex-1 grid grid-cols-12 gap-6 relative">
      {/* Streamlabs Overlay System */}
      <div className="absolute top-10 left-10 z-50 pointer-events-none group flex flex-col gap-4">
         <motion.div 
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           className="bg-black/80 border-l-4 border-myco-accent p-4 shadow-2xl backdrop-blur-xl"
         >
            <div className="flex items-center gap-3">
               <div className="size-10 bg-myco-accent flex items-center justify-center">
                  <Coins className="text-black" />
               </div>
               <div>
                  <p className="text-[10px] font-bold text-myco-accent uppercase tracking-widest">Streamlabs Alert</p>
                  <p className="text-xs font-bold text-white">{streamStats?.recentTips[0]?.amount || 'Tip'} from {streamStats?.recentTips[0]?.user || 'Viewer'}</p>
               </div>
            </div>
         </motion.div>
         
         <div className="bg-black/60 border border-white/10 p-4 backdrop-blur-sm flex flex-col gap-2">
             <div className="flex justify-between items-center w-48">
                 <span className="text-[8px] font-bold text-dim uppercase">Live Viewers</span>
                 <span className="text-[10px] font-mono text-myco-accent flex items-center gap-1"><div className="size-1 bg-myco-accent rounded-full animate-ping" /> {streamStats?.viewerCount || '---'}</span>
             </div>
             <div className="flex justify-between items-center w-48">
                 <span className="text-[8px] font-bold text-dim uppercase">Followers</span>
                 <span className="text-[10px] font-mono text-white">{streamStats?.followersCount?.toLocaleString() || '---'}</span>
             </div>
         </div>
      </div>

      <div className="col-span-8 glass-bento relative flex flex-col overflow-hidden border-white/5">
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent pointer-events-none z-10" />
        <img 
          src={episodes[0]?.thumbnail || "https://picsum.photos/seed/pod_hero_3/1200/800"} 
          className="absolute inset-0 size-full object-cover grayscale opacity-10" 
          referrerPolicy="no-referrer"
        />
        <div className="relative z-20 flex-1 p-8 flex flex-col justify-end">
           {/* RSS Status */}
           <div className="flex items-center gap-3 mb-4">
            <a href="https://rss.com" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF5C39] text-white text-[10px] font-black uppercase tracking-tighter">
               <Wifi className="w-3 h-3" /> RSS.COM CONNECTED
            </a>
            <span className="px-3 py-1.5 bg-white/5 border border-white/10 text-myco-accent text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
               <Radio className="w-3 h-3 animate-pulse" />
               STREAMLABS ENGINE ACTIVE
            </span>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center gap-1.5 px-2 py-1 bg-red-500 text-white text-[10px] font-bold uppercase animate-pulse">
              <Radio className="w-3 h-3" /> LIVE BROADCAST
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-white/60 line-clamp-1">{episodes[0] ? episodes[0].title : 'Loading Latest Episode...'}</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 text-white leading-none">THE MYCO SYNDICATE</h1>
          
          <div className="flex items-center gap-6 mt-8">
            <button className="flex items-center gap-3 px-10 py-5 bg-myco-accent text-black font-black uppercase tracking-widest text-sm hover:translate-y-[-2px] transition-all shadow-[0_5px_15px_rgba(0,255,136,0.3)]">
              <Play className="w-6 h-6 fill-black" /> JOIN LIVE HUB
            </button>
            <div className="flex flex-col gap-2">
               <div className="flex items-center gap-3 text-dim">
                  <Volume2 className="w-5 h-5" />
                  <div className="w-48 h-1 bg-white/10 rounded-full relative overflow-hidden">
                     <div className="absolute inset-y-0 left-0 w-3/4 bg-myco-accent animate-pulse" />
                  </div>
               </div>
               <span className="text-[9px] font-bold text-dim uppercase tracking-[0.3em]">Audio Feed: Direct RSS.com API Stream</span>
            </div>
          </div>
        </div>
      </div>
      <div className="col-span-4 flex flex-col gap-6 overflow-y-auto no-scrollbar pb-20">
        {/* Streamlabs Pro Tools */}
        <div className="glass-bento p-6 border-white/5 bg-black/40 flex flex-col gap-4">
           <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-[10px] font-black uppercase text-myco-accent tracking-widest">Streamlabs Config</h3>
              <ExternalLink className="size-3 text-dim" />
           </div>
           <div className="grid grid-cols-2 gap-3">
              {[
                { l: 'Donation Goal', p: 85, c: 'bg-myco-accent', v: '$2.1k / $2.5k' },
                { l: 'Subscriber Goal', p: 42, c: 'bg-blue-400', v: '42 / 100' }
              ].map((g, i) => (
                <div key={i} className="flex flex-col gap-1">
                   <div className="flex items-center justify-between">
                     <span className="text-[8px] font-bold uppercase text-dim">{g.l}</span>
                     <span className="text-[8px] font-mono text-white/50">{g.v}</span>
                   </div>
                   <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full ${g.c}`} style={{ width: `${g.p}%` }} />
                   </div>
                </div>
              ))}
           </div>
           <div className="flex gap-2">
              <button className="flex-1 py-2 bg-white/5 border border-white/10 text-[8px] font-bold uppercase hover:bg-white/10 transition-all text-white relative flex justify-center items-center gap-1">
                 <Bell className="size-3" /> Alerts
              </button>
              <button className="flex-1 py-2 bg-white/5 border border-white/10 text-[8px] font-bold uppercase hover:bg-white/10 transition-all text-white relative flex justify-center items-center gap-1">
                 <Bot className="size-3" /> Cloudbot
              </button>
           </div>
        </div>

        <div className="flex-1 glass-bento border-white/5 flex flex-col overflow-hidden bg-black/40">
           <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#FF5C39]/5">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#FF5C39] flex items-center gap-2">
                 <Rss className="size-3" /> Recent RSS.com Episodes
              </h3>
           </div>
           <div className="flex-1 overflow-y-auto no-scrollbar p-2">
              {loading ? (
                  <div className="h-full flex items-center justify-center p-4">
                      <RefreshCw className="size-5 text-[#FF5C39] animate-spin" />
                  </div>
              ) : episodes.length > 0 ? episodes.slice(0, 5).map((ep: any, i: number) => (
                <div key={i} className="group p-4 hover:bg-white/5 cursor-pointer transition-all border-b border-white/5 last:border-0 hover:border-l-2 border-l-transparent hover:border-l-[#FF5C39]">
                   <div className="flex justify-between items-start mb-2">
                      <span className="text-[8px] font-bold uppercase tracking-widest text-[#FF5C39]">Episode {episodes.length - i}</span>
                      <span className="text-[8px] font-bold text-dim">{ep.publishedAt ? new Date(ep.publishedAt).toLocaleDateString() : '—'}</span>
                   </div>
                   <h4 className="text-sm font-bold text-white leading-tight mb-2 group-hover:text-[#FF5C39] transition-colors line-clamp-2">{ep.title}</h4>
                   <div className="flex items-center gap-3">
                      <button className="size-6 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-[#FF5C39]/20 transition-colors">
                         <Play className="w-2.5 h-2.5 fill-current text-[#FF5C39]" />
                      </button>
                      <span className="text-[10px] font-bold uppercase text-dim tracking-widest">Listen Now</span>
                   </div>
                </div>
              )              ) : (
                 <div className="p-4 text-[10px] text-dim text-center">Loading syndicate feed…</div>
              )}
           </div>
        </div>
      </div>
    </div>
  </div>
  );
};


const NewsView = () => {
  return (
    <div className="flex-1 overflow-hidden">
      <CNBCNewsWidget />
    </div>
  );
};
const FungIPView = () => {
  const [activeTool, setActiveTool] = useState('INSCRIPTION');
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredSpecimens = useMemo(() => {
    if (!searchQuery) return SPECIMENS;
    const q = searchQuery.toLowerCase();
    return SPECIMENS.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.binomial.toLowerCase().includes(q) || 
      s.id.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const renderToolContent = () => {
    switch (activeTool) {
      case 'INSCRIPTION':
        return (
          <div className="p-8 border-l-2 border-myco-accent bg-myco-accent/5 space-y-6">
            <h4 className="text-[10px] font-bold text-myco-accent tracking-widest uppercase mb-4">DNA Sequencing directly to Blockchain Storage</h4>
            <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                      <label className="text-[9px] font-bold text-dim uppercase tracking-widest">Scientific Sequence Raw Data</label>
                      <textarea 
                        placeholder="[A,T,C,G]... (Paste genome slice here)" 
                        className="w-full h-32 bg-black/40 border border-white/10 p-4 font-mono text-xs text-myco-accent outline-none focus:border-myco-accent transition-all resize-none"
                      />
                  </div>
                  <div className="flex gap-4">
                      <input type="text" placeholder="Specimen Ref ID" className="flex-1 bg-black border border-white/10 px-4 py-3 text-[10px] text-white outline-none focus:border-myco-accent" />
                      <input type="text" placeholder="Collection Coordinates" className="flex-1 bg-black border border-white/10 px-4 py-3 text-[10px] text-white outline-none focus:border-myco-accent" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                      <label className="text-[9px] font-bold text-dim uppercase tracking-widest block mb-2">Target Storage Interface</label>
                      <div className="flex gap-2">
                        <button className="flex-1 py-3 bg-white text-black text-[9px] font-bold uppercase transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)]">Bitcoin Ordinals</button>
                        <button className="flex-1 py-3 border border-white/10 text-white/40 text-[9px] font-bold uppercase hover:bg-white/5 transition-all">Solana L2 Arweave</button>
                      </div>
                  </div>
                  <div className="flex flex-col gap-2 p-4 border border-white/10 bg-black/40 rounded-sm mt-4">
                      <div className="flex justify-between items-center text-[9px] font-bold text-dim uppercase">
                        <span>Inscription Density</span>
                        <span>1.42 KB</span>
                      </div>
                      <div className="flex justify-between items-center text-[9px] font-bold text-dim uppercase">
                        <span>Base Network Fee</span>
                        <span>~ 42,420 SATS</span>
                      </div>
                  </div>
                </div>
            </div>
            <button className="w-full py-5 bg-myco-accent text-black font-black uppercase tracking-[0.2em] text-sm hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] transition-all">
                Hash Sequence & Execute Inscription
            </button>
          </div>
        );
      case 'IPNFT':
        return (
          <div className="p-8 border border-white/5 bg-black/60 space-y-6">
             <h4 className="text-[10px] font-bold text-dim tracking-widest uppercase mb-4">Mint Intellectual Property Token</h4>
             <div className="grid grid-cols-[1fr_2fr] gap-8">
                 <div className="border border-dashed border-white/20 flex flex-col items-center justify-center p-8 bg-white/[0.01]">
                    <Share2 className="size-8 text-dim mb-4" />
                    <span className="text-[10px] font-bold uppercase text-dim tracking-widest">Connect Legal Spec</span>
                    <button className="mt-4 px-4 py-2 border border-myco-accent text-myco-accent text-[8px] uppercase tracking-widest hover:bg-myco-accent hover:text-black">Upload PDF</button>
                 </div>
                 <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <label className="text-[8px] uppercase tracking-widest text-dim font-bold">FungIP Nomenclature</label>
                          <input type="text" defaultValue="MYCO-IP-8842" className="w-full bg-transparent border-b border-white/10 py-2 text-sm text-white focus:border-myco-accent outline-none" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] uppercase tracking-widest text-dim font-bold">Royalty Percentage</label>
                          <input type="text" defaultValue="5.0%" className="w-full bg-transparent border-b border-white/10 py-2 text-sm font-mono text-myco-accent focus:border-myco-accent outline-none" />
                       </div>
                    </div>
                    <div className="space-y-1 mt-4">
                       <label className="text-[8px] uppercase tracking-widest text-dim font-bold">MINDEX Reference ID</label>
                       <input type="text" placeholder="MDX-..." className="w-full bg-transparent border-b border-white/10 py-2 text-xs font-mono text-white/50 focus:border-myco-accent outline-none" />
                    </div>
                    <p className="text-[8px] text-dim leading-relaxed uppercase">By minting this IP-NFT you assign governance controls to the configured SPL token bounds. Fractionalization options become available post-mint.</p>
                 </div>
             </div>
             <button className="w-full py-4 bg-white text-black font-black uppercase tracking-[0.2em] text-xs hover:bg-myco-accent transition-colors">
                Finalize IP-NFT Generation
             </button>
          </div>
        );
      case 'MINDEX_SEARCH':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Global Index by Hash, Bio-Sequence, or Owner Address..." 
                  className="w-full bg-black border border-myco-accent/20 p-6 font-mono text-xl text-myco-accent outline-none focus:border-myco-accent transition-all pl-16 shadow-[inset_0_0_20px_rgba(0,255,136,0.05)]"
                />
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-myco-accent size-6" />
            </div>
            
            {searchQuery && (
              <div className="space-y-4">
                <h5 className="text-[10px] font-bold text-myco-accent uppercase tracking-widest">Search Results ({filteredSpecimens.length})</h5>
                <div className="grid grid-cols-2 gap-4">
                   {filteredSpecimens.map(s => (
                     <div key={s.id} className="p-4 glass-bento border border-myco-accent/30 bg-myco-accent/5 flex justify-between items-center group cursor-pointer hover:bg-myco-accent/10 transition-all">
                        <div>
                           <p className="text-xs font-bold text-white uppercase">{s.name}</p>
                           <p className="text-[9px] font-mono text-dim italic">{s.binomial}</p>
                        </div>
                        <div className="text-right">
                           <span className="text-[8px] font-mono text-myco-accent block">{s.id}</span>
                           <span className="text-[10px] font-bold text-white uppercase">{s.rarity}</span>
                        </div>
                     </div>
                   ))}
                   {filteredSpecimens.length === 0 && <p className="text-dim text-xs font-mono uppercase">No matches in global index.</p>}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
                <div className="glass-bento p-6 border-white/5 col-span-2 flex items-center justify-between">
                   <div className="space-y-2">
                       <span className="text-[9px] font-bold text-dim uppercase block">Decentralized Sequence Nodes</span>
                       <div className="flex -space-x-2">
                          {[1,2,3,4,5].map(i => <div key={i} className="size-6 rounded-full border border-black bg-white/10 animate-pulse" style={{ animationDelay: `${i*100}ms` }} />)}
                          <span className="pl-4 text-[10px] font-mono text-myco-accent">+1,424 Nodes Online</span>
                       </div>
                   </div>
                   <div className="text-right space-y-1">
                       <span className="text-2xl font-black text-white font-mono">1,242,088</span>
                       <span className="text-[8px] font-bold text-dim uppercase block tracking-widest">Indexed Sequences</span>
                   </div>
                </div>
                <div className="glass-bento p-6 border-white/5 flex flex-col justify-center items-center gap-2 bg-myco-accent/5">
                    <Database className="text-myco-accent size-6" />
                    <p className="text-[10px] font-bold text-dim uppercase tracking-widest text-center mt-2">Data Backend<br/><span className="text-white">mycosoftlabs/mindex</span></p>
                </div>
            </div>
          </div>
        );
      case 'MYCODEX':
        return (
          <div className="space-y-6">
             <div className="flex justify-between items-end border-b border-white/10 pb-4">
                 <h4 className="text-[12px] font-black tracking-widest uppercase text-white">Encrypted Bio-Vault // MINDEX-REF</h4>
                 <div className="px-2 py-1 bg-myco-accent text-black text-[8px] font-bold uppercase">Authorized Access</div>
             </div>
             <div className="grid grid-cols-3 gap-4">
                 {SPECIMENS.map((v, i) => (
                   <div key={v.id} className="glass-bento p-4 border border-white/5 hover:border-myco-accent/50 cursor-pointer group bg-black/40">
                      <div className="flex justify-between items-start mb-4">
                         <div className={cn("size-2 rounded-full", i===0 ? "bg-myco-accent animate-pulse" : "bg-white/20")}/>
                         <span className="text-[8px] font-mono text-white/40">{v.rarity}</span>
                      </div>
                      <p className="text-[10px] font-bold text-white truncate mb-1">{v.name}</p>
                      <p className="text-[8px] font-mono text-dim italic truncate mb-2">{v.binomial}</p>
                      <div className="flex justify-between items-center">
                         <span className="text-[8px] font-bold uppercase text-dim">{v.discoveryDate}</span>
                         <span className="text-[8px] font-mono text-myco-accent">{v.id}</span>
                      </div>
                   </div>
                 ))}
             </div>
          </div>
        );
      case 'LICENSING':
        return (
          <div className="space-y-6">
             <div className="flex gap-4">
                <div className="glass-bento p-6 border-white/5 flex-1 bg-black/40">
                   <h4 className="text-[10px] font-bold text-dim tracking-widest uppercase mb-4 flex items-center gap-2">
                     <Share2 className="size-3 text-myco-accent" />
                     Licensing Sub-Markets
                   </h4>
                   <div className="space-y-2">
                      {[
                        { name: 'Pharmaceutics / Med', count: 42 },
                        { name: 'Agricultural Bio', count: 18 },
                        { name: 'Materials & Mycelium', count: 96 }
                      ].map((market, idx) => (
                        <div 
                          key={idx} 
                          className="flex justify-between items-center p-3 border border-white/5 hover:border-myco-accent/30 hover:bg-myco-accent/5 transition-all group cursor-pointer"
                        >
                           <span className="text-xs font-bold text-white group-hover:text-myco-accent transition-colors">{market.name}</span>
                           <div className="text-right">
                              <span className="text-[10px] font-mono text-myco-accent bg-myco-accent/10 px-2 py-0.5 rounded-sm">{market.count}</span>
                              <span className="text-[8px] font-bold text-dim uppercase block ml-2">Active Libs</span>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
                <div className="glass-bento p-6 border-white/5 flex flex-col justify-center items-center gap-4 bg-myco-accent/10 border-myco-accent/20 w-1/3 text-center">
                   <FlaskConical className="size-8 text-myco-accent" />
                   <p className="text-[10px] font-bold uppercase text-white leading-tight">Create new sub-license for existing IP-NFT asset.</p>
                   <button className="px-4 py-2 bg-black border border-myco-accent text-myco-accent text-[9px] uppercase hover:bg-myco-accent hover:text-black mt-2">Initialize License</button>
                </div>
             </div>
          </div>
        );
      case 'ANALYSIS':
        return (
          <div className="space-y-6">
             <h4 className="text-[10px] font-bold text-dim tracking-widest uppercase flex items-center justify-between">
                <span>Real-Time Spectrographic Telemetry</span>
                <span className="text-myco-accent animate-pulse">ANALYZING SAMPLE...</span>
             </h4>
             <div className="h-48 glass-bento border-white/5 bg-black/60 relative overflow-hidden flex items-end">
                {/* Simulated spectrograph using bars */}
                <div className="absolute inset-0 flex items-end gap-1 px-4 opacity-50 filter blur-sm">
                   {Array.from({ length: 40 }).map((_, i) => (
                     <div key={`blur-${i}`} className="w-full bg-myco-accent/40" style={{ height: `${Math.random() * 100}%`, transition: 'height 0.5s ease' }} />
                   ))}
                </div>
                <div className="absolute inset-0 flex flex-col justify-center px-8 z-10 pointer-events-none">
                    <div className="w-full h-[1px] bg-white/20 mb-8 relative"><span className="absolute -top-3 right-0 text-[8px] font-mono text-dim">Alpha: 4.2Hz</span></div>
                    <div className="w-full h-[1px] bg-myco-accent/50 relative"><span className="absolute -top-3 right-0 text-[8px] font-mono text-myco-accent">Resonance Peak</span></div>
                </div>
                <div className="w-full flex items-end gap-[2px] px-4 relative z-20 h-full pt-8">
                   {Array.from({ length: 80 }).map((_, i) => (
                     <div key={`bar-${i}`} className="flex-1 bg-myco-accent" style={{ height: `${20 + Math.random() * 80}%` }} />
                   ))}
                </div>
             </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 grid grid-cols-12 gap-1 p-1 bg-[#050505] overflow-hidden">
      {/* Tools Sidebar */}
      <div className="col-span-12 lg:col-span-2 glass-bento border-white/5 bg-black/40 flex flex-col p-4 z-10">
         <div className="flex flex-col gap-1 mb-6 border-b border-myco-accent/20 pb-4">
            <h2 className="text-[10px] font-black text-myco-accent uppercase tracking-[0.3em]">FungIP Suite</h2>
            <span className="text-[8px] text-dim uppercase font-bold tracking-widest flex items-center gap-1"><div className="size-1 bg-green-500 rounded-full"/> Node: Connected</span>
         </div>
         <div className="space-y-1">
            {[
              { id: 'INSCRIPTION', label: 'DNA Inscription', icon: Dna },
              { id: 'IPNFT', label: 'IP-NFT Minter', icon: Share2 },
              { id: 'MINDEX_SEARCH', label: 'MINDEX Search', icon: Search },
              { id: 'MYCODEX', label: 'Mycodex IP Vault', icon: Database },
              { id: 'LICENSING', label: 'License Desk', icon: FlaskConical },
              { id: 'ANALYSIS', label: 'Spectra Scan', icon: Microscope },
            ].map(t => (
              <button 
                key={t.id} 
                onClick={() => setActiveTool(t.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-4 text-[9px] font-black uppercase tracking-widest transition-all rounded-sm",
                  activeTool === t.id ? "bg-myco-accent/10 border-l-2 border-myco-accent text-myco-accent" : "text-dim hover:text-white hover:bg-white/5 border-l-2 border-transparent"
                )}
              >
                <t.icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{t.label}</span>
              </button>
            ))}
         </div>
         <div className="mt-auto pt-4 border-t border-white/5">
            <div className="p-4 glass-bento bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer transition-colors group">
               <span className="text-[9px] font-bold text-white uppercase block mb-1 group-hover:text-myco-accent">Nature App Mobile</span>
               <p className="text-[8px] text-dim leading-tight">Sync field samples to MINDEX.</p>
            </div>
         </div>
      </div>

      {/* Primary Tool View */}
      <div className="col-span-12 lg:col-span-10 grid grid-cols-12 gap-1 overflow-hidden">
         <div className="col-span-12 lg:col-span-8 glass-bento bg-black/20 border-white/5 p-10 flex flex-col overflow-y-auto no-scrollbar">
            <div className="max-w-4xl space-y-10">
               <div className="flex justify-between items-start border-b border-white/5 pb-8">
                  <div>
                    <h3 className="text-4xl font-black tracking-tighter uppercase mb-2 text-white">
                      {activeTool.replace('_', ' ')}
                    </h3>
                    <p className="text-sm text-dim leading-relaxed font-medium">
                        {activeTool === 'INSCRIPTION' ? 'Directly anchor your biological sequence data to immutable blockchain storage. Supports Bitcoin Ordinals and Solana L2 solutions.' :
                         activeTool === 'IPNFT' ? 'Mint intellectual property NFTs representing legal ownership and licensing rights of biological discoveries.' :
                         activeTool === 'MINDEX_SEARCH' ? 'Decentralized query engine for the global Fungal Intelligence Index. Locate exact sequences and owners.' : 
                         activeTool === 'MYCODEX' ? 'Secure decentralized vault for massive biological datasets. Encrypted and accessible via authorized keys.' :
                         activeTool === 'LICENSING' ? 'Manage sub-licensing, royalty splits, and commercial access to your biological IP-NFTs.' :
                         'Deep spectrographic and computational analysis of indexed biological samples in real-time.'}
                    </p>
                  </div>
                  <div className="size-16 shrink-0 glass-bento flex items-center justify-center bg-myco-accent/10 border-myco-accent/30 text-myco-accent hidden md:flex">
                     <Terminal className="w-6 h-6" />
                  </div>
               </div>

               {/* Dynamic Implementation Render */}
               {renderToolContent()}

            </div>
         </div>

         {/* Right Sidebar: Activity Stream */}
         <div className="col-span-12 lg:col-span-4 glass-bento bg-black border-white/5 p-6 flex flex-col overflow-hidden">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-myco-accent mb-6">MINDEX Core Activity Feed</h4>
            <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar pr-2">
               {[
                 { id: '842', tag: 'INSCRIPTION', m: 'Ordinals transacted for Sample 0x48f. Permanence confirmed.' },
                 { id: '911', tag: 'MYCODEX', m: '5 GB dataset fully synchronized across L2 nodes.' },
                 { id: '102', tag: 'IP-NFT', m: 'License generated for Pharma integration of Psilocybin strain.' },
                 { id: '774', tag: 'ANALYSIS', m: 'Spectra Scan found anomaly in DNA match query.' },
                 { id: '901', tag: 'LICENSING', m: 'Commercial royalty payment executed to creator wallet.' },
                 { id: '042', tag: 'MINDEX', m: 'New node integrated containing 140k new fungal maps.' }
               ].map((item, i) => (
                 <div key={i} className="p-4 border border-white/5 bg-white/[0.02] space-y-2 hover:bg-white/[0.05] cursor-pointer transition-all">
                    <div className="flex justify-between items-center mb-1">
                       <span className="text-[8px] font-black text-myco-accent uppercase tracking-widest">{item.tag}_{item.id}</span>
                       <span className="text-[7px] font-mono text-dim">VERIFIED: L1</span>
                    </div>
                    <p className="text-[9px] text-white leading-relaxed">{item.m}</p>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};

const LearnView = () => {
  const modules = [
    { 
       id: 'BIO_IP',
       name: 'The Biological IP Stack', 
       time: '12 min', 
       level: 'Intro', 
       desc: 'Understanding how MINDEX and FungIP collaborate to create a new asset class for biological discoveries.',
       video: 'https://vjs.zencdn.net/v/oceans.mp4'
    },
    { 
       id: 'FIELD_OPS',
       name: 'Field Operations: Nature App', 
       time: '8 min', 
       level: 'Practical', 
       desc: 'Step-by-step guide to using the Nature App for decentralized fungal mapping and real-time syncing.',
       video: 'https://vjs.zencdn.net/v/oceans.mp4'
    },
    { 
       id: 'ORDINAL_INS',
       name: 'Ordinal Inscription Pro', 
       time: '15 min', 
       level: 'Technical', 
       desc: 'Advanced technical overview of storing genetic sequence data on the Bitcoin blockchain permanently.',
       video: 'https://vjs.zencdn.net/v/oceans.mp4'
    }
  ];

  const [activeIdx, setActiveIdx] = useState(0);
  const activeModule = modules[activeIdx];

  return (
    <div className="flex-1 flex overflow-hidden bg-[#050505]">
       {/* Sidebar Navigation */}
       <div className="w-80 shrink-0 border-r border-white/5 bg-black/40 flex flex-col overflow-y-auto no-scrollbar">
          <div className="p-8 border-b border-white/5">
             <h2 className="text-xl font-bold tracking-tighter uppercase mb-2">Protocol Academy</h2>
             <p className="text-[10px] text-dim font-bold uppercase tracking-[0.2em]">Ascension through decentralized knowledge.</p>
          </div>
          <div className="flex-1 py-4">
             {modules.map((m, i) => (
                <button 
                  key={i} 
                  onClick={() => setActiveIdx(i)}
                  className={cn(
                    "w-full p-6 text-left border-b border-white/5 flex flex-col gap-2 transition-all",
                    activeIdx === i ? "bg-myco-accent/10 border-l-4 border-l-myco-accent" : "hover:bg-white/[0.02]"
                  )}
                >
                   <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-dim uppercase tracking-widest">{m.level}</span>
                   </div>
                   <h3 className={cn("text-lg font-bold tracking-tight", activeIdx === i ? "text-myco-accent" : "text-white")}>{m.name}</h3>
                </button>
             ))}
          </div>
       </div>

       {/* Module Content */}
       <div className="flex-1 overflow-y-auto no-scrollbar p-12 bg-black/20">
          <div className="max-w-4xl space-y-12">
             <div className="flex justify-between items-start">
                <div className="space-y-4 max-w-2xl">
                   <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 bg-myco-accent/10 border border-myco-accent/20 text-[9px] font-bold text-myco-accent uppercase tracking-[0.2em]">{activeModule.level} PROTOCOL</span>
                      <span className="text-dim text-[10px] uppercase font-bold tracking-widest">{activeModule.time}</span>
                   </div>
                   <h1 className="text-5xl font-black tracking-tighter uppercase leading-none">{activeModule.name}</h1>
                   <p className="text-lg text-dim leading-relaxed">{activeModule.desc}</p>
                </div>
                <div className="flex gap-2">
                   <button className="size-10 glass-bento flex items-center justify-center hover:bg-white/5 transition-all">
                      <Share2 className="size-4" />
                   </button>
                   <button className="size-10 glass-bento flex items-center justify-center hover:bg-white/5 transition-all text-myco-accent">
                      <LinkIcon className="size-4" />
                   </button>
                </div>
             </div>

             <div className="aspect-video glass-bento border-white/10 overflow-hidden bg-black relative group shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
                <iframe 
                  src={activeModule.video}
                  className="size-full border-none opacity-80"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
             </div>

             <div className="grid grid-cols-2 gap-8">
                <div className="space-y-6">
                   <h4 className="text-sm font-black tracking-[0.3em] uppercase border-b border-white/5 pb-4">Internal Documentation</h4>
                   <div className="space-y-3">
                      {[1,2,3].map(i => (
                        <div key={i} className="p-4 bg-white/5 border border-white/10 hover:border-myco-accent transition-all cursor-pointer group flex items-center justify-between">
                           <span className="text-xs font-bold uppercase tracking-widest text-white/80 group-hover:text-myco-accent transition-colors">Module Section 0{i}: Integration Architecture</span>
                           <ArrowDownRight className="size-3 text-dim group-hover:text-myco-accent" />
                        </div>
                      ))}
                   </div>
                </div>
                <div className="p-10 glass-bento bg-myco-accent/5 border-myco-accent/30 flex flex-col justify-center items-center text-center space-y-6">
                   <Video className="size-10 text-myco-accent" />
                   <div>
                      <h4 className="text-lg font-bold uppercase mb-2">Satellite Walkthrough Available</h4>
                      <p className="text-xs text-dim mb-6">Complete this module to earn veMYCO reputation points and unlock the next protocol layer.</p>
                      <button className="px-8 py-3 bg-myco-accent text-black font-black uppercase text-xs tracking-widest hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] transition-all">Mark as Complete</button>
                   </div>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

const TokenomicsView = ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    import('./services/apiService').then(({ fetchLiveMycoTokenMetrics }) => {
       fetchLiveMycoTokenMetrics().then(data => setMetrics(data));
    });
  }, []);

  return (
    <div className="flex-1 p-6 overflow-y-auto no-scrollbar mb-20">
    <div className="max-w-7xl mx-auto space-y-8 pb-32">
       {/* Small Banner Header */}
       <div className="p-8 glass-bento bg-black border-white/5 relative overflow-hidden flex justify-between items-center">
          <div className="space-y-2 relative z-10">
             <h2 className="text-[10px] font-black text-myco-accent uppercase tracking-[0.4em] mb-1 flex items-center gap-2">
                <div className="size-2 bg-myco-accent rounded-full animate-pulse" /> PROTOCOL INTELLIGENCE // MYCODAO
             </h2>
             <h3 className="text-4xl font-black tracking-tighter uppercase leading-none text-white">Biological Sovereignty Network</h3>
             <p className="text-xs text-dim uppercase font-bold tracking-widest mt-1">
               Token: $MYCO // Supply: 1,000,000,000 // FDV: {metrics ? `$${(metrics.fdv/1000000).toFixed(1)}M` : '$120.4M'} // LIVE PRICE: {metrics ? `$${parseFloat(metrics.price).toFixed(4)}` : '...'}
             </p>
          </div>
          <div className="flex gap-4">
             <button className="px-6 py-3 bg-myco-accent text-black text-[10px] font-black uppercase tracking-widest transition-all hover:shadow-[0_0_20px_rgba(0,255,136,0.2)]">Buy $MYCO</button>
             <button className="px-6 py-3 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/5">Governance</button>
          </div>
       </div>

       <div className="grid grid-cols-12 gap-6">
          {/* Main Content Column */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
             <div className="grid grid-cols-3 gap-6">
                {[
                  { l: 'Treasury Value', v: metrics ? `$${((metrics.fdv * 0.35)/1000000).toFixed(1)}M` : '$42.1M', d: 'SOL + USDC + BIO-IP' },
                  { l: 'Active Agents', v: '142 Units', d: 'Autonomous Research' },
                  { l: 'Science DAO Cap', v: metrics ? `$${(metrics.liq/1000000).toFixed(1)}M` : '$12.4M', d: 'Liquidity available' }
                ].map((s, i) => (
                  <div key={i} className="glass-bento p-6 border-white/5 bg-black/40">
                     <span className="text-[9px] font-black text-dim uppercase tracking-[0.2em] block mb-2">{s.l}</span>
                     <span className="text-xl font-bold tracking-tight text-white block mb-1">{s.v}</span>
                     <span className="text-[8px] font-bold text-myco-accent/60 uppercase">{s.d}</span>
                  </div>
                ))}
             </div>

             <div className="glass-bento p-8 border-white/5 bg-black/40">
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/5">
                   <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white">Active Bio-Experiments & Graph Data</h3>
                   <span className="text-[9px] font-mono text-dim">REF_ID: LAB_SYNC_77</span>
                </div>
                <div className="h-64 mb-8">
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={EMPTY_CHART_DATA}>
                         <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3}/>
                               <stop offset="95%" stopColor="#00ff88" stopOpacity={0}/>
                            </linearGradient>
                         </defs>
                         <Area type="monotone" dataKey="price" stroke="#00ff88" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
                         <XAxis dataKey="time" hide />
                         <YAxis hide />
                      </AreaChart>
                   </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase text-myco-accent">Biological Sequence Growth</h4>
                      <p className="text-xs text-dim leading-relaxed font-medium">Monitoring the ingestion rate of unique fungal species into the MINDEX protocol via Nature App nodes globally.</p>
                      <div className="flex gap-4">
                         <div className="flex flex-col">
                            <span className="text-xl font-black text-white">1,242</span>
                            <span className="text-[8px] font-bold text-dim uppercase">Inscribed</span>
                         </div>
                         <div className="flex flex-col border-l border-white/10 pl-4">
                            <span className="text-xl font-black text-white">+84%</span>
                            <span className="text-[8px] font-bold text-dim uppercase">Weekly Δ</span>
                         </div>
                      </div>
                   </div>
                   <div className="p-4 bg-myco-accent/5 border border-myco-accent/10 space-y-4">
                      <div className="flex justify-between items-center">
                         <span className="text-[9px] font-black text-myco-accent uppercase tracking-widest">Active Hypothesis</span>
                         <FlaskConical className="size-4 text-myco-accent" />
                      </div>
                      <p className="text-xs font-bold leading-tight uppercase">HYP-042: Mycelium-Based Storage Density at Scale</p>
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                         <div className="h-full bg-myco-accent w-2/3" />
                      </div>
                      <span className="text-[8px] font-mono text-dim tracking-widest block">TESTING IN SECTOR 4...</span>
                   </div>
                </div>
             </div>

             <div className="glass-bento p-8 border-white/5 bg-black/40">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white mb-8 border-b border-white/5 pb-4">Agent Network Activity</h3>
                <div className="space-y-4">
                   {[
                     { a: 'AGENT_SIGMA', t: 'SEQUENCING', target: 'MINDEX POOL', status: '82% COMPLETED', color: 'text-myco-accent' },
                     { a: 'AGENT_VOX', t: 'NEWS_GEN', target: 'PROTOCOL FEED', status: 'SYNCHRONIZED', color: 'text-blue-400' },
                     { a: 'AGENT_RISK', t: 'TREASURY_SWAP', target: 'SOL/USDC', status: 'PENDING_DAO_VOTE', color: 'text-yellow-400' },
                   ].map((item, i) => (
                     <div key={i} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/10 hover:bg-white/[0.05] transition-all group">
                        <div className="flex items-center gap-4">
                           <div className="size-1 group-hover:scale-150 transition-transform bg-current rounded-full" style={{ color: item.color.includes('myco') ? '#00ff88' : item.color.includes('blue') ? '#60a5fa' : '#fbbf24' }} />
                           <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-white uppercase">{item.a}</span>
                              <span className="text-[8px] text-dim uppercase font-bold tracking-widest">{item.t} → {item.target}</span>
                           </div>
                        </div>
                        <span className={cn("text-[9px] font-black uppercase tracking-tighter", item.color)}>{item.status}</span>
                     </div>
                   ))}
                </div>
             </div>
          </div>

          {/* Right Column Column */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
             <div className="glass-bento p-8 bg-black/60 border-white/5">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-dim mb-6">Company News & Updates</h3>
                <div className="space-y-6">
                   {[
                     { t: 'PARTNERSHIP', m: 'RealmDAO x MycoDAO inter-governance sync active.', r: '1h ago' },
                     { t: 'TECHNOLOGY', m: 'MINDEX v2.4 Release: IP-NFT sub-licensing logic integrated.', r: '4h ago' },
                     { t: 'SCIENCE', m: 'Field trial "LAB-IN-A-BOX" results show 92% yield increase.', r: '1d ago' },
                     { t: 'FUNDING', m: 'Mycosoft Seed B round closes with $24M leadership.', r: '2d ago' },
                   ].map((n, i) => (
                     <div key={i} className="space-y-1 group cursor-pointer border-b border-white/5 pb-4 last:border-0 last:pb-0">
                        <div className="flex justify-between items-center mb-1">
                           <span className="text-[8px] font-black text-myco-accent uppercase tracking-widest">{n.t}</span>
                           <span className="text-[8px] font-bold text-dim">{n.r}</span>
                        </div>
                        <h4 className="text-[13px] font-bold text-white leading-tight group-hover:text-myco-accent transition-colors uppercase tracking-tight">{n.m}</h4>
                     </div>
                   ))}
                </div>
             </div>

             <div className="glass-bento p-8 bg-myco-accent/5 border-myco-accent/20">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-myco-accent mb-6">Proposal Submission</h3>
                <p className="text-xs text-dim leading-relaxed mb-6 font-bold uppercase">Ready to contribute to the mycological revolution? Submit a proposal for funding or protocol updates.</p>
                <div className="space-y-4">
                   <div className="p-4 border border-white/10 bg-black/40 space-y-1">
                      <span className="text-[8px] font-bold text-dim uppercase">Grant Category</span>
                      <p className="text-xs font-black text-white uppercase">Scientific Research [BIO]</p>
                   </div>
                   <button className="w-full py-4 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-myco-accent transition-all">Submit MIP</button>
                </div>
             </div>

             <div className="glass-bento p-8 bg-black/40 border-white/5 overflow-hidden">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-dim mb-6">Live Token Metrics</h3>
                <div className="space-y-4">
                   {[
                     { l: 'Liquidity (USD)', v: metrics ? `$${(metrics.liq/1000).toFixed(1)}k` : '...' },
                     { l: '24h Price Change', v: metrics ? `${metrics.priceChange24h}%` : '...' },
                     { l: 'Total Market Cap', v: metrics ? `$${(metrics.marketCap/1000000).toFixed(1)}M` : '...' },
                     { l: 'Network Protocol', v: 'Solana SPL' },
                   ].map((m, i) => (
                     <div key={i} className="flex justify-between items-center border-b border-white/5 pb-3 last:border-0 last:pb-0">
                        <span className="text-[9px] font-bold text-dim uppercase tracking-widest">{m.l}</span>
                        <span className="text-sm font-black text-white font-mono">{m.v}</span>
                     </div>
                   ))}
                </div>
             </div>
          </div>
       </div>
    </div>
  </div>
  );
};

const DAOView = ({ setActiveTab }: any) => {
  const [proposals, setProposals] = useState<any[]>([]);
  const [realm, setRealm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    import('./services/solanaGovernance').then(async ({ fetchRealmProposals, fetchRealmInfo }) => {
       try {
         const realmInfo = await fetchRealmInfo();
         if (isSubscribed) setRealm(realmInfo);
         const props = await fetchRealmProposals();
         if (isSubscribed) {
           setProposals(props);
           setLoading(false);
         }
       } catch (e) {
          if (isSubscribed) setLoading(false);
       }
    });
    return () => { isSubscribed = false; };
  }, []);

  const handleVote = (id: string, side: 'yes' | 'no') => {
    setVotingId(id);
    // Simulate transaction delay
    setTimeout(() => {
      setProposals(prev => prev.map(p => {
        if (p.id === id) {
          return { ...p, [side]: p[side] + 1000 }; // Boost by 1k for demo
        }
        return p;
      }));
      setVotingId(null);
    }, 1500);
  };

  return (
  <div className="flex-1 p-6 overflow-hidden flex flex-col">
    <div className="flex-1 grid grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
      {/* Left: Proposals List */}
      <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 overflow-y-auto no-scrollbar pb-32">
         <div className="flex justify-between items-end mb-4">
            <div>
               <h2 className="text-4xl font-black tracking-tighter uppercase mb-1">DAO Governance</h2>
               <p className="text-xs text-dim uppercase tracking-widest font-bold font-mono text-myco-accent">Solana SPL Governance / Realm Integration</p>
            </div>
            <div className="flex gap-2">
               <button 
                 className="px-6 py-3 bg-myco-accent text-black text-[10px] font-black border border-myco-accent hover:bg-transparent hover:text-myco-accent transition-all uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(0,255,136,0.2)]"
               >
                 Connect Solana Wallet <Zap className="size-3" />
               </button>
            </div>
         </div>

         {loading ? (
             <div className="glass-bento p-12 flex flex-col items-center justify-center text-center space-y-4">
                 <RefreshCw className="size-8 text-myco-accent animate-spin" />
                 <p className="text-xs uppercase tracking-widest text-dim font-bold">Synchronizing with SPL Governance...</p>
             </div>
         ) : proposals.length > 0 ? proposals.map((p: any) => {
           // Basic mapping of proposal state Enum from SPL Governance to UI string
           const stateString = p.state === 1 ? 'VOTING' : p.state === 3 ? 'EXECUTING' : p.state === 4 ? 'PASSED' : p.state === 5 ? 'DEFEATED' : 'DRAFT';
           const yesPct = p.yes + p.no > 0 ? (p.yes / (p.yes + p.no)) * 100 : 0;
           return (
           <div key={p.id} className="glass-bento p-8 hover:bg-white/[0.02] cursor-pointer transition-all border-l-2 border-transparent hover:border-myco-accent group">
              <div className="flex justify-between items-start mb-6">
                 <div className="flex items-center gap-4">
                    <div className={cn("px-2 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm", 
                      stateString === 'VOTING' ? "bg-myco-accent text-black" : 
                      stateString === 'PASSED' ? "bg-white/10 text-white" : "bg-white/5 text-dim"
                    )}>
                      {stateString}
                    </div>
                    <span className="text-xs font-bold font-mono opacity-40">#{p.id}</span>
                 </div>
                 <span className="text-[10px] font-bold text-dim uppercase tracking-widest">LIVE DATA</span>
              </div>
              <h3 className="text-2xl font-bold tracking-tight mb-8 group-hover:text-myco-accent transition-colors">{p.title}</h3>
              <div className="space-y-4">
                 <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-1">
                    <span className="text-myco-accent">Support: {yesPct.toFixed(1)}%</span>
                    <span className="text-dim">Oppose: {(100 - yesPct).toFixed(1)}%</span>
                 </div>
                 <div className="h-1.5 w-full bg-white/5 rounded-full flex overflow-hidden">
                    <div className="h-full bg-myco-accent" style={{ width: `${yesPct}%` }} />
                    <div className="h-full bg-red-400 opacity-40" style={{ width: `${100 - yesPct}%` }} />
                 </div>
              </div>
              <div className="mt-8 pt-8 border-t border-white/5 flex justify-between items-center">
                 <div className="flex items-center gap-2">
                    <div className="size-6 rounded-full bg-white/5 border border-white/10" />
                    <span className="text-[10px] font-bold text-dim uppercase tracking-widest">Authored by {p.author}</span>
                 </div>
                 <div className="flex gap-2">
                    <button 
                      onClick={() => handleVote(p.id, 'yes')}
                      disabled={votingId === p.id}
                      className={cn(
                        "px-4 py-2 bg-myco-accent/10 border border-myco-accent/30 text-myco-accent text-[9px] font-black uppercase hover:bg-myco-accent hover:text-black transition-all",
                        votingId === p.id && "animate-pulse"
                      )}
                    >
                      {votingId === p.id ? 'TRANSMITTING...' : 'APPROVE'}
                    </button>
                    <button 
                      onClick={() => handleVote(p.id, 'no')}
                      disabled={votingId === p.id}
                      className="px-4 py-2 bg-red-400/10 border border-red-400/30 text-red-400 text-[9px] font-black uppercase hover:bg-red-400 hover:text-white transition-all"
                    >
                      {votingId === p.id ? '...' : 'REJECT'}
                    </button>
                 </div>
              </div>
           </div>
         )}) : (
             <div className="glass-bento p-12 border-myco-accent/20 bg-myco-accent/5 flex flex-col items-center justify-center text-center space-y-4">
                 <p className="text-sm font-bold text-white uppercase tracking-widest">Connected to Realm</p>
                 <p className="text-[10px] text-dim font-mono">No active proposals found for the configured SPL Governance address.</p>
             </div>
         )}
      </div>

      {/* Right: Proposals Stats & DAO Feed */}
      <div className="col-span-12 lg:col-span-4 space-y-6 overflow-y-auto no-scrollbar pb-20">
         <div className="glass-bento p-8 bg-myco-accent/5 border-myco-accent/20">
            <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-myco-accent mb-6">SPL Governance Account</h3>
            <div className="space-y-6">
               <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-dim">Realm Public Key</span>
                  <span className="text-xs font-mono font-bold text-white">{realm ? realm.pubkey.toBase58().substring(0,6) + '...' + realm.pubkey.toBase58().slice(-4) : '...'}</span>
               </div>
               <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-dim">Total Proposals</span>
                  <span className="text-xs font-mono font-bold text-white">{proposals.length}</span>
               </div>
               <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-dim">Network</span>
                  <span className="text-xs font-mono font-bold text-myco-accent">Solana Mainnet-Beta</span>
               </div>
               <a href="https://app.realms.today/dao/At93fiCMzEkZWBAHxSNjfk7zUHnF3JcxyCyPjZELjK9Y/treasury/v2" target="_blank" rel="noreferrer" className="w-full py-4 bg-transparent border border-myco-accent text-myco-accent text-[10px] font-black uppercase tracking-widest hover:bg-myco-accent hover:text-black transition-all block text-center mt-4">
                  Open Treasury in Realms
               </a>
            </div>
         </div>

         <div className="glass-bento p-8">
            <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-dim mb-6 border-b border-white/5 pb-2">Interaction Log</h3>
            <div className="space-y-6">
               {[
                 { t: 'IP-TOKEN MINT', d: 'New tokenized license for SEQ-842.', e: '1h ago' },
                 { t: 'PROPOSAL SYNC', d: 'MIP-088 quorum reached 65%.', e: '3h ago' },
                 { t: 'DAO NEWS', d: 'ValleyDAO partnership finalized.', e: '5h ago' },
                 { t: 'MEMBER JOIN', d: '0xScience staking 50k MYCO.', e: '8h ago' },
               ].map((l, i) => (
                 <div key={i} className="space-y-1">
                    <div className="flex justify-between text-[9px] font-bold">
                       <span className="text-myco-accent uppercase tracking-widest">{l.t}</span>
                       <span className="text-dim opacity-40 uppercase">{l.e}</span>
                    </div>
                    <p className="text-[11px] leading-tight text-white/80">{l.d}</p>
                 </div>
               ))}
               <button className="w-full py-3 border border-white/5 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5">Expand DAO History</button>
            </div>
         </div>

         <div className="glass-bento p-8 bg-black">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-dim mb-4">Project Progress</h4>
            <div className="space-y-4">
               {[
                 { p: 'Fungal Longevity FL-1', s: 'Phase 2: Sequencing', c: 'text-myco-accent' },
                 { p: 'Neural Link V1', s: 'Phase 1: Prototyping', c: 'text-dim' },
                 { p: 'MINDEX Expansion', s: 'Syncing Nodes', c: 'text-myco-accent' }
               ].map((prj, i) => (
                 <div key={i} className="flex justify-between items-center text-[10px] font-bold">
                    <span className="uppercase tracking-tight">{prj.p}</span>
                    <span className={cn("uppercase tracking-widest opacity-80", prj.c)}>{prj.s}</span>
                 </div>
               ))}
            </div>
         </div>

         <div className="glass-bento p-8 bg-black">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-dim mb-6">IP Token Portfolio</h4>
            <div className="space-y-4">
               {[
                 { t: 'FL-1-GENOME', b: '4,200', v: '$12k', u: true },
                 { t: 'NL-V1-NEURO', b: '120,000', v: '$88k', u: true },
                 { t: 'MINDEX-CORE', b: '85', v: '$210k', u: false }
               ].map((tk, i) => (
                 <div key={i} className="flex justify-between items-end border-b border-white/5 pb-3">
                    <div className="flex flex-col">
                       <span className="text-[10px] font-bold text-white uppercase">{tk.t}</span>
                       <span className="text-[9px] font-mono text-dim">{tk.b} tokens</span>
                    </div>
                    <div className="text-right">
                       <span className="text-[10px] font-bold text-white block">{tk.v}</span>
                       <span className={cn("text-[8px] font-bold uppercase", tk.u ? "text-myco-accent" : "text-red-500")}>{tk.u ? 'Sync active' : 'Stable'}</span>
                    </div>
                 </div>
               ))}
               <button className="w-full py-3 mt-2 border border-white/10 text-white text-[9px] font-black uppercase tracking-widest hover:bg-white/5" onClick={() => setActiveTab('FungIP')}>Mint IP-NFT</button>
            </div>
         </div>

         <div className="glass-bento p-8 bg-black">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-dim mb-4">DAO Intelligence</h4>
            <div className="p-4 border border-myco-accent/20 bg-myco-accent/5 italic text-xs leading-relaxed text-myco-accent">
               "Sentiment analysis suggests 78% alignment on MIP-088. Treasury reserves are optimal for expansion. No critical bottlenecks detected in the MINDEX layer."
            </div>
         </div>
      </div>
    </div>
  </div>
);
};

const SettingsView = ({ isDarkMode, setIsDarkMode }: any) => (
  <div className="flex-1 p-6 flex items-center justify-center">
    <div className="w-full max-w-3xl glass-bento grid grid-cols-1 md:grid-cols-12 overflow-hidden overflow-y-auto no-scrollbar">
      <div className="md:col-span-4 bg-black/40 border-r border-myco-border p-8 flex flex-col gap-8">
         <div className="flex flex-col gap-1">
            <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-myco-accent">Configuration</h3>
            <p className="text-[10px] text-dim">Customize the neural protocol interface to your specifications.</p>
         </div>
         <nav className="flex flex-col gap-2">
            {['DISPLAY', 'DATA', 'SECURITY', 'NETWORKS', 'EXPERIMENTAL'].map((n, i) => (
              <button key={n} className={cn("text-left px-4 py-3 text-[10px] font-bold tracking-[0.2em] transition-all", i === 0 ? "bg-myco-accent text-black" : "text-dim hover:text-white bg-white/5")}>
                {n}
              </button>
            ))}
         </nav>
      </div>
      <div className="md:col-span-8 p-10 space-y-12">
         <section className="space-y-6">
           <h4 className="text-[10px] font-bold text-dim uppercase tracking-[0.4em] mb-4">Neural Feedback (Theme)</h4>
           <div className="flex gap-4">
             <button 
               onClick={() => setIsDarkMode(true)}
               className={cn("flex-1 p-6 glass-bento flex flex-col items-center gap-3 transition-all", isDarkMode ? "border-myco-accent ring-1 ring-myco-accent/20 bg-myco-accent/5" : "opacity-40 grayscale")}
             >
               <Moon className="w-8 h-8" />
               <span className="text-[10px] font-bold uppercase tracking-widest">Neural / Dark</span>
             </button>
             <button 
               onClick={() => setIsDarkMode(false)}
               className={cn("flex-1 p-6 glass-bento flex flex-col items-center gap-3 transition-all", !isDarkMode ? "border-myco-accent ring-1 ring-myco-accent/20 bg-myco-accent/5" : "opacity-40 grayscale")}
             >
               <Sun className="w-8 h-8" />
               <span className="text-[10px] font-bold uppercase tracking-widest">Prismatic / Light</span>
             </button>
           </div>
         </section>
         <section className="space-y-6">
           <h4 className="text-[10px] font-bold text-dim uppercase tracking-[0.4em] mb-4">Oracle Sensitivity</h4>
           <div className="flex flex-col gap-2">
              {[
                { l: 'MINIMAL', d: 'Condensed systematic protocol bulletins.' },
                { l: 'SYSTEMATIC', d: 'Standard deep-dive intelligence summaries.' },
                { l: 'VIBRANT', d: 'Full sensory textual data output with heavy lore.' }
              ].map((lvl, i) => (
                <div key={i} className="flex items-center justify-between p-4 glass-bento hover:bg-white/5 transition-all group cursor-pointer">
                  <div>
                    <span className="text-[10px] font-bold uppercase group-hover:text-myco-accent transition-colors">{lvl.l}</span>
                    <p className="text-[10px] text-dim">{lvl.d}</p>
                  </div>
                  <div className={cn("size-3 rounded-full border-2 border-myco-accent", i === 1 ? "bg-myco-accent" : "")} />
                </div>
              ))}
           </div>
         </section>
         <section className="pt-12 border-t border-myco-border text-center">
            <p className="text-[10px] text-dim uppercase font-bold tracking-[0.2em] mb-4">Pulse Matrix Alpha Phase</p>
            <span className="px-4 py-2 border border-red-500/30 text-red-500/60 text-[9px] font-bold uppercase tracking-widest block hover:bg-red-500 hover:text-white transition-all cursor-pointer">Purge Matrix Cache</span>
         </section>
      </div>
    </div>
  </div>
);

const IconBySymbol = ({ symbol }: { symbol: string }) => {
  switch (symbol) {
    case 'BTC': return <Zap className="w-full h-full text-orange-400" />;
    case 'BASE': return <Box className="w-full h-full text-blue-600" />;
    case 'SOL': return <Sparkles className="w-full h-full text-purple-400" />;
    case 'ORDI': return <Cpu className="w-full h-full text-orange-500" />;
    case 'MYCO': return <Zap className="w-full h-full text-myco-accent" />;
    case 'XAU': return <Coins className="w-full h-full text-yellow-500" />;
    default: return <BarChart3 className="w-full h-full text-dim" />;
  }
};

// --- MAIN APP ---

export default function App() {
  const [activeTab, setActiveTab] = useState('Pulse');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [aiInsight, setAiInsight] = useState<string>("SYNCHRONIZING MINDEX REALM PROPOSALS... [READY]");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [layouts, setLayouts] = useState<any>(initialLayouts);
  
  // Real-Time Data Hook
  const { tickers, history, whales, episodes, streamStats, configStatus, loading } = useRealTimeData();

  const assetTickers = useMemo(() => tickers.map(tickerToAssetRow), [tickers]);
  const tickerGroups = useMemo(
    () => mergeTickerGroupsWithStudio(buildTickerGroups(tickers)),
    [tickers]
  );

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  const getAiPulse = async () => {
    setIsAiLoading(true);
    try {
      const status = configStatus ?? (await fetchPulseConfigStatus());
      const keys = status?.configured ?? {};
      const live = [
        keys.MAS_API_URL && "MAS",
        keys.MINDEX_API_URL && "MINDEX",
        keys.FINNHUB_API_KEY && "MARKETS",
        keys.GNEWS_API_KEY || keys.NEWS_API_KEY ? "NEWS" : null,
        keys.PODCAST_RSS_URLS && "PODCAST",
      ].filter(Boolean);
      setAiInsight(
        live.length
          ? `LIVE FEEDS: ${live.join(" · ")}. STUDIO PRESETS FILL GAPS UNTIL CODEX WIRING.`
          : STUDIO_ORACLE_INSIGHT
      );
    } catch {
      setAiInsight(STUDIO_ORACLE_INSIGHT);
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(getAiPulse, 1000);
    return () => clearTimeout(timer);
  }, []);

  const onLayoutChange = (currentLayout: any, allLayouts: any) => {
    setLayouts(allLayouts);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Pulse': return <PulseDashboard aiInsight={aiInsight} layouts={layouts} setLayouts={setLayouts} onLayoutChange={onLayoutChange} setActiveTab={setActiveTab} tickerGroups={tickerGroups} chartData={history.length > 0 ? history : EMPTY_CHART_DATA} whales={whales} loading={loading} />;
      case 'DAO': return <DAOView setActiveTab={setActiveTab} />;
      case 'Markets': return <MarketView assets={assetTickers} />;
      case 'Trade': return <TradeView prices={assetTickers} chartData={history.length > 0 ? history : EMPTY_CHART_DATA} whales={whales} />;
      case 'News': return <NewsView />;
      case 'Podcasts': return <PodcastView />;
      case 'FungIP': return <FungIPView />;
      case 'Learn': return <LearnView />;
      case 'MYCO': return <TokenomicsView setActiveTab={setActiveTab} />;
      case 'Settings': return <SettingsView isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-black relative text-white selection:bg-myco-accent/30 selection:text-white">
      {/* Sidebar - Terminal Rail */}
      <aside className="w-16 md:w-56 shrink-0 border-r border-white/5 flex flex-col transition-all duration-300 z-50 bg-[#050505]">
        <div className="p-6 border-b border-white/5 flex items-center justify-center md:justify-start gap-4">
          <div className="size-10 glass-bento flex items-center justify-center bg-myco-accent shadow-[0_0_20px_rgba(0,255,136,0.3)] shrink-0">
             <Zap className="size-6 text-black fill-black" />
          </div>
          <span className="hidden md:block text-xl font-black tracking-tighter leading-none">PULSE</span>
        </div>
        <div className="flex-1 py-8 flex flex-col">
          <nav className="flex-1 space-y-1">
            <NavItem icon={LayoutDashboard} label="Pulse" active={activeTab === 'Pulse'} onClick={() => setActiveTab('Pulse')} />
            <NavItem icon={Users} label="DAO" active={activeTab === 'DAO'} onClick={() => setActiveTab('DAO')} />
            <NavItem icon={TrendingUp} label="Markets" active={activeTab === 'Markets'} onClick={() => setActiveTab('Markets')} />
            <NavItem icon={BarChart3} label="Trade" active={activeTab === 'Trade'} onClick={() => setActiveTab('Trade')} />
            <NavItem icon={Globe} label="News" active={activeTab === 'News'} onClick={() => setActiveTab('News')} />
            <NavItem icon={Mic2} label="Podcasts" active={activeTab === 'Podcasts'} onClick={() => setActiveTab('Podcasts')} />
            <NavItem icon={Terminal} label="FungIP" active={activeTab === 'FungIP'} onClick={() => setActiveTab('FungIP')} />
            <NavItem icon={BookOpen} label="Learn" active={activeTab === 'Learn'} onClick={() => setActiveTab('Learn')} />
            <NavItem icon={Coins} label="MYCO" active={activeTab === 'MYCO'} onClick={() => setActiveTab('MYCO')} />
          </nav>
          <div className="p-4 border-t border-white/5">
            <NavItem icon={Settings} label="Settings" active={activeTab === 'Settings'} onClick={() => setActiveTab('Settings')} />
          </div>
        </div>
        <div className="p-4 bg-white/[0.02] hidden md:block">
           <div className="flex flex-col gap-2">
             <div className="flex items-center gap-2">
               <div className="size-1.5 rounded-full bg-myco-accent animate-pulse" />
               <span className="text-[9px] font-bold text-dim uppercase tracking-widest">Oracle Sync</span>
             </div>
             <p className="text-[9px] font-mono leading-relaxed text-myco-accent/60 truncate">
               {aiInsight}
             </p>
           </div>
        </div>
      </aside>

      {/* Main Matrix Container */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#050505]">
        {/* Top Header Rail */}
        <header className="h-16 shrink-0 border-b border-white/5 flex items-center justify-between px-6 bg-[#050505]/80 backdrop-blur-xl z-40">
           <div className="flex items-center gap-10">
              <div className="flex items-center gap-3">
                 <div className="size-2 rounded-full bg-myco-accent shadow-[0_0_8px_var(--color-myco-accent)]" />
                 <span className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-80">Network Matrix Live</span>
              </div>
              <div className="hidden lg:flex items-center gap-8 border-l border-white/5 pl-8">
                 <div className="flex flex-col">
                   <span className="text-[9px] font-bold text-dim uppercase tracking-widest leading-none mb-1">Block Index</span>
                   <span className="text-xs font-mono">18,442,109</span>
                 </div>
                 <div className="flex flex-col">
                   <span className="text-[9px] font-bold text-dim uppercase tracking-widest leading-none mb-1">Compute Unit</span>
                   <span className="text-xs font-mono">5,000 LAMPS</span>
                 </div>
                 <div className="flex flex-col">
                   <span className="text-[9px] font-bold text-dim uppercase tracking-widest leading-none mb-1">Matrix Stability</span>
                   <span className="text-xs font-mono text-myco-accent">98.42%</span>
                 </div>
              </div>
           </div>

           <div className="flex items-center gap-6">
              <a 
                href="https://app.realms.today/dao/At93fiCMzEkZWBAHxSNjfk7zUHnF3JcxyCyPjZELjK9Y/treasury/v2"
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-end group"
              >
                 <span className="text-[9px] font-bold text-dim uppercase tracking-widest leading-none mb-1 group-hover:text-myco-accent transition-colors">MYCO DAO TREASURY</span>
                 <span className="text-sm font-bold tracking-tighter group-hover:text-white">Real-Time Realm Sync <ExternalLink className="inline size-2.5 ml-1 opacity-40" /></span>
              </a>
              
              <button className="px-6 h-10 border border-myco-accent bg-myco-accent/10 text-myco-accent font-bold uppercase tracking-widest text-[10px] hover:bg-myco-accent hover:text-black transition-all">
                Phantom Connected
              </button>

              <div className="flex gap-2 border-l border-white/5 pl-6">
                 <button className="size-8 glass-bento flex items-center justify-center hover:bg-white/5 text-dim transition-all">
                   <Lock className="w-3.5 h-3.5" />
                 </button>
                 <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="size-8 glass-bento flex items-center justify-center hover:bg-myco-accent hover:text-black hover:border-myco-accent transition-all"
                 >
                   {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                 </button>
              </div>
              <div className="size-10 rounded-full overflow-hidden border border-white/10 hover:ring-2 ring-myco-accent transition-all cursor-pointer">
                 <img src="https://picsum.photos/seed/cyber/100/100" className="opacity-80 grayscale" referrerPolicy="no-referrer" />
              </div>
           </div>
        </header>

        {/* View Port */}
        {renderContent()}

        {/* Global Feedback Elements */}
        <div className="scanline" />
      </main>
    </div>
  );
}
