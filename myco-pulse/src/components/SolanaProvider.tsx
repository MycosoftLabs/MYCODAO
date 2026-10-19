import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter, WalletConnectWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

/** Public Reown project ID (allowlisted to blocks.mycodao.com); not a secret. */
const WALLETCONNECT_PROJECT_ID =
    import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim() || '9d3cb1ee10a75a90b2da67776bfb1af0';

export const SolanaProvider = ({ children }: { children: React.ReactNode }) => {
    // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
    const network = WalletAdapterNetwork.Mainnet;

    // You can also provide a custom RPC endpoint.
    const endpoint = useMemo(
        () =>
            import.meta.env.VITE_SOLANA_RPC_URL?.trim() ||
            import.meta.env.VITE_PHANTOM_SOLANA_RPC?.trim() ||
            clusterApiUrl(network),
        [network]
    );

    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
            new WalletConnectWalletAdapter({
                network: WalletAdapterNetwork.Mainnet,
                options: {
                    projectId: WALLETCONNECT_PROJECT_ID,
                    metadata: {
                        name: 'MycoDAO Blocks',
                        description: 'MycoDAO Blocks: MYCO, FungIP and DeSci on Solana',
                        url: 'https://blocks.mycodao.com',
                        icons: ['https://blocks.mycodao.com/favicon.ico'],
                    },
                },
            }),
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [network]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
