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
            <header style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Image src="/jubilee-logo-pink.png" alt="Jubilee" width={32} height={32} />
                    <span style={{ fontSize: '22px', fontWeight: 'bold', color: c.text }}>jSOLi</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {mounted && (
                        <>
                            {/* Theme Toggle */}
                            <button
                                onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                                style={{
                                    background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '20px',
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                                suppressHydrationWarning
                            >
                                {theme === 'dark' ? '☀️' : '🌙'}
                            </button>
                            {/* Treasury Button */}
                            <button
                                onClick={() => setShowTreasury(true)}
                                style={{
                                    background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '20px',
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                                title="Treasury Mode"
                            >
                                🏛️
                            </button>
                            <WalletMultiButton />
                        </>
                    )}
                </div>
            </header>

            {/* Devnet Warning Banner */}
            <div style={{
                background: 'linear-gradient(90deg, #FF6B35, #F7931A)',
                padding: '12px 24px',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                flexWrap: 'wrap',
            }}>
                <span style={{
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '14px',
                }}>
                    ⚠️ DEVNET — This is a test environment. Tokens have no real value.
                </span>
                <a
                    href="https://faucet.solana.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        background: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        padding: '6px 16px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: '600',
                        textDecoration: 'none',
                        border: '1px solid rgba(255,255,255,0.3)',
                        transition: 'all 0.2s ease',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                >
                    💧 Get Devnet SOL
                </a>
            </div>

            {/* Stats Bar */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '48px',
                padding: '16px 24px',
                background: c.accentLight,
                borderBottom: `1px solid ${c.cardBorder}`
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ color: c.textMuted, fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>TVL</div>
                    <div style={{ color: c.text, fontSize: '18px', fontWeight: '700' }}>{tvl.toLocaleString()} SOL</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ color: c.textMuted, fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Est. APY</div>
                    <div style={{ color: '#14F195', fontSize: '18px', fontWeight: '700' }}>{apy.toFixed(1)}%</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ color: c.textMuted, fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>Your jSOLi</div>
                    <div style={{ color: c.text, fontSize: '18px', fontWeight: '700' }}>{jsoliBalance.toFixed(4)}</div>
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div style={{
                    background: c.card,
                    borderRadius: '24px',
                    padding: '32px',
                    width: '100%',
                    maxWidth: '480px',
                    boxShadow: '0 20px 60px -10px rgba(153, 69, 255, 0.15)',
                    border: `1px solid ${c.cardBorder}`
                }}>
                    <h1 style={{ fontSize: '24px', fontWeight: '600', color: c.text, marginBottom: '8px', textAlign: 'center' }}>
                        Solana Staking Index
                    </h1>
                    <p style={{ color: c.textMuted, fontSize: '14px', textAlign: 'center', marginBottom: '24px' }}>
                        Diversified yield across top LST protocols
                    </p>

                    {/* Tabs & History */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', background: c.inputBg, borderRadius: '12px', padding: '4px', gap: '4px' }}>
                            {['deposit', 'withdraw'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: activeTab === tab ? c.card : 'transparent',
                                        color: activeTab === tab ? c.accent : c.textMuted,
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        boxShadow: activeTab === tab ? '0 4px 12px rgba(153, 69, 255, 0.1)' : 'none',
                                        transition: 'all 0.2s ease',
                                        fontSize: '16px'
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
                            style={{
                                background: 'transparent',
                                border: `1px solid ${c.accent}`,
                                borderRadius: '10px',
                                padding: '8px 16px',
                                color: c.accent,
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '14px',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(153, 69, 255, 0.1)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            History
                        </button>
                    </div>

                    {/* Input */}
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '8px',
                            color: c.textMuted,
                            fontSize: '14px'
                        }}>
                            <span>{activeTab === 'deposit' ? 'Deposit Amount' : 'Withdraw Amount'}</span>
                            <span>Balance: {activeTab === 'deposit' ? balance.toFixed(4) : jsoliBalance.toFixed(4)} {activeTab === 'deposit' ? 'SOL' : 'jSOLi'}</span>
                        </div>
                        <div style={{
                            background: c.inputBg,
                            borderRadius: '16px',
                            padding: '16px',
                            border: `1px solid ${c.cardBorder}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <input
                                type="number"
                                value={depositAmount}
                                onChange={(e) => setDepositAmount(e.target.value)}
                                placeholder="0.00"
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    fontSize: '24px',
                                    fontWeight: '600',
                                    color: c.text,
                                    width: '100%',
                                    outline: 'none'
                                }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                    background: c.accentLight,
                                    borderRadius: '8px',
                                    padding: '4px 8px',
                                    color: c.accent,
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }} onClick={() => setDepositAmount(activeTab === 'deposit' ? balance.toString() : jsoliBalance.toString())}>
                                    MAX
                                </div>
                                <span style={{ fontWeight: '600', color: c.text }}>{activeTab === 'deposit' ? 'SOL' : 'jSOLi'}</span>
                            </div>
                        </div>

                        {/* Min deposit info + Get SOL (only for deposit tab) */}
                        {activeTab === 'deposit' && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: '12px',
                                fontSize: '13px',
                            }}>
                                <span style={{ color: c.textMuted }}>
                                    Min. deposit: {minDepositSOL} SOL ≈ {minDepositUSD}
                                </span>
                                <a
                                    href="https://www.coinbase.com/price/solana"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        color: c.accent,
                                        textDecoration: 'none',
                                        fontWeight: '500',
                                    }}
                                >
                                    Get SOL →
                                </a>
                            </div>
                        )}

                        {/* Price attribution */}
                        {activeTab === 'deposit' && solPrice > 0 && (
                            <div style={{
                                textAlign: 'center',
                                marginTop: '8px',
                                fontSize: '11px',
                                color: c.textLight,
                            }}>
                                Price by <a href="https://www.coingecko.com/en/coins/solana" target="_blank" rel="noopener noreferrer" style={{ color: c.textLight, textDecoration: 'underline' }}>CoinGecko</a>
                            </div>
                        )}
                    </div>

                    {/* Status Message */}
                    {txStatus !== 'idle' && (
                        <div style={{
                            padding: '12px 16px',
                            borderRadius: '12px',
                            marginBottom: '16px',
                            background: txStatus === 'success' ? 'rgba(20, 241, 149, 0.1)' : txStatus === 'error' ? 'rgba(255, 100, 100, 0.1)' : c.accentLight,
                            color: txStatus === 'success' ? '#14F195' : txStatus === 'error' ? '#FF6464' : c.accent,
                            fontSize: '14px',
                            textAlign: 'center'
                        }}>
                            {txMessage}
                        </div>
                    )}

                    {/* Action Button */}
                    <button
                        onClick={activeTab === 'deposit' ? handleDeposit : handleWithdraw}
                        disabled={!publicKey || !depositAmount || loading}
                        style={{
                            width: '100%',
                            padding: '20px',
                            borderRadius: '16px',
                            border: 'none',
                            background: publicKey ? `linear-gradient(135deg, ${c.accent} 0%, #14F195 100%)` : '#E5E7EB',
                            color: publicKey ? 'white' : '#9CA3AF',
                            fontSize: '18px',
                            fontWeight: '700',
                            cursor: publicKey && !loading ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s ease',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Processing...' : (publicKey
                            ? (activeTab === 'deposit' ? 'Deposit SOL' : 'Withdraw jSOLi')
                            : 'Connect Wallet')}
                    </button>

                    {!connected && mounted && (
                        <div style={{ marginTop: '16px', textAlign: 'center' }}>
                            <WalletMultiButton style={{ width: '100%', justifyContent: 'center' }} />
                        </div>
                    )}
                </div>

                {/* Allocation Display */}
                <div style={{
                    marginTop: '24px',
                    background: c.card,
                    borderRadius: '16px',
                    padding: '20px',
                    width: '100%',
                    maxWidth: '480px',
                    border: `1px solid ${c.cardBorder}`
                }}>
                    <h3 style={{ color: c.text, fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
                        Protocol Allocations
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {ALLOCATIONS.map((a) => (
                            <div key={a.protocol} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: a.color
                                }} />
                                <span style={{ color: c.text, fontSize: '14px', flex: 1 }}>{a.protocol}</span>
                                <span style={{ color: c.textMuted, fontSize: '14px' }}>{a.percentage}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer style={{ padding: '20px 24px', textAlign: 'center', borderTop: `1px solid ${c.cardBorder}` }}>
                {/* Access Links Bar */}
                <AccessLinks
                    theme={theme}
                    isPaused={isPaused}
                    onTutorialClick={reopenTutorial}
                    onTreasuryClick={() => setShowTreasury(true)}
                />

                <div style={{
                    marginTop: '24px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '12px',
                    color: c.textLight
                }}>
                    <div style={{
                        background: c.accent,
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '14px'
                    }}>
                        ✉️
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: '500' }}>
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
