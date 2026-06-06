import { RefreshCw, Wallet } from "lucide-react";
import { useDiscoveredWallets } from "@phantom/react-sdk";
import { cn } from "../lib/utils";
import { useDaoWallet } from "../hooks/useDaoWallet";

export function DaoWalletConnect({ className }: { className?: string }) {
  const wallet = useDaoWallet();
  const { wallets, isLoading: discovering } = useDiscoveredWallets();

  const otherWallets = wallets.filter((w) => w.id !== "phantom");

  if (wallet.isConnected && wallet.solanaAddress) {
    return (
      <div className={cn("flex flex-col sm:flex-row items-stretch sm:items-center gap-2", className)}>
        <div className="flex items-center gap-2 px-3 py-2 min-h-[44px] border border-myco-accent/40 bg-myco-accent/10">
          <Wallet className="size-4 text-myco-accent shrink-0" />
          <div className="min-w-0">
            <p className="text-[8px] uppercase tracking-widest text-dim">DAO wallet</p>
            <p className="text-[10px] font-mono text-white truncate">{wallet.label}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void wallet.disconnect()}
          disabled={wallet.isConnecting}
          className="px-4 py-2 min-h-[44px] border border-white/15 text-[9px] font-black uppercase tracking-widest text-dim hover:text-white hover:border-white/30"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <button
        type="button"
        onClick={wallet.connect}
        disabled={wallet.isConnecting}
        className="px-4 py-2.5 min-h-[44px] bg-myco-accent text-black text-[10px] font-black uppercase tracking-widest hover:brightness-110 flex items-center justify-center gap-2"
      >
        {wallet.isConnecting ? (
          <RefreshCw className="size-4 animate-spin" />
        ) : (
          <Wallet className="size-4" />
        )}
        Connect wallet for DAO
      </button>

      {!discovering && otherWallets.length > 0 ? (
        <p className="text-[8px] text-dim uppercase tracking-widest">
          Detected: {otherWallets.map((w) => w.name).join(" · ")} — use Connect to pick in Phantom modal
        </p>
      ) : null}

      {wallet.phantomErrors.connect ? (
        <div
          role="alert"
          className="px-3 py-2 border border-red-500/40 bg-red-950/40 text-[9px] text-red-200 leading-relaxed"
        >
          <p className="font-bold uppercase tracking-widest text-red-100">Unable to complete login</p>
          <p className="mt-1">{wallet.phantomErrors.connect.message}</p>
          <p className="mt-2 text-dim">
            If this mentions Auth2 or 400: confirm Phantom Portal redirect URL is{" "}
            <span className="font-mono text-red-100/90">{window.location.origin}</span> (no /pulse path).
          </p>
          <button
            type="button"
            onClick={() => wallet.clearPhantomError("connect")}
            className="mt-2 underline text-red-100/80"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <p className="text-[8px] text-dim uppercase tracking-widest leading-relaxed">
        Phantom · Google · Apple · Solflare & injected wallets via{" "}
        <a
          href="https://docs.phantom.com/phantom-connect"
          target="_blank"
          rel="noreferrer"
          className="text-myco-accent underline"
        >
          Phantom Connect
        </a>
      </p>
    </div>
  );
}

/** Compact row for proposal cards */
export function DaoWalletStatusChip() {
  const wallet = useDaoWallet();
  if (!wallet.isConnected || !wallet.label) {
    return (
      <button
        type="button"
        onClick={wallet.connect}
        className="text-[8px] uppercase text-amber-200/90 underline"
      >
        Connect wallet to participate
      </button>
    );
  }
  return (
    <span className="text-[8px] font-mono text-myco-accent uppercase">{wallet.label}</span>
  );
}
