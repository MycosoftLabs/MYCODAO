import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FungIPView } from './components/FungIPView';
import {
  MYCOPOD_COVER_URL,
  MYCOPOD_HOST_BIOS,
  MYCOPOD_SEASON_ONE_GUIDE,
  MYCOPOD_SHOW,
} from './data/mycopodShow';
import { 
  BarChart3, 
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
  FlaskConical,
  Stethoscope,
  Terminal,
  LineChart,
  PieChart,
  Wifi,
  Radio,
  Users,
  ExternalLink,
  Wallet,
  History,
  Plus,
  Minus,
  Video,
  Compass,
  Bell,
  Bot,
  Rss,
  BrainCircuit,
  Shield,
  PanelRightOpen
} from 'lucide-react';
import { cn } from './lib/utils';
import { mycodaoBlackLogo, mycodaoColorLogo } from './lib/brandLogos';
import { RealmsDaoHub } from './components/RealmsDaoHub';
import { CommunityView } from './components/CommunityView';
import { LearnAcademy } from './components/learn/LearnAcademy';
import { MycoTerminalView } from './components/MycoTerminalView';
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
import { PulseTabViewport } from './components/PulseTabViewport';
import { NewsPersistentPlayerShell } from './components/NewsPersistentPlayerShell';
import { ProducerDashboard } from './components/ProducerDashboard';
import { PodcastMediaPlayer } from './components/PodcastMediaPlayer';
import { PulseMarqueeTicker, newsToTickerSegments } from './components/PulseMarqueeTicker';
import { MatrixSwap } from './components/MatrixSwap';
import { WhaleWatch } from './components/WhaleWatch';
import { logToSupabase } from './lib/supabase';
import { useRealTimeData } from './hooks/useRealTimeData';
import { prefetchPulseNewsBundle } from './lib/pulseNewsPrefetch';
import { formatMarketCapUsd, useChainStats } from './hooks/useChainStats';
import { fetchLiquidityPools } from './services/apiService';
import { WalletDisplay } from './components/WalletDisplay';
import { TradeHistory } from './components/TradeHistory';
import {
  EMPTY_CHART_DATA,
  tickerToAssetRow,
  buildTickerGroups,
  type TickerGroups,
} from './lib/tickerDisplay';
import type {
  PulseCalendarEvent,
  PulseLearnModule,
  PulseNewsItem,
  PulsePodcastEpisode,
  PulseResearchItem,
  PulseTicker,
  PulseMycoSnapshot,
} from './lib/pulseApi';
import { buildOracleSyncInsight } from './lib/oracleSyncInsight';
import { TradeMarketWidgets } from './components/TradeMarketWidgets';
import {
  BiobankWidget,
  FungalLibraryWidget,
  MycoPodWidget,
  ResearchFeedWidget,
  ScienceHeadlinesWidget,
  ScienceLearnWidget,
  ScienceProgramsWidget,
  SpeciesRewardsWidget,
} from './components/PulseScienceWidgets';
import { PulseBottomNav, PulseSidebarNav, PulseMobileBrandPair, type PulseTabId } from './components/PulseShellNav';
import { handleMobileNewsPointerDown } from './lib/mobileNewsGestureUnlock';
import { FundingProjectsTab } from './components/FundingProjectsTab';
import { PulseHeroFeed } from './components/PulseHeroFeed';
import { ScienceMarketsWidget } from './components/ScienceMarketsWidget';
import { PulseMycoWidget } from './components/PulseMycoWidget';
import { clearQueryPrefix, readQuery, writeQuery } from './lib/spaQuery';
import { isOneOf } from './lib/mycodaoV1Labels';
import { ResearchView } from './components/ResearchView';
import { TissueView } from './components/TissueView';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useDaoWallet } from './hooks/useDaoWallet';

// Handle RGL ESM/CJS interop
const Grid = (RGL as any).default || RGL;
const ResponsiveGridLayout = Grid.WidthProvider(Grid.Responsive);
const PulseResponsiveGrid = Grid.Responsive;
const PULSE_FEED_OPEN_KEY = "mycodao.pulse.feedOpen.v1";

type GridItem = { i: string; w: number; h: number; x?: number; y?: number };

function pairGridLayout(items: GridItem[], cols: number, h: number) {
  const half = Math.floor(cols / 2);
  return items.map((item, index) => ({
    ...item,
    x: (index % 2) * half,
    y: Math.floor(index / 2) * h,
    w: half,
    h,
  }));
}

function stackGridLayout(items: GridItem[], cols: number, h: number) {
  return items.map((item, index) => ({ ...item, x: 0, y: index * h, w: cols, h }));
}

function gridColsForWidth(width: number): number {
  if (width >= 1200) return 12;
  if (width >= 996) return 6;
  if (width >= 768) return 3;
  return 1;
}

const lgLayout: GridItem[] = [
    { i: 'science_markets', x: 0, y: 0, w: 6, h: 5 },
    { i: 'research', x: 6, y: 0, w: 6, h: 5 },

    { i: 'species_rewards', x: 0, y: 5, w: 3, h: 5 },
    { i: 'biobank', x: 3, y: 5, w: 3, h: 5 },
    { i: 'fungal_library', x: 6, y: 5, w: 3, h: 5 },
    { i: 'mycopod', x: 9, y: 5, w: 3, h: 5 },

    { i: 'programs', x: 0, y: 10, w: 6, h: 5 },
    { i: 'learn', x: 6, y: 10, w: 6, h: 5 },
    { i: 'science_news', x: 0, y: 15, w: 12, h: 4 },
];

const initialLayouts = {
  lg: lgLayout,
  md: pairGridLayout(lgLayout, 6, 3),
  sm: stackGridLayout(lgLayout, 3, 2),
  xs: stackGridLayout(lgLayout, 1, 1),
  xxs: stackGridLayout(lgLayout, 1, 1),
};

// --- TERMINAL COMPONENTS ---

