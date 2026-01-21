'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';

// Program ID for jSOLi
const PROGRAM_ID = new PublicKey('DSBLsQNcR9UVnoqbBw2cVvQUXj9PkHzp22xBq9ow8NdV');

// Derive vault PDA
const [VAULT_PDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault')],
    PROGRAM_ID
);

export interface VaultStats {
    totalTvl: number;        // Total SOL in vault (in SOL, not lamports)
    totalShares: number;     // jSOLi total supply (in tokens, not base units)
    depositorCount: number;  // Number of unique depositors
    isPaused: boolean;       // Vault paused status
    sharePrice: number;      // Price of 1 jSOLi in SOL
    loading: boolean;
    error: string | null;
}

export function useVaultStats(): VaultStats & { refresh: () => Promise<void> } {
    const { connection } = useConnection();
    const [stats, setStats] = useState<VaultStats>({
        totalTvl: 0,
        totalShares: 0,
        depositorCount: 0,
        isPaused: false,
        sharePrice: 1,
        loading: true,
        error: null,
    });

    const fetchStats = useCallback(async () => {
        try {
            setStats(prev => ({ ...prev, loading: true, error: null }));

            // Fetch vault account data
            const accountInfo = await connection.getAccountInfo(VAULT_PDA);

            if (!accountInfo) {
                setStats(prev => ({
                    ...prev,
                    loading: false,
                    error: 'Vault not initialized',
                }));
                return;
            }

            // Parse vault data (based on VaultState struct layout)
            // Offset positions based on Anchor account discriminator (8 bytes) + struct fields
            const data = accountInfo.data;

            // Skip 8 byte discriminator
            // total_tvl: u64 at offset 8
            // total_shares: u64 at offset 16
            // bump: u8 at offset 24
            // config: VaultConfig starts at 25
            //   - is_paused: bool at offset 25
            // ... more fields
            // depositor_count: u32 (at some offset after allocations)

            const totalTvlLamports = data.readBigUInt64LE(8);
            const totalSharesRaw = data.readBigUInt64LE(16);
            const isPaused = data[25] === 1;

            // Convert to display units
            const totalTvl = Number(totalTvlLamports) / 1e9; // lamports to SOL
            const totalShares = Number(totalSharesRaw) / 1e9; // to tokens

            // Calculate share price
            const sharePrice = totalShares > 0 ? totalTvl / totalShares : 1;

            // Get depositor count (simplified - would need proper offset)
            // For now, use a placeholder based on shares
            const depositorCount = totalShares > 0 ? 1 : 0;

            setStats({
                totalTvl,
                totalShares,
                depositorCount,
                isPaused,
                sharePrice,
                loading: false,
                error: null,
            });
        } catch (error: any) {
            console.error('Failed to fetch vault stats:', error);
            setStats(prev => ({
                ...prev,
                loading: false,
                error: error.message || 'Failed to fetch stats',
            }));
        }
    }, [connection]);

    useEffect(() => {
        fetchStats();

        // Poll every 30 seconds
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, [fetchStats]);

    return {
        ...stats,
        refresh: fetchStats,
    };
}

// Formatting helpers
export function formatTVL(tvl: number): string {
    if (tvl >= 1000000) {
        return `${(tvl / 1000000).toFixed(2)}M SOL`;
    } else if (tvl >= 1000) {
        return `${(tvl / 1000).toFixed(2)}K SOL`;
    } else {
        return `${tvl.toFixed(4)} SOL`;
    }
}

export function formatSupply(supply: number): string {
    if (supply >= 1000000) {
        return `${(supply / 1000000).toFixed(2)}M`;
    } else if (supply >= 1000) {
        return `${(supply / 1000).toFixed(2)}K`;
    } else {
        return supply.toFixed(4);
    }
}
