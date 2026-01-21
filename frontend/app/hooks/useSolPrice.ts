'use client';

import { useState, useEffect, useCallback } from 'react';

const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd';
const CACHE_DURATION = 60000; // 1 minute cache

interface PriceCache {
    price: number;
    timestamp: number;
}

let priceCache: PriceCache | null = null;

export function useSolPrice() {
    const [price, setPrice] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPrice = useCallback(async () => {
        // Check cache first
        if (priceCache && Date.now() - priceCache.timestamp < CACHE_DURATION) {
            setPrice(priceCache.price);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(COINGECKO_API);

            if (!response.ok) {
                throw new Error('Failed to fetch SOL price');
            }

            const data = await response.json();
            const solPrice = data.solana?.usd || 0;

            // Update cache
            priceCache = {
                price: solPrice,
                timestamp: Date.now(),
            };

            setPrice(solPrice);
            setError(null);
        } catch (err: any) {
            console.error('Failed to fetch SOL price:', err);
            setError(err.message);
            // Use fallback price if fetch fails
            setPrice(150); // Reasonable fallback
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPrice();

        // Refresh every 60 seconds
        const interval = setInterval(fetchPrice, 60000);
        return () => clearInterval(interval);
    }, [fetchPrice]);

    return {
        price,
        loading,
        error,
        refresh: fetchPrice,
    };
}

// Format USD value
export function formatUSD(value: number): string {
    return value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

// Calculate minimum deposit in USD
export function getMinDepositUSD(solPrice: number, minDepositSOL: number = 0.1): string {
    return formatUSD(solPrice * minDepositSOL);
}
