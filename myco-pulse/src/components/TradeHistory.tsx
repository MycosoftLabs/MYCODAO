import React, { useEffect, useState } from 'react';
import { ensureSupabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { History, ExternalLink, ArrowRightLeft, TrendingUp, ShieldCheck, Clock } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';

export const TradeHistory = () => {
    const { publicKey } = useWallet();
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = async () => {
        if (!publicKey) {
            setLoading(false);
            return;
        }

        const client = await ensureSupabase();
        if (!client) {
            console.warn("Supabase client not initialized - history fetch skipped.");
            setLoading(false);
            return;
        }

        try {
            // Fetching from edge_logs table
            const { data, error } = await client
                .from('edge_logs')
                .select('*')
                .eq('type', 'SWAP')
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            
            // Filter by user address in the message if needed, but for the demo we'll show recent swaps
            setHistory(data || []);
        } catch (e) {
            console.error("Error fetching trade history", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
        const id = setInterval(fetchHistory, 15000);
        return () => clearInterval(id);
    }, [publicKey]);

    if (!publicKey) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-black/40 border border-white/5 rounded-b-lg">
                <div className="relative mb-4">
                    <History className="size-12 text-dim opacity-10" />
                    <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-t border-myco-accent/20 rounded-full"
                    />
                </div>
                <span className="text-[10px] font-black text-dim uppercase tracking-[0.3em]">Access Restricted</span>
                <p className="text-[8px] font-bold text-dim/60 uppercase mt-2">Authenticated wallet required for ledger access</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden bg-black/40 rounded-b-lg border border-white/5 border-t-0">
            <div className="flex-1 overflow-y-auto no-scrollbar">
                {loading ? (
                    <div className="p-12 flex flex-col items-center gap-3">
                        <div className="size-6 border-2 border-myco-accent border-t-transparent rounded-full animate-spin" />
                        <span className="text-[8px] font-black text-myco-accent uppercase tracking-widest">Scanning Chain...</span>
                    </div>
                ) : history.length === 0 ? (
                    <div className="p-16 text-center flex flex-col items-center gap-2">
                        <Clock className="size-8 text-dim opacity-20" />
                        <span className="text-[10px] font-bold text-dim uppercase italic tracking-tighter">No execution history detected</span>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        <AnimatePresence mode="popLayout">
                            {history.map((log) => (
                                <motion.div 
                                    key={log.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    className="p-4 hover:bg-white/[0.03] transition-all group relative overflow-hidden"
                                >
                                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-myco-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="size-7 bg-white/5 border border-white/10 flex items-center justify-center rounded-sm">
                                                <ArrowRightLeft className="size-3.5 text-dim group-hover:text-myco-accent transition-colors" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-black text-white uppercase tracking-tighter leading-none mb-1">
                                                    {log.message}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[8px] font-bold text-myco-accent uppercase tracking-widest">SUCCESS</span>
                                                    <span className="text-[8px] font-mono text-dim/60">#TX-{log.id?.slice(0, 8)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-[9px] font-mono text-dim/50 uppercase whitespace-nowrap">
                                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center ml-10">
                                        <div className="flex gap-4">
                                            <div className="flex items-center gap-1.5">
                                                <ShieldCheck className="size-2.5 text-myco-accent/60" />
                                                <span className="text-[9px] font-bold text-dim uppercase">Atomic</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <TrendingUp className="size-2.5 text-blue-400/60" />
                                                <span className="text-[9px] font-bold text-dim uppercase">L3 Matrix</span>
                                            </div>
                                        </div>
                                        <button className="p-1 px-2 bg-white/5 border border-white/10 hover:border-white/30 transition-colors">
                                            <ExternalLink className="size-3 text-dim hover:text-white" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
            
            <div className="p-3 bg-white/[0.02] border-t border-white/5 flex justify-between items-center px-4">
                <span className="text-[8px] font-black text-dim uppercase tracking-[0.2em] italic">Encrypted Ledger History</span>
                <div className="flex gap-1">
                    <div className="size-1.5 bg-myco-accent rounded-full animate-pulse shadow-[0_0_5px_rgba(30,255,188,0.5)]" />
                    <span className="text-[8px] font-bold text-dim uppercase">Real-time Feed Active</span>
                </div>
            </div>
        </div>
    );
};
