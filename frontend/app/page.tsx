'use client';

import Image from 'next/image';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useState, useEffect, useCallback } from 'react';
import { ALLOCATIONS, TARGET_APY_LOW, TARGET_APY_HIGH, LINKS, formatSOL } from '../config';
import { useProgram } from './hooks/useProgram';
import { useSolPrice, getMinDepositUSD } from './hooks/useSolPrice';
import { TermsModal, useTerms } from './components/TermsModal';
import { TreasuryModal } from './components/TreasuryModal';
import { AccessLinks } from './components/AccessLinks';
import { TutorialModal, useTutorial } from './components/TutorialModal';
import { useTransactionHistory } from './hooks/useTransactionHistory';
import { FASBModal } from './components/FASBModal';

// Theme types
type Theme = 'light' | 'dark';

// Get gradient style based on theme
const getGradientStyle = (theme: Theme) => ({
    background: theme === 'light'
        ? `
            radial-gradient(ellipse at top left, rgba(153, 69, 255, 0.15) 0%, transparent 60%),
            radial-gradient(ellipse at bottom right, rgba(20, 241, 149, 0.10) 0%, transparent 60%),
            radial-gradient(ellipse at center, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.95) 40%, rgba(153, 69, 255, 0.12) 100%)
        `
        : `
            radial-gradient(ellipse at top left, rgba(153, 69, 255, 0.20) 0%, transparent 60%),
            radial-gradient(ellipse at bottom right, rgba(20, 241, 149, 0.15) 0%, transparent 60%),
            #0a0a0f
        `,
    minHeight: '100vh'
});

// Theme colors (Solana branding)
const colors = {
    light: {
        bg: '#FFFFFF',
        card: '#FFFFFF',
        cardBorder: 'rgba(153, 69, 255, 0.15)',
        text: '#3B3B3B',
        textMuted: '#6B7280',
        textLight: '#9CA3AF',
        inputBg: '#F9FAFB',
        accent: '#9945FF',
        accentLight: 'rgba(153, 69, 255, 0.1)',
    },
    dark: {
        bg: '#0a0a0f',
        card: '#1a1a2e',
        cardBorder: 'rgba(153, 69, 255, 0.25)',
        text: '#E5E7EB',
        textMuted: '#9CA3AF',
        textLight: '#6B7280',
        inputBg: '#16162a',
        accent: '#9945FF',
        accentLight: 'rgba(153, 69, 255, 0.15)',
    }
};