const WidgetWrapper = ({ children, title, onToggleFull, isFull, id }: any) => {
  const layoutLocked = useMediaQuery('(max-width: 767px)');

  return (
    <div className={cn(
      "w-full h-full glass-bento flex flex-col overflow-hidden group relative rounded-none transition-all duration-300",
      isFull ? "border-myco-accent shadow-[0_0_20px_rgba(0,255,136,0.15)] z-10" : ""
    )}>
      <div className={cn(
        "flex items-center justify-between p-3 border-b border-[var(--myco-border)] bg-[var(--myco-card)]/80",
        !layoutLocked && "drag-handle cursor-grab active:cursor-grabbing"
      )}>
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="w-3 h-3 text-myco-accent shrink-0" />
          <h3 className="text-[10px] font-bold text-dim uppercase tracking-widest truncate">{title}</h3>
        </div>
        {!layoutLocked ? (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onToggleFull(id)}
              className="p-1 hover:text-myco-accent text-dim transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
              aria-label={isFull ? 'Restore widget size' : 'Expand widget'}
            >
              {isFull ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            </button>
          </div>
        ) : null}
      </div>
      <div className="flex-1 p-3 overflow-y-auto no-scrollbar relative touch-pan-y min-h-0">
        {children}
      </div>
    </div>
  );
};

// --- SUB-VIEWS ---

interface PulseDashboardProps {
  layouts: any;
  setLayouts: (layouts: any) => void;
  onLayoutChange: (currentLayout: any, allLayouts: any) => void;
  setActiveTab: (tab: PulseTabId) => void;
  onOpenProject: (slug: string) => void;
  news: PulseNewsItem[];
  episodes: PulsePodcastEpisode[];
  research: PulseResearchItem[];
  learnModules: PulseLearnModule[];
  tickers: PulseTicker[];
  loading: boolean;
}

