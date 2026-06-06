import { useCallback, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  AddressType,
  useDisconnect as usePhantomDisconnect,
  useModal,
  usePhantom,
} from "@phantom/react-sdk";

function truncatePk(pk: string, head = 4, tail = 4) {
  if (pk.length <= head + tail + 2) return pk;
  return `${pk.slice(0, head)}…${pk.slice(-tail)}`;
}

/**
 * Unified DAO wallet session: Phantom Connect (Google / Apple / extension / injected)
 * plus Solana wallet-adapter fallback for extension wallets already in the stack.
 */
export function useDaoWallet() {
  const phantom = usePhantom();
  const { open, close, isOpened } = useModal();
  const { disconnect: phantomDisconnect, isDisconnecting } = usePhantomDisconnect();
  const adapter = useWallet();

  const phantomSolana = useMemo(
    () =>
      phantom.addresses.find((a) => a.addressType === AddressType.solana)?.address ??
      phantom.user?.addresses.find((a) => a.addressType === AddressType.solana)?.address ??
      null,
    [phantom.addresses, phantom.user?.addresses]
  );

  const adapterSolana = adapter.publicKey?.toBase58() ?? null;

  const solanaAddress = phantomSolana ?? adapterSolana;
  const isConnected = Boolean(phantom.isConnected && phantomSolana) || adapter.connected;
  const isConnecting = phantom.isConnecting || adapter.connecting || isDisconnecting;

  const connect = useCallback(() => {
    open();
  }, [open]);

  const disconnect = useCallback(async () => {
    try {
      if (phantom.isConnected) await phantomDisconnect();
    } catch {
      /* ignore */
    }
    try {
      if (adapter.connected) await adapter.disconnect();
    } catch {
      /* ignore */
    }
  }, [adapter, phantom.isConnected, phantomDisconnect]);

  const label = solanaAddress ? truncatePk(solanaAddress) : null;

  return {
    solanaAddress,
    isConnected,
    isConnecting,
    isModalOpen: isOpened,
    label,
    authProvider: phantom.user?.authProvider ?? null,
    connect,
    disconnect,
    closeModal: close,
    phantomErrors: phantom.errors,
    clearPhantomError: phantom.clearError,
  };
}