export default function Home() {
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const { deposit, withdraw, getVaultState, getUserAccount, loading, error, connected } = useProgram();

    const [balance, setBalance] = useState<number>(0);
    const [jsoliBalance, setJsoliBalance] = useState<number>(0);
    const [depositAmount, setDepositAmount] = useState('');
    const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
    const [theme, setTheme] = useState<Theme>('dark'); // Default to dark to match SSR
    const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
    const [txMessage, setTxMessage] = useState('');
    const [mounted, setMounted] = useState(false);

    // Vault stats
    const [tvl, setTvl] = useState<number>(0);
    const [apy, setApy] = useState<number>((TARGET_APY_LOW + TARGET_APY_HIGH) / 2);
    const [isPaused, setIsPaused] = useState(false);

    // Terms and Tutorial hooks
    const { showTerms, acceptTerms } = useTerms();
    const { showTutorial, reopenTutorial, closeTutorial, completeTutorial } = useTutorial();
    const [showTreasury, setShowTreasury] = useState(false);

    // FASB / History
    const [showFASB, setShowFASB] = useState(false);
    const { history, loading: historyLoading, refetch: refetchHistory } = useTransactionHistory();
    const [totalShares, setTotalShares] = useState<number>(0);

    // SOL price hook
    const { price: solPrice } = useSolPrice();
    const minDepositSOL = 0.1;
    const minDepositUSD = solPrice > 0 ? getMinDepositUSD(solPrice, minDepositSOL) : '...';

    // Mounted check for hydration
    useEffect(() => {
        setMounted(true);
    }, []);

    // Theme logic - only run on client after mount
    useEffect(() => {
        if (mounted && window.matchMedia('(prefers-color-scheme: light)').matches) {
            setTheme('light');
        }
    }, [mounted]);
    const c = colors[theme];

    // Fetch SOL balance
    useEffect(() => {
        if (!publicKey) return;
        connection.getBalance(publicKey).then(lamports => {
            setBalance(lamports / LAMPORTS_PER_SOL);
        });
    }, [publicKey, connection]);

    // Fetch vault state
    useEffect(() => {
        const fetchVaultData = async () => {
            const vaultState = await getVaultState();
            if (vaultState) {
                setTvl(Number(vaultState.totalTvl) / LAMPORTS_PER_SOL);
                setTotalShares(Number(vaultState.totalShares) / LAMPORTS_PER_SOL);
            }

            const userAccount = await getUserAccount();
            if (userAccount) {
                setJsoliBalance(Number(userAccount.shares) / LAMPORTS_PER_SOL);
            }
        };

        if (connected) {
            fetchVaultData();
        }
    }, [connected, getVaultState, getUserAccount]);

    const handleDeposit = async () => {
        if (!publicKey) {
            setTxStatus('error');
            setTxMessage('Please connect your wallet first');
            return;
        }
        if (!depositAmount) {
            setTxStatus('error');
            setTxMessage('Please enter an amount');
            return;
        }
        if (!connected) {
            setTxStatus('error');
            setTxMessage('Anchor program not initialized. Try refreshing the page.');
            console.log('[handleDeposit] Program not connected. publicKey:', publicKey.toString());
            return;
        }

        setTxStatus('pending');
        setTxMessage('Depositing SOL...');

        try {
            const tx = await deposit(parseFloat(depositAmount));
            setTxStatus('success');
            setTxMessage(`Deposit successful! TX: ${tx.slice(0, 8)}...`);
            setDepositAmount('');

            // Refresh balances
            if (publicKey) {
                const newBalance = await connection.getBalance(publicKey);
                setBalance(newBalance / LAMPORTS_PER_SOL);
            }
        } catch (e: any) {
            setTxStatus('error');
            setTxMessage(e.message || 'Deposit failed');
            console.error('[handleDeposit] Error:', e);
        }
    };

    const handleWithdraw = async () => {
        if (!publicKey || !depositAmount) return;

        setTxStatus('pending');
        setTxMessage('Withdrawing jSOLi...');

        try {
            const tx = await withdraw(parseFloat(depositAmount));
            setTxStatus('success');
            setTxMessage(`Withdraw successful! TX: ${tx.slice(0, 8)}...`);
            setDepositAmount('');
        } catch (e: any) {
            setTxStatus('error');
            setTxMessage(e.message || 'Withdraw failed');
        }
    };

    return (
        <main style={getGradientStyle(theme)} className="flex flex-col">
            {/* Header */}
            <header className="flex flex-wrap items-center justify-between px-4 py-4 md:px-6 md:py-5 gap-3">
                <div className="flex items-center gap-3">
                    <Image src="/jubilee-logo-pink.png" alt="Jubilee" width={32} height={32} />
                    <span className="text-xl md:text-2xl font-bold text-[var(--text-dark)] dark:text-gray-200" style={{ color: c.text }}>jSOLi</span>
                </div>
                <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-end">
                    {mounted && (
                        <>
                            {/* Theme Toggle */}
                            <button
                                onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                                className="flex items-center justify-center w-9 h-9 md:w-11 md:h-11 rounded-full text-base md:text-xl transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                                style={{
                                    background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                }}
                                suppressHydrationWarning
                            >
                                {theme === 'dark' ? '☀️' : '🌙'}
                            </button>
                            {/* Treasury Button */}
                            <button
                                onClick={() => setShowTreasury(true)}
                                className="flex items-center justify-center w-9 h-9 md:w-11 md:h-11 rounded-full text-base md:text-xl transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                                style={{
                                    background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                }}
                                title="Treasury Mode"
                            >
                                🏛️
                            </button>
                            <div className="scale-90 md:scale-100 origin-right">
                                <WalletMultiButton />
                            </div>
                        </>
                    )}
                </div>
            </header>

            {/* Devnet Warning Banner */}
            <div className="bg-gradient-to-r from-[#FF6B35] to-[#F7931A] px-4 py-3 text-center flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
                <span className="text-white font-semibold text-xs md:text-sm">
                    ⚠️ DEVNET — This is a test environment. Tokens have no real value.
                </span>
                <a
                    href="https://faucet.solana.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded-full text-xs md:text-[13px] font-semibold no-underline border border-white/30 transition-all"
                >
                    💧 Get Devnet SOL
                </a>
            </div>

            {/* Stats Bar */}
            <div
                className="flex flex-wrap justify-center gap-4 md:gap-12 px-4 py-4 md:px-6 border-b"
                style={{
                    background: c.accentLight,
                    borderBottomColor: c.cardBorder
                }}
            >
                <div className="text-center min-w-[80px]">
                    <div className="text-xs font-semibold uppercase mb-1" style={{ color: c.textMuted }}>TVL</div>
                    <div className="text-base md:text-lg font-bold" style={{ color: c.text }}>{tvl.toLocaleString()} SOL</div>
                </div>
                <div className="text-center min-w-[80px]">
                    <div className="text-xs font-semibold uppercase mb-1" style={{ color: c.textMuted }}>Est. APY</div>
                    <div className="text-[#14F195] text-base md:text-lg font-bold">{apy.toFixed(1)}%</div>
                </div>
                <div className="text-center min-w-[80px]">
                    <div className="text-xs font-semibold uppercase mb-1" style={{ color: c.textMuted }}>Your jSOLi</div>
                    <div className="text-base md:text-lg font-bold" style={{ color: c.text }}>{jsoliBalance.toFixed(4)}</div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-10 w-full">
                <div
                    className="w-full max-w-[480px] rounded-3xl p-5 md:p-8 shadow-xl border"
                    style={{
                        background: c.card,
                        boxShadow: '0 20px 60px -10px rgba(153, 69, 255, 0.15)',
                        borderColor: c.cardBorder
                    }}
                >
                    <h1 className="text-xl md:text-2xl font-semibold mb-2 text-center" style={{ color: c.text }}>
                        Solana Staking Index
                    </h1>
                    <p className="text-sm text-center mb-6" style={{ color: c.textMuted }}>
                        Diversified yield across top LST protocols
                    </p>

                    {/* Tabs & History */}
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex rounded-xl p-1 gap-1" style={{ background: c.inputBg }}>
                            {['deposit', 'withdraw'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`px-4 py-2.5 md:px-5 rounded-lg border-none font-semibold cursor-pointer text-sm md:text-base transition-all ${activeTab === tab ? 'shadow-sm' : ''}`}
                                    style={{
                                        background: activeTab === tab ? c.card : 'transparent',
                                        color: activeTab === tab ? c.accent : c.textMuted,
                                        boxShadow: activeTab === tab ? '0 4px 12px rgba(153, 69, 255, 0.1)' : 'none',
                                    }}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => {
                                refetchHistory();
                                setShowFASB(true);
                            }}
                            className="bg-transparent border rounded-lg px-3 py-2 md:px-4 text-sm font-semibold cursor-pointer flex items-center gap-1.5 transition-all"
                            style={{
                                borderColor: c.accent,
                                color: c.accent,
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(153, 69, 255, 0.1)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            History
                        </button>
                    </div>

                    {/* Input */}
                    <div className="mb-6">
                        <div className="flex justify-between mb-2 text-sm" style={{ color: c.textMuted }}>
                            <span>{activeTab === 'deposit' ? 'Deposit Amount' : 'Withdraw Amount'}</span>
                            <span>Balance: {activeTab === 'deposit' ? balance.toFixed(4) : jsoliBalance.toFixed(4)} {activeTab === 'deposit' ? 'SOL' : 'jSOLi'}</span>
                        </div>
                        <div
                            className="rounded-2xl p-4 border flex items-center gap-3"
                            style={{
                                background: c.inputBg,
                                borderColor: c.cardBorder,
                            }}
                        >
                            <input
                                type="number"
                                value={depositAmount}
                                onChange={(e) => setDepositAmount(e.target.value)}
                                placeholder="0.00"
                                className="bg-transparent border-none text-xl md:text-2xl font-semibold w-full outline-none"
                                style={{
                                    color: c.text,
                                }}
                            />
                            <div className="flex items-center gap-2">
                                <div
                                    className="rounded-lg px-2 py-1 font-semibold text-sm cursor-pointer"
                                    style={{
                                        background: c.accentLight,
                                        color: c.accent,
                                    }}
                                    onClick={() => setDepositAmount(activeTab === 'deposit' ? balance.toString() : jsoliBalance.toString())}
                                >
                                    MAX
                                </div>
                                <span className="font-semibold" style={{ color: c.text }}>{activeTab === 'deposit' ? 'SOL' : 'jSOLi'}</span>
                            </div>
                        </div>

                        {/* Min deposit info + Get SOL (only for deposit tab) */}
                        {activeTab === 'deposit' && (
                            <div className="flex justify-between items-center mt-3 text-[13px]">
                                <span style={{ color: c.textMuted }}>
                                    Min. deposit: {minDepositSOL} SOL ≈ {minDepositUSD}
                                </span>
                                <a
                                    href="https://www.coinbase.com/price/solana"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium hover:underline"
                                    style={{
                                        color: c.accent,
                                    }}
                                >
                                    Get SOL →
                                </a>
                            </div>
                        )}

                        {/* Price attribution */}
                        {activeTab === 'deposit' && solPrice > 0 && (
                            <div className="text-center mt-2 text-[11px]" style={{ color: c.textLight }}>
                                Price by <a href="https://www.coingecko.com/en/coins/solana" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: c.textLight }}>CoinGecko</a>
                            </div>
                        )}
                    </div>

                    {/* Status Message */}
                    {txStatus !== 'idle' && (
                        <div
                            className="px-4 py-3 rounded-xl mb-4 text-center text-sm break-words"
                            style={{
                                background: txStatus === 'success' ? 'rgba(20, 241, 149, 0.1)' : txStatus === 'error' ? 'rgba(255, 100, 100, 0.1)' : c.accentLight,
                                color: txStatus === 'success' ? '#14F195' : txStatus === 'error' ? '#FF6464' : c.accent,
                            }}
                        >
                            {txMessage}
                        </div>
                    )}

                    {/* Action Button */}
                    <button
                        onClick={activeTab === 'deposit' ? handleDeposit : handleWithdraw}
                        disabled={!publicKey || !depositAmount || loading}
                        className="w-full p-5 rounded-2xl border-none text-lg font-bold cursor-pointer transition-all disabled:cursor-not-allowed disabled:opacity-70"
                        style={{
                            background: publicKey ? `linear-gradient(135deg, ${c.accent} 0%, #14F195 100%)` : '#E5E7EB',
                            color: publicKey ? 'white' : '#9CA3AF',
                        }}
                    >
                        {loading ? 'Processing...' : (publicKey
                            ? (activeTab === 'deposit' ? 'Deposit SOL' : 'Withdraw jSOLi')
                            : 'Connect Wallet')}
                    </button>

                    {!connected && mounted && (
                        <div className="mt-4 text-center">
                            <WalletMultiButton style={{ width: '100%', justifyContent: 'center' }} />
                        </div>
                    )}
                </div>

                {/* Allocation Display */}
                <div
                    className="mt-6 rounded-2xl p-5 w-full max-w-[480px] border"
                    style={{
                        background: c.card,
                        borderColor: c.cardBorder
                    }}
                >
                    <h3 className="text-sm font-semibold mb-4" style={{ color: c.text }}>
                        Protocol Allocations
                    </h3>
                    <div className="flex flex-col gap-2">
                        {ALLOCATIONS.map((a) => (
                            <div key={a.protocol} className="flex items-center gap-3">
                                <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ background: a.color }}
                                />
                                <span className="text-sm flex-1" style={{ color: c.text }}>{a.protocol}</span>
                                <span className="text-sm" style={{ color: c.textMuted }}>{a.percentage}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="px-6 py-5 text-center border-t" style={{ borderColor: c.cardBorder }}>
                {/* Access Links Bar */}
                <AccessLinks
                    theme={theme}
                    isPaused={isPaused}
                    onTutorialClick={reopenTutorial}
                    onTreasuryClick={() => setShowTreasury(true)}
                />

                <div className="mt-6 flex justify-center items-center gap-3" style={{ color: c.textLight }}>
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                        style={{ background: c.accent }}
                    >
                        ✉️
                    </div>
                    <p className="text-sm font-medium">
                        2026 © Jubilee Protocol · Governed by Hundredfold Foundation
                    </p>
                </div>
            </footer>

            {/* Modals */}
            {mounted && (
                <>
                    <TermsModal
                        isOpen={showTerms}
                        onAccept={() => acceptTerms(true)}
                        theme={theme}
                    />
                    <TutorialModal
                        isOpen={showTutorial}
                        onClose={completeTutorial}
                        theme={theme}
                        solPrice={solPrice}
                    />
                    <TreasuryModal
                        isOpen={showTreasury}
                        onClose={() => setShowTreasury(false)}
                        theme={theme}
                    />
                    <FASBModal
                        isOpen={showFASB}
                        onClose={() => setShowFASB(false)}
                        history={history}
                        loading={historyLoading}
                        theme={theme}
                        currentValue={jsoliBalance * (totalShares > 0 ? tvl / totalShares : 1) * solPrice}
                    />
                </>
            )}
        </main>
    );
}