const PulseDashboard = ({
  layouts,
  setLayouts,
  onLayoutChange,
  setActiveTab,
  onOpenProject,
  news,
  episodes,
  research,
  learnModules,
  tickers,
  loading,
}: PulseDashboardProps) => {
  const [fullWidget, setFullWidget] = useState<string | null>(null);
  const [savedLayouts, setSavedLayouts] = useState<any>(null);
  const pulseGridRef = useRef<HTMLDivElement>(null);
  const pulseGridColRef = useRef<HTMLDivElement>(null);
  const [pulseGridWidth, setPulseGridWidth] = useState(0);
  const [isFeedOpen, setIsFeedOpen] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(PULSE_FEED_OPEN_KEY) === "1"
  );

  const setFeedOpen = (open: boolean) => {
    setIsFeedOpen(open);
    window.localStorage.setItem(PULSE_FEED_OPEN_KEY, open ? "1" : "0");
  };

  useEffect(() => {
    const el = pulseGridColRef.current;
    if (!el) return;
    const update = () => setPulseGridWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pulseGridCols = gridColsForWidth(
    pulseGridWidth || (typeof window !== "undefined" ? window.innerWidth : 1200)
  );
  const pulseRowHeight =
    pulseGridWidth >= 1200
      ? 80
      : Math.max(72, Math.floor(pulseGridWidth / Math.max(1, pulseGridCols)));

  const isTouchPulse = pulseGridWidth > 0 && pulseGridWidth < 768;

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
             const growW = bp === 'lg' ? 12 : bp === 'md' ? 6 : bp === 'sm' ? 3 : 1;
             return { ...item, x: 0, y: 0, w: growW, h: 8 };
          }
          return item;
        });
      });
      setLayouts(newLayouts);
      setFullWidget(id);
    }
  };

  const widget = (id: string, title: string, body: React.ReactNode) => (
    <div key={id}>
      <WidgetWrapper title={title} id={id} onToggleFull={toggleFull} isFull={fullWidget === id}>
        {body}
      </WidgetWrapper>
    </div>
  );

  return (
    <div className="flex-1 relative overflow-hidden flex flex-col pulse-view-surface">
      {loading && !isTouchPulse ? (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-myco-accent overflow-hidden z-[100]">
          <div className="h-full bg-white/40 animate-[loading_1s_infinite]" style={{ width: '40%' }} />
        </div>
      ) : null}
      <div
        ref={pulseGridRef}
        className={cn(
          "flex-1 overflow-y-auto no-scrollbar pb-6 lg:pb-24 min-h-0 touch-pan-y",
          isTouchPulse && "pulse-grid-touch"
        )}
      >
        <div className="flex flex-col gap-3 p-3 md:px-4 lg:flex-row lg:items-start">
          {isFeedOpen ? (
            <aside
              aria-label="What's happening now"
              className="order-1 h-[22rem] shrink-0 lg:sticky lg:top-3 lg:order-2 lg:h-[calc(100dvh-7rem)] lg:w-[340px] xl:w-[380px]"
            >
              <PulseHeroFeed onOpenProject={onOpenProject} onCollapse={() => setFeedOpen(false)} />
            </aside>
          ) : (
            <button
              type="button"
              onClick={() => setFeedOpen(true)}
              aria-expanded={false}
              aria-label="Expand What's happening now"
              className="order-1 flex min-h-[44px] shrink-0 items-center justify-between gap-2 border border-white/10 bg-black/40 px-3 text-[10px] font-black uppercase tracking-widest text-white/80 hover:border-myco-accent/40 hover:text-myco-accent touch-manipulation lg:sticky lg:top-3 lg:order-2 lg:h-[calc(100dvh-7rem)] lg:w-11 lg:flex-col lg:justify-start lg:px-0 lg:py-3"
            >
              <PanelRightOpen className="size-4 shrink-0" aria-hidden="true" />
              <span className="flex items-center gap-2 lg:[writing-mode:vertical-rl]">
                <span className="size-1.5 rounded-full bg-myco-accent animate-pulse" aria-hidden="true" />
                What&apos;s happening now
              </span>
            </button>
          )}
          <div ref={pulseGridColRef} className="order-2 min-w-0 flex-1 lg:order-1">
            <PulseMycoWidget onOpenMyco={() => setActiveTab('MYCO')} />
        <PulseResponsiveGrid
          className="layout"
          width={pulseGridWidth || 1200}
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 6, sm: 3, xs: 1, xxs: 1 }}
          rowHeight={pulseRowHeight}
          draggableHandle=".drag-handle"
          isDraggable={!isTouchPulse}
          isResizable={!isTouchPulse}
          margin={[0, 0]}
          containerPadding={[0, 0]}
          onLayoutChange={onLayoutChange}
        >
          {widget('science_markets', 'Science markets', <ScienceMarketsWidget tickers={tickers} onOpenTrade={() => setActiveTab('Trade')} />)}
          {widget('research', 'New research', <ResearchFeedWidget research={research} />)}
          {widget('species_rewards', 'Species rewards', <SpeciesRewardsWidget onOpenFungIP={() => setActiveTab('FungIP')} />)}
          {widget('biobank', 'Biobank holdings', <BiobankWidget onOpenTissue={() => setActiveTab('Tissue')} />)}
          {widget('fungal_library', 'Fungal library', <FungalLibraryWidget onOpenFungIP={() => setActiveTab('FungIP')} />)}
          {widget('programs', 'Science programs', <ScienceProgramsWidget onOpenResearch={() => setActiveTab('Research')} />)}
          {widget('mycopod', 'MycoPOD', <MycoPodWidget episodes={episodes} onOpenPodcasts={() => setActiveTab('Podcasts')} />)}
          {widget('learn', 'Learn: fungi & biology', <ScienceLearnWidget learnModules={learnModules} onOpenLearn={() => setActiveTab('Learn')} />)}
          {widget('science_news', 'Science headlines', <ScienceHeadlinesWidget news={news} onOpenNews={() => setActiveTab('News')} />)}
        </PulseResponsiveGrid>
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
    <div className="flex flex-col">
      <div className="flex gap-2 md:gap-3 mb-4 shrink-0 overflow-x-auto no-scrollbar pb-1">
        {['ALL', 'SOL', 'BTC', 'DESCI', 'MYCO', 'XSTOCK', 'DEFI'].map(t => (
          <button 
            key={t} 
            type="button"
            onClick={() => setFilter(t)}
            className={cn(
              "px-3 md:px-5 min-h-[44px] shrink-0 glass-bento text-[10px] font-bold tracking-widest uppercase transition-all touch-manipulation",
              filter === t ? "bg-myco-accent text-black border-myco-accent" : "hover:bg-myco-accent hover:text-black hover:border-myco-accent"
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="glass-bento p-0 overflow-hidden flex flex-col border-white/5">
        <div className="hidden md:grid grid-cols-12 p-3 md:p-4 border-b border-white/10 text-[10px] font-bold uppercase tracking-widest opacity-50 bg-black/40">
          <span className="col-span-4 lg:col-span-3">Instrument</span>
          <span className="col-span-2 text-right">Price</span>
          <span className="col-span-2 text-right">24H</span>
          <span className="hidden lg:block col-span-2 text-right">Market Cap</span>
          <span className="col-span-4 lg:col-span-3 text-right">Volume</span>
        </div>
        <div className="max-h-[65vh] overflow-y-auto no-scrollbar">
          {filteredAssets.length === 0 && (
            <div className="p-12 text-center text-dim text-[11px] uppercase tracking-widest">
              No market data — /api/tickers returned empty. Configure FINNHUB_API_KEY or CoinGecko on VM.
            </div>
          )}
          {filteredAssets.map((a, i) => (
            <div key={i} className="flex flex-col border-b border-white/5 group">
              <div 
                role="button"
                tabIndex={0}
                onClick={() => setExpandedAsset(expandedAsset === a.symbol ? null : a.symbol)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setExpandedAsset(expandedAsset === a.symbol ? null : a.symbol);
                  }
                }}
                className="grid grid-cols-12 p-3 md:p-4 hover:bg-white/[0.02] transition-colors items-center cursor-pointer gap-2"
              >
                <div className="col-span-12 md:col-span-4 lg:col-span-3 flex items-center gap-3 min-w-0">
                  <div className="size-8 glass-bento flex items-center justify-center p-2 bg-white/[0.03] shrink-0">
                    <IconBySymbol symbol={a.symbol} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold tracking-tight text-white mb-0.5 truncate">{a.symbol}</span>
                    <span className="text-[8px] font-bold text-dim uppercase tracking-widest">{a.type}</span>
                  </div>
                  <div className="ml-auto flex items-center gap-3 md:hidden">
                    <span className="font-mono font-medium text-sm text-white/90">{a.price}</span>
                    <span className={cn("font-bold text-xs", a.up ? "text-myco-accent" : "text-red-500")}>{a.change}</span>
                    <ChevronRight className={cn("size-4 text-dim transition-transform shrink-0", expandedAsset === a.symbol ? "rotate-90" : "")} />
                  </div>
                </div>
                <span className="hidden md:block col-span-2 text-right font-mono font-medium text-sm text-white/90">{a.price}</span>
                <span className={cn("hidden md:block col-span-2 text-right font-bold text-xs", a.up ? "text-myco-accent" : "text-red-500")}>
                  {a.change}
                </span>
                <span className="hidden lg:block col-span-2 text-right text-[10px] font-mono text-dim tracking-tighter">{a.mcap}</span>
                <div className="hidden md:flex col-span-4 lg:col-span-3 justify-end items-center gap-2 lg:gap-4">
                  <div className="h-8 w-16 lg:w-24 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={EMPTY_CHART_DATA}>
                        <Area type="monotone" dataKey="value" stroke={a.up ? "#00ff88" : "#ef4444"} fillOpacity={1} fill={a.up ? "rgba(0,255,136,0.05)" : "rgba(239,68,68,0.05)"} strokeWidth={1.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <ChevronRight className={cn("size-4 text-dim transition-transform shrink-0", expandedAsset === a.symbol ? "rotate-90" : "")} />
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
                    <div className="p-4 md:p-8 grid grid-cols-12 gap-4 md:gap-8">
                      <div className="col-span-12 lg:col-span-6 space-y-6">
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
                      </div>
                      
                      <div className="col-span-12 lg:col-span-6 space-y-4">
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

const SwapActivitySection = () => {
  const [liquidityPools, setLiquidityPools] = useState<any[]>([]);

  useEffect(() => {
    const loadPools = async () => {
      const pools = await fetchLiquidityPools();
      setLiquidityPools(pools);
    };
    loadPools();
    const interval = setInterval(loadPools, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 p-3 md:p-4 lg:p-6 overflow-hidden flex flex-col bg-[#050505] gap-4 md:gap-8 min-h-0">
      <div className="max-w-[1700px] mx-auto w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
         <div className="flex flex-col">
            <div className="flex items-center gap-3">
               <div className="size-4 bg-myco-accent border border-myco-accent/20 flex items-center justify-center p-0.5">
                  <Terminal className="text-black size-full" />
               </div>
               <h2 className="text-xl md:text-3xl font-black text-white uppercase tracking-tighter">Market Terminal</h2>
            </div>
            <div className="flex items-center gap-2 mt-1">
               <div className="size-1.5 bg-myco-accent rounded-full animate-pulse shadow-[0_0_8px_rgba(30,255,188,0.5)]" />
               <span className="text-[10px] font-bold text-dim uppercase tracking-[0.4em]">Swap</span>
            </div>
         </div>
         <WalletDisplay />
      </div>

      <div className="flex-1 grid grid-cols-12 gap-4 md:gap-8 max-w-[1700px] mx-auto w-full overflow-y-auto no-scrollbar min-h-0 pb-4 md:pb-8">
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
                      <h2 className="text-xl font-black tracking-tighter uppercase text-white">Large transfers</h2>
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

type TradeSection = 'markets' | 'swap';

const TRADE_SECTIONS: { id: TradeSection; label: string }[] = [
  { id: 'markets', label: 'Markets' },
  { id: 'swap', label: 'Swap & activity' },
];

interface TradeViewProps {
  assets: ReturnType<typeof tickerToAssetRow>[];
  tickers: PulseTicker[];
  tickerGroups: TickerGroups;
  mycoSnapshot: PulseMycoSnapshot | null;
  chartData: { time: string; price: number; volume?: number }[];
  calendar: PulseCalendarEvent[];
  fearGreed: { value: number; classification: string } | null;
  news: PulseNewsItem[];
  onOpenMyco: () => void;
}

const TradeView = ({
  assets,
  tickers,
  tickerGroups,
  mycoSnapshot,
  chartData,
  calendar,
  fearGreed,
  news,
  onOpenMyco,
}: TradeViewProps) => {
  const [section, setSection] = useState<TradeSection>('markets');

  useEffect(() => {
    logToSupabase({ type: 'SYSTEM', message: 'User entered Matrix/Whale Trade View' });
  }, []);

  const tapeItems = useMemo(
    () => [
      ...tickerGroups.crypto,
      ...tickerGroups.metals,
      ...tickerGroups.commodities,
      ...tickerGroups.bio,
      ...tickerGroups.tech,
      ...tickerGroups.business,
      ...tickerGroups.indicators,
    ].filter((t) => t.p && t.p !== '—'),
    [tickerGroups]
  );
  const tapeSegments = useMemo(() => newsToTickerSegments(news, tapeItems), [news, tapeItems]);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#050505]">
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center gap-3 px-3 md:px-4 lg:px-6 pt-3 md:pt-4">
        <h1 className="text-lg md:text-2xl font-black text-white uppercase tracking-tighter">Trade</h1>
        <div role="tablist" aria-label="Trade sections" className="flex border border-white/10 divide-x divide-white/10 self-start">
          {TRADE_SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={section === s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                "min-h-[44px] px-4 text-[10px] font-black uppercase tracking-widest touch-manipulation transition-colors",
                section === s.id ? "bg-myco-accent text-black" : "text-dim hover:text-white hover:bg-white/5"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {section === 'markets' ? (
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 md:p-4 lg:p-6 flex flex-col gap-6 pb-8">
          <MarketView assets={assets} />
          <TradeMarketWidgets
            tickerGroups={tickerGroups}
            tickers={tickers}
            mycoSnapshot={mycoSnapshot}
            chartData={chartData}
            calendar={calendar}
            fearGreed={fearGreed}
            onOpenMyco={onOpenMyco}
          />
        </div>
      ) : (
        <SwapActivitySection />
      )}

      <PulseMarqueeTicker
        items={tapeSegments.length ? undefined : tapeItems}
        segments={tapeSegments.length ? tapeSegments : undefined}
      />
    </div>
  );
};

const PodcastView = ({
  episodes: episodesProp = [] as PulsePodcastEpisode[],
}: {
  episodes?: PulsePodcastEpisode[];
}) => {
  const [episodes, setEpisodes] = useState<PulsePodcastEpisode[]>(episodesProp);
  const [loading, setLoading] = useState(episodesProp.length === 0);
  const [selectedEpisode, setSelectedEpisode] = useState<PulsePodcastEpisode | null>(null);

  useEffect(() => {
    setEpisodes(episodesProp);
    if (episodesProp.length) setLoading(false);
  }, [episodesProp]);

  useEffect(() => {
    if (episodesProp.length) return;
    const fetchPodcastData = async () => {
      try {
        const res = await fetch('/api/podcasts', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setEpisodes(Array.isArray(data) ? data : []);
        } else {
          setEpisodes([]);
        }
      } catch (e) {
         console.error('Error fetching podcast data', e);
         setEpisodes([]);
      } finally {
         setLoading(false);
      }
    };
    fetchPodcastData();
    const interval = setInterval(fetchPodcastData, 60000);
    return () => clearInterval(interval);
  }, [episodesProp.length]);

  useEffect(() => {
    if (!selectedEpisode && episodes.length > 0) return;
    if (selectedEpisode && !episodes.some((ep) => ep.id === selectedEpisode.id)) {
      setSelectedEpisode(null);
    }
  }, [episodes, selectedEpisode]);

  return (
    <div className="flex flex-col flex-1 min-h-full pulse-view-surface p-3 md:p-4 lg:p-6 gap-3 md:gap-4 lg:pb-8">
      <div className="flex flex-col flex-1 min-h-full lg:grid lg:grid-cols-12 lg:min-h-0 gap-3 md:gap-4 lg:gap-6 relative">
        <div className="col-span-12 lg:col-span-5 xl:col-span-6 glass-bento relative flex flex-col overflow-hidden border-white/5 min-h-0 max-lg:flex-1 max-lg:shrink-0">
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent pointer-events-none z-10" />
          <img
            src={episodes[0]?.image || MYCOPOD_COVER_URL}
            alt=""
            className="absolute inset-0 size-full object-cover opacity-15 hidden sm:block"
            referrerPolicy="no-referrer"
          />
          <div className="relative z-20 p-3 sm:p-4 md:p-5 lg:p-6 flex flex-col flex-1 min-h-0 gap-2">
            <section className="shrink-0" aria-label="Episode player">
              <PodcastMediaPlayer
                episode={selectedEpisode}
                layout="square"
                idlePresentation="cover"
                className="mb-1.5 sm:mb-2"
              />
            </section>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF5C39] text-white text-[10px] font-black uppercase tracking-tighter min-h-[44px]">
                <Wifi className="w-3 h-3 shrink-0" /> MYCOPOD RSS
              </span>
              <a
                href={MYCOPOD_SHOW.rssUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-white/5 border border-white/10 text-white/80 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 min-h-[44px] hover:bg-white/10 touch-manipulation"
              >
                <Rss className="w-3 h-3 shrink-0" /> Feed
              </a>
            </div>

            <div className="flex-1 min-h-0 flex flex-col justify-end overflow-hidden gap-1">
              <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF5C39] line-clamp-1">
                {MYCOPOD_SHOW.subtitle}
              </p>
              <h1 className="text-base sm:text-3xl lg:text-4xl font-black tracking-tighter text-white leading-none line-clamp-2 sm:line-clamp-none">
                {MYCOPOD_SHOW.title.toUpperCase()}
              </h1>
              <p className="text-[11px] sm:text-base font-bold text-myco-accent line-clamp-1 sm:line-clamp-2">
                {MYCOPOD_SHOW.tagline}
              </p>
              <p className="hidden md:block text-[11px] sm:text-sm text-white/70 leading-snug max-w-2xl line-clamp-2 lg:line-clamp-none">
                {MYCOPOD_SHOW.about}
              </p>

              {episodes[0] ? (
                <div className="flex items-center gap-2 shrink-0 min-h-0">
                  <span className="flex items-center gap-1.5 px-2 py-1 bg-red-500 text-white text-[9px] font-bold uppercase shrink-0">
                    <Radio className="w-3 h-3" /> Latest
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-white/80 line-clamp-1 min-w-0">
                    {episodes[0].title}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-1 bg-white/10 text-white text-[9px] font-bold uppercase shrink-0">
                    Season 1
                  </span>
                  <span className="text-[10px] font-bold text-dim line-clamp-1">
                    {loading ? 'Loading feed…' : 'Episodes publishing to RSS soon'}
                  </span>
                </div>
              )}
            </div>

            <a
              href={MYCOPOD_SHOW.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] w-full bg-myco-accent text-black font-black uppercase tracking-widest text-xs hover:translate-y-[-2px] transition-all shadow-[0_5px_15px_rgba(0,255,136,0.3)] touch-manipulation"
            >
              <ExternalLink className="w-4 h-4 shrink-0" /> MycoDAO.com
            </a>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-7 xl:col-span-6 flex flex-col gap-3 md:gap-4 max-lg:shrink-0 max-lg:overflow-visible lg:min-h-0 lg:overflow-hidden">
          <div className="glass-bento p-4 border-white/5 bg-black/40 flex flex-col gap-3 shrink-0">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-myco-accent">Hosts</h3>
            {MYCOPOD_HOST_BIOS.map((host) => (
              <div key={host.name} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
                <p className="text-xs font-bold text-white">{host.name}</p>
                <p className="text-[9px] font-bold uppercase text-dim tracking-wide mb-1">{host.role}</p>
                <p className="text-[10px] text-white/60 leading-snug">{host.bio}</p>
              </div>
            ))}
          </div>

          <div className="glass-bento border-white/5 flex flex-col overflow-hidden bg-black/40 lg:flex-1 lg:min-h-0 max-lg:shrink-0">
            <div className="p-3 sm:p-4 border-b border-white/5 flex justify-between items-center bg-[#FF5C39]/5 shrink-0">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[#FF5C39] flex items-center gap-2">
                <Rss className="size-3 shrink-0" />
                {episodes.length > 0 ? 'MycoPOD Episodes' : 'Season 1 Guide'}
              </h3>
            </div>
            <div className="lg:flex-1 lg:overflow-y-auto overflow-x-hidden no-scrollbar p-2 max-lg:overflow-visible">
              {loading ? (
                <div className="h-full flex items-center justify-center p-4 min-h-[120px]">
                  <RefreshCw className="size-5 text-[#FF5C39] animate-spin" />
                </div>
              ) : episodes.length > 0 ? (
                episodes.slice(0, 12).map((ep: PulsePodcastEpisode, i: number) => {
                  const isSelected = selectedEpisode?.id === ep.id;
                  return (
                    <button
                      type="button"
                      key={ep.id ?? i}
                      onClick={() => setSelectedEpisode(ep)}
                      className={cn(
                        'group w-full text-left p-3 sm:p-4 transition-all border-b border-white/5 last:border-0 min-h-[44px] touch-manipulation',
                        isSelected
                          ? 'bg-[#FF5C39]/15 border-l-2 border-l-[#FF5C39]'
                          : 'hover:bg-white/5 border-l-2 border-l-transparent hover:border-l-[#FF5C39]/60'
                      )}
                    >
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <span className="text-[8px] font-bold uppercase tracking-widest text-[#FF5C39] shrink-0">
                          {ep.mediaKind === 'video' ? 'Video' : 'Audio'}
                        </span>
                        <span className="text-[8px] font-bold text-dim">
                          {ep.publishedAt ? new Date(ep.publishedAt).toLocaleDateString() : '—'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white leading-tight mb-2 group-hover:text-[#FF5C39] transition-colors line-clamp-2">
                        {ep.title}
                      </h4>
                      <span className="text-[10px] font-bold uppercase text-dim tracking-widest flex items-center gap-2">
                        <Play className="w-2.5 h-2.5 fill-current text-[#FF5C39]" />{' '}
                        {isSelected ? 'Playing' : 'Play'}
                      </span>
                    </button>
                  );
                })
              ) : (
                MYCOPOD_SEASON_ONE_GUIDE.map((ep) => (
                  <div key={ep.number} className="p-3 border-b border-white/5 last:border-0">
                    <div className="flex gap-2 items-start">
                      <span className="text-[9px] font-black text-[#FF5C39] shrink-0 pt-0.5">E{ep.number}</span>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">{ep.title}</h4>
                        <p className="text-[9px] text-dim mt-1">{ep.focus}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


const LearnView = ({ learnModules = [] as PulseLearnModule[] }: { learnModules?: PulseLearnModule[] }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const modules = learnModules;
  const activeModule = modules[activeIdx];

  if (!modules.length) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-dim text-[11px] uppercase tracking-widest">
        No learn modules — add data/learn-modules.json or /api/learn
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#050505] min-h-0">
       {/* Sidebar Navigation */}
       <div className="w-full lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-white/5 bg-black/40 flex flex-col overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto no-scrollbar max-h-[40vh] lg:max-h-none">
          <div className="p-4 md:p-6 lg:p-8 border-b border-white/5 shrink-0">
             <h2 className="text-lg md:text-xl font-bold tracking-tighter uppercase mb-2">Learn</h2>
             <p className="text-[10px] text-dim font-bold uppercase tracking-[0.2em]">Short guides to fungi, records, and MYCO</p>
          </div>
          <div className="flex-1 py-4">
             {modules.map((m, i) => (
                <button 
                  key={m.id} 
                  onClick={() => setActiveIdx(i)}
                  className={cn(
                    "w-full p-6 text-left border-b border-white/5 flex flex-col gap-2 transition-all",
                    activeIdx === i ? "bg-myco-accent/10 border-l-4 border-l-myco-accent" : "hover:bg-white/[0.02]"
                  )}
                >
                   <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-dim uppercase tracking-widest">{m.level}</span>
                      <span className="text-[8px] font-mono text-dim">{m.readingTimeMin}m</span>
                   </div>
                   <h3 className={cn("text-lg font-bold tracking-tight", activeIdx === i ? "text-myco-accent" : "text-white")}>{m.title}</h3>
                </button>
             ))}
          </div>
       </div>

       {/* Module Content */}
       <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-8 lg:p-12 bg-black/20 min-h-0">
          <div className="max-w-4xl space-y-12">
             <div className="space-y-4 max-w-2xl">
                <div className="flex items-center gap-3">
                   <span className="px-2 py-0.5 bg-myco-accent/10 border border-myco-accent/20 text-[9px] font-bold text-myco-accent uppercase tracking-[0.2em]">{activeModule.level}</span>
                   <span className="text-dim text-[10px] uppercase font-bold tracking-widest">{activeModule.readingTimeMin} min read</span>
                </div>
                <h1 className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tighter uppercase leading-none">{activeModule.title}</h1>
                <p className="text-lg text-dim leading-relaxed">{activeModule.summary}</p>
             </div>

             {activeModule.contentMd ? (
               <div className="prose prose-invert max-w-none space-y-4 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap border-t border-white/5 pt-8">
                 {activeModule.contentMd}
               </div>
             ) : (
               <p className="text-sm text-dim border-t border-white/5 pt-8">Module body not loaded — check /api/learn.</p>
             )}

             {(activeModule.resourceLinks?.length ?? 0) > 0 && (
               <div className="border-t border-white/5 pt-8 space-y-4">
                 <h4 className="text-sm font-black tracking-[0.3em] uppercase">Resources</h4>
                 <ul className="space-y-2">
                   {activeModule.resourceLinks!.map((link) => (
                     <li key={link.href}>
                       <a
                         href={link.href}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="text-sm text-myco-accent hover:underline inline-flex items-center gap-2"
                       >
                         <ExternalLink className="size-3" />
                         {link.label}
                       </a>
                     </li>
                   ))}
                 </ul>
               </div>
             )}
          </div>
       </div>
    </div>
  );
};

const DAOView = () => <RealmsDaoHub />;

const SettingsView = ({ isDarkMode, setIsDarkMode }: any) => (
  <div className="flex-1 p-6 flex items-center justify-center">
    <div className="w-full max-w-xl glass-bento overflow-hidden overflow-y-auto no-scrollbar p-8 md:p-10 space-y-8">
      <div className="flex flex-col gap-1">
        <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-myco-accent">Settings</h3>
        <p className="text-[10px] text-dim">Display preferences for this browser.</p>
      </div>
      <section className="space-y-6">
        <h4 className="text-[10px] font-bold text-dim uppercase tracking-[0.4em] mb-4">Theme</h4>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setIsDarkMode(true)}
            className={cn("flex-1 p-6 min-h-[44px] glass-bento flex flex-col items-center gap-3 transition-all", isDarkMode ? "border-myco-accent ring-1 ring-myco-accent/20 bg-myco-accent/5" : "opacity-40 grayscale")}
          >
            <Moon className="w-8 h-8" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Dark</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDarkMode(false)}
            className={cn("flex-1 p-6 min-h-[44px] glass-bento flex flex-col items-center gap-3 transition-all", !isDarkMode ? "border-myco-accent ring-1 ring-myco-accent/20 bg-myco-accent/5" : "opacity-40 grayscale")}
          >
            <Sun className="w-8 h-8" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Light</span>
          </button>
        </div>
      </section>
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

function useProducerRoute(): boolean {
  const [producerMode, setProducerMode] = useState(false);

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.replace(/^#/, "").toLowerCase();
      const params = new URLSearchParams(window.location.search);
      setProducerMode(hash === "producer" || params.get("producer") === "1");
    };
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  return producerMode;
}

const URL_TAB_IDS: readonly PulseTabId[] = [
  'News', 'Pulse', 'Podcasts', 'DAO', 'Funding', 'Research',
  'Markets', 'Trade', 'FungIP', 'Tissue', 'Learn', 'MYCO', 'Settings',
];

/** `?tab=` → tab id. "Projects" is the public name of the Funding tab; "Markets" maps to Trade. */
function tabFromQuery(): PulseTabId | null {
  const tab = readQuery('tab');
  if (tab === 'Projects') return 'Funding';
  if (!isOneOf(URL_TAB_IDS, tab)) return null;
  return tab === 'Markets' ? 'Trade' : tab;
}

/** Write the tab to the URL and drop query state that belongs to other tabs. */
function syncTabQuery(tab: PulseTabId) {
  const urlTab = readQuery('tab');
  writeQuery({
    tab: urlTab === 'Projects' && tab === 'Funding' ? 'Projects' : tab,
    pillar: tab === 'Pulse' ? readQuery('pillar') : null,
    feed: tab === 'Pulse' ? readQuery('feed') : null,
    project: tab === 'Funding' ? readQuery('project') : null,
  });
  if (tab !== 'Tissue') clearQueryPrefix('tf_');
}

export default function App() {
  const producerMode = useProducerRoute();
  const [activeTab, setActiveTabState] = useState<PulseTabId>(() => tabFromQuery() ?? 'News');
  const setActiveTab = (tab: PulseTabId) => {
    const next = tab === 'Markets' ? 'Trade' : tab;
    setActiveTabState(next);
    syncTabQuery(next);
  };
  const openProject = (slug: string) => {
    setActiveTabState('Funding');
    writeQuery({ tab: 'Funding', pillar: null, feed: null, project: slug }, 'push', { openedFrom: 'Pulse' });
  };

  useEffect(() => {
    const onPopState = () => setActiveTabState(tabFromQuery() ?? 'News');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [layouts, setLayouts] = useState<any>(initialLayouts);
  
  // Real-Time Data Hook
  const {
    tickers,
    mycoSnapshot,
    history,
    whales,
    news,
    episodes,
    calendar,
    research,
    learnModules,
    configStatus,
    fearGreed,
    loading,
  } = useRealTimeData();
  const { stats: chainStats } = useChainStats();
  const daoWallet = useDaoWallet();

  const assetTickers = useMemo(() => tickers.map(tickerToAssetRow), [tickers]);
  const tickerGroups = useMemo(
    () => buildTickerGroups(tickers),
    [tickers]
  );

  const aiInsight = useMemo(
    () =>
      buildOracleSyncInsight({
        loading,
        tickers,
        news,
        episodes,
        calendar,
        research,
        learnModules,
        whales,
        fearGreed,
        chainStats,
      }),
    [
      loading,
      tickers,
      news,
      episodes,
      calendar,
      research,
      learnModules,
      whales,
      fearGreed,
      chainStats,
    ]
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

  useEffect(() => {
    void prefetchPulseNewsBundle();
  }, []);

  const onLayoutChange = (currentLayout: any, allLayouts: any) => {
    setLayouts(allLayouts);
  };

  if (producerMode) {
    return (
      <ProducerDashboard
        onExit={() => {
          const url = new URL(window.location.href);
          url.hash = "";
          url.searchParams.delete("producer");
          window.history.replaceState({}, "", url.pathname + url.search);
          window.dispatchEvent(new HashChangeEvent("hashchange"));
        }}
      />
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'Pulse': return <PulseDashboard layouts={layouts} setLayouts={setLayouts} onLayoutChange={onLayoutChange} setActiveTab={setActiveTab} onOpenProject={openProject} news={news} episodes={episodes} research={research} learnModules={learnModules} tickers={tickers} loading={loading} />;
      case 'DAO': return <CommunityView learn={<LearnAcademy initialModules={learnModules} />} />;
      case 'Markets':
      case 'Trade': return (
        <TradeView
          assets={assetTickers}
          tickers={tickers}
          tickerGroups={tickerGroups}
          mycoSnapshot={mycoSnapshot}
          chartData={history.length > 0 ? history : EMPTY_CHART_DATA}
          calendar={calendar}
          fearGreed={fearGreed}
          news={news}
          onOpenMyco={() => setActiveTab('MYCO')}
        />
      );
      case 'News': return null;
      case 'Podcasts': return <PodcastView episodes={episodes} />;
      case 'Funding': return (
        <FundingProjectsTab
          mycoSnapshot={mycoSnapshot}
          onNavigateTab={(tab, focus) => {
            if (focus) {
              try {
                sessionStorage.setItem('pulse-market-focus', focus);
              } catch {
                /* ignore */
              }
            }
            setActiveTab(tab);
          }}
        />
      );
      case 'Research': return <ResearchView research={research} loading={loading} />;
      case 'FungIP': return <FungIPView setActiveTab={setActiveTab} />;
      case 'Tissue': return <TissueView />;
      case 'Learn': return <CommunityView initialSection="learn" learn={<LearnAcademy initialModules={learnModules} />} />;
      case 'MYCO': return <MycoTerminalView setActiveTab={(tab) => setActiveTab(tab as PulseTabId)} />;
      case 'Settings': return <SettingsView isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />;
      default: return null;
    }
  };

  return (
    <NewsPersistentPlayerShell activeTab={activeTab} setActiveTab={setActiveTab}>
    <div
      className={cn(
        "flex min-h-dvh h-dvh overflow-hidden relative selection:bg-myco-accent/30 selection:text-white",
        activeTab === "News" ? "bg-transparent" : "pulse-view-surface",
      )}
    >
      <PulseSidebarNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        aiInsight={aiInsight}
      />

      {/* Main Matrix Container */}
      <main
        className={cn(
          "flex-1 flex flex-col relative overflow-hidden min-w-0 pulse-content-pad",
          activeTab === "News" ? "bg-transparent" : "pulse-view-surface",
        )}
      >
        {/* Top Header Rail */}
        <header className="shrink-0 border-b border-[var(--myco-border)] flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 lg:px-6 py-2 min-h-14 bg-[var(--myco-bg)]/90 backdrop-blur-xl z-40">
           <div className="flex items-center gap-2 sm:gap-6 min-w-0 flex-1">
              <PulseMobileBrandPair activeTab={activeTab} setActiveTab={setActiveTab} />
              <button
                type="button"
                onPointerDown={handleMobileNewsPointerDown}
                onClick={() => setActiveTab('News')}
                className={cn(
                  "hidden md:flex items-center gap-2 sm:gap-3 text-left transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-myco-accent/60 rounded-sm min-h-[44px] shrink-0",
                  activeTab === 'News' ? "opacity-100" : "opacity-80 hover:opacity-95"
                )}
                aria-label="Open News Live"
                aria-current={activeTab === 'News' ? 'page' : undefined}
              >
                 <div className="size-2 rounded-full bg-myco-accent shadow-[0_0_8px_var(--color-myco-accent)] shrink-0" />
                 <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] sm:tracking-[0.35em] whitespace-nowrap">
                   <span className="hidden sm:inline">News </span>
                   <span className="text-myco-accent opacity-100 animate-live-on-air">Live</span>
                 </span>
              </button>
              <div className="hidden xl:flex items-center gap-6 lg:gap-8 border-l border-white/5 pl-4 lg:pl-8 overflow-x-auto no-scrollbar">
                 <a
                   href={chainStats?.sources.bitcoin ?? "https://mempool.space/"}
                   target="_blank"
                   rel="noreferrer"
                   className="flex flex-col group"
                 >
                   <span className="text-[9px] font-bold text-dim uppercase tracking-widest leading-none mb-1 group-hover:text-myco-accent transition-colors">Bitcoin Block</span>
                   <span className="text-xs font-mono group-hover:text-white transition-colors">
                     {chainStats?.bitcoinBlockHeight != null
                       ? chainStats.bitcoinBlockHeight.toLocaleString()
                       : "—"}
                   </span>
                 </a>
                 <a
                   href={chainStats?.sources.solana ?? "https://solanabeach.io/validators"}
                   target="_blank"
                   rel="noreferrer"
                   className="flex flex-col group"
                 >
                   <span className="text-[9px] font-bold text-dim uppercase tracking-widest leading-none mb-1 group-hover:text-myco-accent transition-colors">Solana Validators</span>
                   <span className="text-xs font-mono group-hover:text-white transition-colors">
                     {chainStats?.solanaValidators != null
                       ? chainStats.solanaValidators.toLocaleString()
                       : "—"}
                   </span>
                 </a>
                 <a
                   href={chainStats?.sources.marketCap ?? "https://coinmarketcap.com/charts/"}
                   target="_blank"
                   rel="noreferrer"
                   className="flex flex-col group"
                 >
                   <span className="text-[9px] font-bold text-dim uppercase tracking-widest leading-none mb-1 group-hover:text-myco-accent transition-colors">Market Cap</span>
                   <span className="text-xs font-mono text-myco-accent group-hover:text-white transition-colors">
                     {formatMarketCapUsd(chainStats?.globalMarketCapUsd)}
                   </span>
                 </a>
              </div>
           </div>

           <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <a 
                href="https://v2.realms.today/dao/At93fiCMzEkZWBAHxSNjfk7zUHnF3JcxyCyPjZELjK9Y/treasury"
                target="_blank"
                rel="noreferrer"
                className="hidden md:flex items-center group min-h-[44px]"
              >
                 <span className="text-xs lg:text-sm font-bold tracking-tighter group-hover:text-white whitespace-nowrap">
                   <span className="hidden lg:inline">M Y C O D A O </span>Treasury
                   <ExternalLink className="inline size-2.5 ml-1 opacity-40" />
                 </span>
              </a>
              
              <button
                type="button"
                onClick={daoWallet.isConnected ? () => void daoWallet.disconnect() : daoWallet.connect}
                disabled={daoWallet.isConnecting}
                title={daoWallet.isConnected ? 'Disconnect wallet' : undefined}
                className="px-3 sm:px-5 min-h-[44px] border border-myco-accent bg-myco-accent/10 text-myco-accent font-bold uppercase tracking-widest text-[9px] sm:text-[10px] hover:bg-myco-accent hover:text-black transition-all whitespace-nowrap touch-manipulation"
              >
                {daoWallet.isConnected && daoWallet.label ? (
                  <span className="font-mono normal-case">{daoWallet.label}</span>
                ) : (
                  'Connect wallet'
                )}
              </button>

              <div className="flex gap-1 sm:gap-2 border-l border-white/5 pl-2 sm:pl-4">
                 <button type="button" aria-label="Security lock" className="size-10 min-w-[44px] min-h-[44px] glass-bento flex items-center justify-center hover:bg-white/5 text-dim transition-all touch-manipulation">
                   <Lock className="w-3.5 h-3.5" />
                 </button>
                 <button 
                  type="button"
                  aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="size-10 min-w-[44px] min-h-[44px] glass-bento flex items-center justify-center hover:bg-myco-accent hover:text-black hover:border-myco-accent transition-all touch-manipulation"
                 >
                   {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                 </button>
              </div>
              <a
                href="https://mycodao.com"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity min-h-[44px]"
                aria-label="MycoDAO"
              >
                <img
                  src={mycodaoColorLogo}
                  alt="MycoDAO"
                  className="h-7 lg:h-8 w-auto max-w-[96px] lg:max-w-[108px] object-contain"
                />
              </a>
           </div>
        </header>

        {/* View Port */}
        <PulseTabViewport activeTab={activeTab}>
          {renderContent()}
        </PulseTabViewport>

        {/* Global Feedback Elements */}
        <div className="scanline pointer-events-none" />
      </main>

      <PulseBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
    </NewsPersistentPlayerShell>
  );
}
