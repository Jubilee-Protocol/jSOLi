"use client";

import * as React from 'react';
import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter, LedgerWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

const queryClient = new QueryClient();

// Get RPC endpoint from environment or default
const getEndpoint = () => {
    const network = process.env.NEXT_PUBLIC_NETWORK || 'devnet';

    // Custom RPC endpoints (recommended for production)
    if (network === 'mainnet-beta' && process.env.NEXT_PUBLIC_MAINNET_RPC) {
        return process.env.NEXT_PUBLIC_MAINNET_RPC;
    }
    if (network === 'devnet' && process.env.NEXT_PUBLIC_DEVNET_RPC) {
        return process.env.NEXT_PUBLIC_DEVNET_RPC;
    }

    // Fallback to public endpoints
    return clusterApiUrl(network as any);
};

export function Providers({ children }: { children: React.ReactNode }) {
    const endpoint = useMemo(() => getEndpoint(), []);

    // Configure supported wallets
    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
            new LedgerWalletAdapter(),
        ],
        []
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <QueryClientProvider client={queryClient}>
                        {children}
                    </QueryClientProvider>
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}
