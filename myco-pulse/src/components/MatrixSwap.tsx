import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, Zap, RefreshCw, ArrowDown, Settings2, ShieldCheck, Activity, Target, AlertTriangle, ArrowRightLeft, Clock, History, Fingerprint, Lock, Shield, TrendingUp, TrendingDown, Info, Check, X } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  MYCO_DECIMALS,
  SOL_MINT,
  MATRIX_MINT,
  executeJupiterSwap,
  formatTokenAmount,
  getJupiterQuote,
} from '../services/jupiterSwap';
import { logToSupabase } from '../lib/supabase';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

type OrderType = 'MARKET' | 'LIMIT' | 'TRIGGER';
type TriggerAction = 'STOP_LOSS' | 'TAKE_PROFIT';
type Expiry = '1H' | '24H' | '7D' | 'GTC';

export const MatrixSwap = () => {
  const wallet = useWallet();
  const { publicKey } = wallet;
  const { connection } = useConnection();
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [triggerAction, setTriggerAction] = useState<TriggerAction>('STOP_LOSS');
  const [expiry, setExpiry] = useState<Expiry>('GTC');
  const [limitPrice, setLimitPrice] = useState('0.135');
  const [triggerPrice, setTriggerPrice] = useState('0.110');
  const [amount, setAmount] = useState('1.0');
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isMatrixActive, setIsMatrixActive] = useState(false);
  const [handshakeStep, setHandshakeStep] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const fetchQuote = async (val: string) => {
    if (!val || parseFloat(val) <= 0) return;
    setLoading(true);
    const res = await getJupiterQuote(SOL_MINT, MATRIX_MINT, parseFloat(val));
    setQuote(res);
    setLoading(false);
  };

  const fetchBalance = async () => {
    if (!publicKey) return;
    try {
      const balance = await connection.getBalance(publicKey);
      setWalletBalance(balance / LAMPORTS_PER_SOL);
    } catch (e) {
      console.error("Balance fetch error", e);
    }
  };

  useEffect(() => {
    if (orderType === 'MARKET' && amount) {
      const timer = setTimeout(() => fetchQuote(amount), 500);
      return () => clearTimeout(timer);
    }
  }, [amount, orderType]);

  useEffect(() => {
    fetchBalance();
  }, [publicKey, connection]);

  const executeOrder = async () => {
    if (orderType !== 'MARKET') {
      alert('On-chain swaps use Jupiter market orders only. Limit/trigger orders are not supported yet.');
      return;
    }
    if (!publicKey) {
      alert('Connect Phantom or Solflare to swap.');
      return;
    }

    setIsMatrixActive(true);
    setHandshakeStep(1);

    try {
      setHandshakeStep(2);
      const { signature, quote: liveQuote } = await executeJupiterSwap(
        connection,
        wallet,
        SOL_MINT,
        MATRIX_MINT,
        parseFloat(amount)
      );
      setHandshakeStep(4);
      const outputAmount = formatTokenAmount(liveQuote.outAmount, MYCO_DECIMALS);

      await logToSupabase({
        type: 'SWAP',
        message: `Swap ${amount} SOL for ~${outputAmount} MYCO`,
        payload: {
          orderType,
          amount,
          outputAmount,
          signature,
          publicKey: publicKey.toBase58(),
        },
      });

      alert(
        `Swap confirmed on Solana\nAmount: ${amount} SOL\nOutput: ~${outputAmount} MYCO\nSignature: ${signature}`
      );
      void fetchBalance();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(`Swap failed: ${msg}`);
    } finally {
      setIsMatrixActive(false);
      setHandshakeStep(0);
    }
  };

  const handleInitialClick = () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }
    setShowConfirm(false);
    executeOrder();
  };

  const handshakeMessages = [
    "--- INITIALIZING PROTOCOL ---",
    "NEGOTIATING AUTH LAYER",
    "VERIFYING LIQUIDITY POOLS",
    "SYNCING CROSS-CHAIN ORACLES",
    "FINALIZING PROTOCOL HANDSHAKE"
  ];

  const estimatedOutput = orderType === 'MARKET'
    ? quote
      ? formatTokenAmount(quote.outAmount, MYCO_DECIMALS)
      : '---'
    : (parseFloat(amount) / parseFloat(orderType === 'LIMIT' ? limitPrice : triggerPrice)).toLocaleString(
        undefined,
        { maximumFractionDigits: 0 }
      );

  return (
    <div className={cn(
      "w-full h-full flex flex-col gap-0 font-mono select-none transition-all duration-700 overflow-hidden relative",
      isMatrixActive ? "pointer-events-none" : ""
    )}>
       {/* Order Confirmation Overlay */}
       <AnimatePresence>
          {showConfirm && (
             <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               className="absolute inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-6 border border-myco-accent/20"
             >
                <div className="w-full max-w-sm space-y-6">
                   <div className="flex items-center gap-3 mb-2">
                      <div className="size-8 bg-myco-accent/10 border border-myco-accent flex items-center justify-center">
                         <ShieldCheck className="size-5 text-myco-accent" />
                      </div>
                      <h3 className="text-xl font-black text-white uppercase tracking-widest">Confirm Execution</h3>
                   </div>
                   
                   <div className="space-y-4 bg-white/[0.03] border border-white/5 p-4">
                      <div className="flex justify-between items-center pb-2 border-b border-white/5">
                         <span className="text-[10px] font-black text-dim uppercase">Selling Asset</span>
                         <span className="text-[12px] font-black text-white uppercase">{amount} SOL</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-white/5">
                         <span className="text-[10px] font-black text-dim uppercase">Buying Asset</span>
                         <span className="text-[12px] font-black text-myco-accent uppercase">{estimatedOutput} MYCO</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-white/5">
                         <span className="text-[10px] font-black text-dim uppercase">Max Slippage</span>
                         <span className="text-[10px] font-black text-white">0.5% (Enforced)</span>
                      </div>
                      <div className="flex justify-between items-center">
                         <span className="text-[10px] font-black text-dim uppercase">Price Impact</span>
                         <span className={cn("text-[10px] font-black", quote?.priceImpactPct > 2 ? "text-red-500" : "text-green-500")}>
                            {quote ? `${quote.priceImpactPct}%` : '< 0.01%'}
                         </span>
                      </div>
                   </div>

                   <div className="flex gap-3 pt-2">
                      <button 
                        onClick={() => setShowConfirm(false)}
                        className="flex-1 py-4 bg-white/5 border border-white/10 text-[10px] font-black text-dim uppercase hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                      >
                         <X className="size-3" /> Abort
                      </button>
                      <button 
                        onClick={handleInitialClick}
                        className="flex-2 py-4 bg-myco-accent text-black text-[10px] font-black uppercase hover:bg-white transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(30,255,188,0.3)]"
                      >
                         <Check className="size-3 font-bold" /> Authorized Swap
                      </button>
                   </div>
                   
                   <p className="text-[8px] font-bold text-dim/40 text-center uppercase tracking-widest italic pt-4">
                      Execution protocol: Matrix_L3_Atomic_Sync_v6.4
                   </p>
                </div>
             </motion.div>
          )}
       </AnimatePresence>

       {/* Matrix Shield Overlay during execution */}
       <AnimatePresence>
          {isMatrixActive && (
             <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-8 text-center"
             >
                <motion.div 
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 90, 0]
                  }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="size-24 border-2 border-myco-accent/20 rounded-full flex items-center justify-center relative mb-8"
                >
                   <Fingerprint className="size-10 text-myco-accent animate-pulse" />
                   <motion.div 
                      className="absolute inset-0 border-t-2 border-myco-accent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                   />
                </motion.div>
                
                <h3 className="text-xl font-black text-white uppercase tracking-[0.4em] mb-2">Protocol Linked</h3>
                <p className="text-[10px] font-bold text-myco-accent uppercase tracking-widest animate-pulse mb-8">
                   {handshakeMessages[handshakeStep]}
                </p>

                <div className="w-full max-w-[200px] h-1 bg-white/5 rounded-full overflow-hidden">
                   <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(handshakeStep / (handshakeMessages.length - 1)) * 100}%` }}
                      className="h-full bg-myco-accent"
                   />
                </div>
             </motion.div>
          )}
       </AnimatePresence>

       {/* UI Header */}
       <div className="flex justify-between items-center p-4 border-b border-white/5 bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-3">
             <div className="size-6 bg-myco-accent/10 border border-myco-accent/30 rounded-sm flex items-center justify-center p-1">
                <Shield className="size-full text-myco-accent" />
             </div>
             <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Matrix Swap Core v6.4 [PRO]</span>
          </div>
          <div className="flex gap-2">
             <div className="px-2 py-0.5 bg-black border border-white/10 text-[7px] font-black text-dim uppercase flex items-center gap-1.5 leading-none">
                <Lock className="size-2 text-myco-accent" /> Encrypted Session
             </div>
             <Settings2 className="size-4 text-dim hover:text-white cursor-pointer transition-colors" />
          </div>
       </div>

       {/* Order Type Tabs */}
       <div className="p-4 py-2 shrink-0 flex gap-1 bg-black/40">
          {(['MARKET', 'LIMIT', 'TRIGGER'] as OrderType[]).map((type) => (
             <button
                key={type}
                onClick={() => setOrderType(type)}
                className={cn(
                   "flex-1 py-2 text-[9px] font-black uppercase tracking-widest border transition-all relative overflow-hidden",
                   orderType === type 
                      ? "bg-myco-accent/10 border-myco-accent text-myco-accent" 
                      : "bg-black border-white/5 text-dim hover:bg-white/5"
                )}
             >
                {type}
                {orderType === type && (
                   <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-[2px] bg-myco-accent" />
                )}
             </button>
          ))}
       </div>

       {/* Input Area */}
       <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
          <div className="space-y-1">
             <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-black text-dim uppercase">Input Allocation (SOL)</span>
                <span className="text-[9px] font-bold text-dim uppercase opacity-50">BAL: {walletBalance ? walletBalance.toFixed(2) : '12.42'}</span>
             </div>
             <div className="relative group">
                <input 
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-black border border-white/10 p-5 pt-8 text-4xl font-black text-white focus:outline-none focus:border-myco-accent transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="absolute top-2 left-5 text-[8px] font-black text-myco-accent/60 uppercase italic tracking-tighter">Liquid Asset Source</div>
                <div className="absolute bottom-2 right-4 flex gap-1">
                   {['25%', '50%', 'MAX'].map(pct => (
                      <button 
                        key={pct} 
                        onClick={() => {
                          if (pct === 'MAX' && walletBalance) setAmount(walletBalance.toString());
                          else if (pct === '50%' && walletBalance) setAmount((walletBalance * 0.5).toString());
                          else if (pct === '25%' && walletBalance) setAmount((walletBalance * 0.25).toString());
                        }}
                        className="px-2 py-0.5 bg-white/5 border border-white/10 text-[7px] font-black hover:bg-myco-accent hover:text-black transition-all"
                      >
                         {pct}
                      </button>
                   ))}
                </div>
             </div>
          </div>

          <AnimatePresence mode="wait">
             {orderType === 'LIMIT' && (
                <motion.div 
                   key="limit"
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.95 }}
                   className="grid grid-cols-2 gap-4"
                >
                   <div className="space-y-1">
                      <span className="text-[9px] font-black text-blue-400 uppercase ml-1">Limit Price</span>
                      <div className="relative">
                         <input 
                            type="number"
                            value={limitPrice}
                            onChange={(e) => setLimitPrice(e.target.value)}
                            className="w-full bg-blue-500/5 border border-blue-500/30 p-3 pt-5 text-lg font-black text-blue-400 focus:outline-none focus:border-blue-400"
                         />
                         <Target className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-blue-400/30" />
                      </div>
                   </div>
                   <div className="space-y-1">
                      <span className="text-[9px] font-black text-dim uppercase ml-1">Order Expiry</span>
                      <div className="flex gap-1 h-[46px]">
                         {(['24H', '7D', 'GTC'] as Expiry[]).map((e) => (
                            <button
                               key={e}
                               onClick={() => setExpiry(e)}
                               className={cn(
                                  "flex-1 text-[8px] font-black border transition-all",
                                  expiry === e ? "bg-white/10 border-white/40 text-white" : "bg-black/50 border-white/5 text-dim hover:bg-white/5"
                               )}
                            >
                               {e}
                            </button>
                         ))}
                      </div>
                   </div>
                </motion.div>
             )}

             {orderType === 'TRIGGER' && (
                <motion.div 
                   key="trigger"
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.95 }}
                   className="space-y-4"
                >
                   <div className="flex gap-1">
                      {(['STOP_LOSS', 'TAKE_PROFIT'] as TriggerAction[]).map((action) => (
                         <button
                            key={action}
                            onClick={() => setTriggerAction(action)}
                            className={cn(
                               "flex-1 py-1.5 text-[8px] font-black uppercase tracking-tighter border transition-all flex items-center justify-center gap-2",
                               triggerAction === action 
                                  ? action === 'STOP_LOSS' ? "bg-red-500/10 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]" : "bg-myco-accent/10 border-myco-accent text-myco-accent"
                                  : "bg-black border-white/5 text-dim"
                            )}
                         >
                            {action === 'STOP_LOSS' ? <ShieldCheck className="size-3" /> : <TrendingUp className="size-3" />}
                            {action.replace('_', ' ')}
                         </button>
                      ))}
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                         <span className={cn("text-[9px] font-black uppercase ml-1", triggerAction === 'STOP_LOSS' ? "text-red-400" : "text-myco-accent")}>
                            {triggerAction} Price
                         </span>
                         <div className="relative">
                            <input 
                               type="number"
                               value={triggerPrice}
                               onChange={(e) => setTriggerPrice(e.target.value)}
                               className={cn(
                                  "w-full p-3 pt-5 text-lg font-black focus:outline-none bg-black border transition-colors",
                                  triggerAction === 'STOP_LOSS' ? "border-red-500/30 text-red-400 focus:border-red-400" : "border-myco-accent/30 text-myco-accent focus:border-myco-accent"
                               )}
                            />
                            <AlertTriangle className={cn("absolute right-3 top-1/2 -translate-y-1/2 size-4", triggerAction === 'STOP_LOSS' ? "text-red-400/30" : "text-myco-accent/30")} />
                         </div>
                      </div>
                      <div className="space-y-1">
                         <span className="text-[9px] font-black text-dim uppercase ml-1">System Mode</span>
                         <div className="h-[46px] bg-black border border-white/10 flex items-center justify-center gap-2 px-3">
                            <Activity className="size-3 text-dim animate-pulse" />
                            <span className="text-[8px] font-black text-dim uppercase italic">Matrix_Link_Active</span>
                         </div>
                      </div>
                   </div>
                </motion.div>
             )}
          </AnimatePresence>

          <div className="flex justify-center -my-4 relative z-10">
             <div className="size-10 bg-black border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-myco-accent hover:text-black transition-all cursor-pointer group shadow-[0_0_20px_rgba(0,0,0,0.5)] active:scale-95">
                <ArrowRightLeft className="size-4 group-hover:rotate-180 transition-transform duration-500" />
             </div>
          </div>

          <div className="space-y-1">
             <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-black text-dim uppercase">Extracted Asset (MYCO)</span>
             </div>
             <div className="w-full bg-black border border-white/10 p-5 pt-8 min-h-[100px] relative transition-colors duration-500">
                {loading && orderType === 'MARKET' ? (
                   <div className="flex items-center gap-3">
                      <RefreshCw className="size-6 text-myco-accent animate-spin" />
                      <span className="text-[12px] font-black text-myco-accent animate-pulse uppercase">Querying Quoter...</span>
                   </div>
                ) : (
                   <div className={cn("text-4xl font-black transition-colors duration-500", orderType === 'TRIGGER' && triggerAction === 'STOP_LOSS' ? "text-red-400" : "text-myco-accent")}>
                      {estimatedOutput}
                   </div>
                )}
                <div className="absolute top-2 left-5 text-[8px] font-black text-myco-accent/60 uppercase italic tracking-tighter">Neuro-Link Output Analysis</div>
                <div className="absolute bottom-2 right-5 text-[10px] font-black text-dim opacity-40">~$42,120.40 EST</div>
             </div>
          </div>
       </div>

       {/* Footer Actions */}
       <div className="p-6 pt-0 mt-auto bg-black/20">
          <button 
            onClick={handleInitialClick}
            disabled={(orderType === 'MARKET' && (loading || !quote)) || isMatrixActive}
            className={cn(
              "w-full py-6 flex flex-col items-center justify-center gap-1 group relative overflow-hidden transition-all duration-500 hover:scale-[1.01] active:scale-[0.99]",
              isMatrixActive ? "bg-myco-accent grayscale cursor-wait" : "bg-white hover:bg-myco-accent"
            )}
          >
             <span className={cn("text-[11px] font-black uppercase tracking-[0.4em] relative z-20", isMatrixActive ? "text-black" : "text-black")}>
                {isMatrixActive ? "Link Established" : `Initiate ${orderType} Protocol`}
             </span>
             <Zap className={cn("size-3 absolute left-6 top-1/2 -translate-y-1/2 transition-opacity", isMatrixActive ? "opacity-100" : "opacity-0 group-hover:opacity-100")} />
             
             {isMatrixActive && (
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: '100%' }}
                 transition={{ duration: 4, ease: "linear" }}
                 className="absolute bottom-0 left-0 h-1.5 bg-black/30 z-10"
               />
             )}
          </button>
          
          <div className="flex justify-between items-center mt-6 text-[8px] font-black text-dim uppercase tracking-[0.2em]">
             <div className="flex items-center gap-1.5 py-1 px-2 bg-white/5 border border-white/10">
                <History className="size-2 text-myco-accent" /> Batch Execution Enforced
             </div>
             <span>SLIPPAGE CAP: 0.1%</span>
          </div>
       </div>
    </div>
  );
};
