import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';
import { useState, useEffect, useCallback } from 'react';
import { PROGRAM_ID } from '../../config';

export interface TransactionRecord {
    signature: string;
    blockTime: number;
    type: 'Deposit' | 'Withdraw' | 'Unknown';
    amount: number;
    status: 'Success' | 'Fail';
    fee: number;
}

export function useTransactionHistory() {
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const [history, setHistory] = useState<TransactionRecord[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchHistory = useCallback(async () => {
        if (!publicKey) return;

        setLoading(true);
        try {
            // Fetch signatures for the user's address
            // Limit to last 20 for performance
            const signatures = await connection.getSignaturesForAddress(
                publicKey,
                { limit: 20 },
                'confirmed'
            );

            const txs: TransactionRecord[] = [];

            // We need to fetch parsed transactions to understand what happened
            // Note: In a production app with high volume, you'd want an indexer API.
            // For now, fetching individually or in batches is okay for low volume.
            const parsedTxs = await connection.getParsedTransactions(
                signatures.map(s => s.signature),
                { commitment: 'confirmed', maxSupportedTransactionVersion: 0 }
            );

            parsedTxs.forEach((tx, i) => {
                if (!tx) return;

                const signature = signatures[i].signature;
                const blockTime = signatures[i].blockTime || 0;
                const err = signatures[i].err;
                const status = err ? 'Fail' : 'Success';
                const fee = (tx.meta?.fee || 0) / 1e9; // lamports to SOL

                // Basic classification based on logs or instruction data checking
                // This is a heuristic. A robust solution needs an IDL parser or indexer.
                let type: 'Deposit' | 'Withdraw' | 'Unknown' = 'Unknown';
                let amount = 0;

                const logs = tx.meta?.logMessages || [];
                const isJsolValid = logs.some(log => log.includes(PROGRAM_ID.toString()));

                // Check token balance changes to identify Mint (Deposit) or Burn (Withdraw)
                const preTokenBal = tx.meta?.preTokenBalances?.find(b => b.owner === publicKey?.toString())?.uiTokenAmount.uiAmount || 0;
                const postTokenBal = tx.meta?.postTokenBalances?.find(b => b.owner === publicKey?.toString())?.uiTokenAmount.uiAmount || 0;
                const tokenChange = postTokenBal - preTokenBal;

                if (isJsolValid || tokenChange !== 0) {
                    // Strategy 1: Token Balance Change (Most Reliable)
                    if (tokenChange > 0) {
                        type = 'Deposit';
                        // Amount is roughly the SOL spent.
                        // SOL spent = preSOL - postSOL - fee
                        const preSol = (tx.meta?.preBalances[0] || 0) / 1e9;
                        const postSol = (tx.meta?.postBalances[0] || 0) / 1e9;
                        amount = Math.abs(preSol - postSol - fee);
                    } else if (tokenChange < 0) {
                        type = 'Withdraw';
                        // Amount is SOL received
                        const preSol = (tx.meta?.preBalances[0] || 0) / 1e9;
                        const postSol = (tx.meta?.postBalances[0] || 0) / 1e9;
                        amount = Math.abs(postSol - preSol - fee);
                    }
                    // Strategy 2: Fallback to Logs
                    else if (logs.some(log => log.toLowerCase().includes('instruction: deposit'))) {
                        type = 'Deposit';
                        const preBal = tx.meta?.preBalances[0] || 0;
                        const postBal = tx.meta?.postBalances[0] || 0;
                        amount = Math.abs((preBal - postBal) - (tx.meta?.fee || 0)) / 1e9;
                    } else if (logs.some(log => log.toLowerCase().includes('instruction: withdraw'))) {
                        type = 'Withdraw';
                        const preBal = tx.meta?.preBalances[0] || 0;
                        const postBal = tx.meta?.postBalances[0] || 0;
                        amount = (postBal - preBal + (tx.meta?.fee || 0)) / 1e9;
                    }
                }

                // Only add if it's related to our program or identified as such
                if (type !== 'Unknown') {
                    txs.push({
                        signature,
                        blockTime,
                        type,
                        amount,
                        status,
                        fee
                    });
                }
            });

            setHistory(txs);

        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    }, [connection, publicKey]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    return { history, loading, refetch: fetchHistory };
}
