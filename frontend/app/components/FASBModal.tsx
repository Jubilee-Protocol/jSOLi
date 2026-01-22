import { useState } from 'react';
import { TransactionRecord } from '../hooks/useTransactionHistory';

interface FASBModalProps {
    isOpen: boolean;
    onClose: () => void;
    history: TransactionRecord[];
    loading: boolean;
    theme: 'light' | 'dark';
    currentValue: number;
}

export function FASBModal({ isOpen, onClose, history, loading, theme, currentValue }: FASBModalProps) {
    const [activeTab, setActiveTab] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4' | 'YTD' | 'Custom'>('Q1');

    if (!isOpen) return null;

    const c = theme === 'dark' ? {
        bg: '#1a1a2e',
        text: '#ffffff',
        textMuted: '#a0a0b0',
        border: 'rgba(153, 69, 255, 0.2)',
        cardBg: '#131320',
        green: '#14F195',
        accent: '#9945FF'
    } : {
        bg: '#ffffff',
        text: '#1a1a2e',
        textMuted: '#666680',
        border: 'rgba(153, 69, 255, 0.15)',
        cardBg: '#f9fafb',
        green: '#10b981',
        accent: '#9945FF'
    };

    // MVP: Cost basis estimated as 0 or simplified sum if needed.
    // For now using 0 as per plan until historical price data is available.
    const costBasis = history
        .filter(tx => tx.type === 'Deposit' && tx.status === 'Success')
        .reduce((acc, tx) => acc + (tx.amount * 150), 0); // Placeholder assumption: 150/SOL

    const unrealizedGain = Math.max(0, currentValue - costBasis);
    const percentGain = costBasis > 0 ? (unrealizedGain / costBasis) * 100 : 0;

    const downloadCSV = () => {
        const headers = ['Date', 'Type', 'Amount (SOL)', 'Status', 'Signature'];
        const rows = history.map(tx => [
            new Date(tx.blockTime * 1000).toLocaleString(),
            tx.type,
            tx.amount.toFixed(4),
            tx.status,
            tx.signature
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "jsoli_transaction_history.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }} onClick={onClose}>
            <div style={{
                background: c.bg,
                border: `1px solid ${c.border}`,
                borderRadius: '24px',
                width: '100%',
                maxWidth: '600px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 60px -10px rgba(0,0,0,0.5)'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>📊</span>
                        <h2 style={{ fontSize: '18px', fontWeight: '600', color: c.text }}>FASB Fair Value Report</h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            color: c.text,
                            padding: '6px 12px',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        Close
                    </button>
                </div>

                {/* Reporting Period Tabs */}
                <div>
                    <label style={{ display: 'block', color: c.textMuted, fontSize: '12px', marginBottom: '8px', fontWeight: '600', letterSpacing: '0.5px' }}>
                        REPORTING PERIOD
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {['Q1', 'Q2', 'Q3', 'Q4', 'YTD', 'Custom'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    borderRadius: '8px',
                                    border: activeTab === tab ? `1px solid ${c.accent}` : '1px solid transparent',
                                    background: activeTab === tab ? c.accent : 'rgba(255,255,255,0.05)',
                                    color: activeTab === tab ? '#fff' : c.text,
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Summary Cards */}
                <div style={{
                    background: c.cardBg,
                    borderRadius: '16px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                }}>
                    <h3 style={{ color: c.text, fontSize: '16px', fontWeight: '600' }}>Current Holdings</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ color: c.textMuted, fontSize: '13px' }}>jSOLi Balance</div>
                            <div style={{ color: c.text, fontSize: '24px', fontWeight: '700' }}>
                                ---
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ color: c.textMuted, fontSize: '13px' }}>Fair Value (USD)</div>
                            <div style={{ color: c.text, fontSize: '24px', fontWeight: '700' }}>
                                ${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{
                    background: c.cardBg,
                    borderRadius: '16px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    <h3 style={{ color: c.text, fontSize: '16px', fontWeight: '600' }}>Period Summary ({activeTab} 2026)</h3>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <span style={{ color: c.textMuted }}>Cost Basis:</span>
                        <span style={{ color: c.text }}>${costBasis.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <span style={{ color: c.textMuted }}>Current Fair Value:</span>
                        <span style={{ color: c.text }}>${currentValue.toLocaleString()}</span>
                    </div>

                    <div style={{ height: '1px', background: c.border, margin: '4px 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: c.text, fontWeight: '600' }}>Unrealized Gain/Loss:</span>
                        <span style={{ color: c.green, fontWeight: '700', fontSize: '16px' }}>
                            +${unrealizedGain.toFixed(2)} ({percentGain.toFixed(1)}%)
                        </span>
                    </div>
                </div>

                {/* Transaction History Table */}
                <div>
                    <h3 style={{ color: c.text, fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Transaction History</h3>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: c.textMuted }}>Loading history...</div>
                    ) : history.length === 0 ? (
                        <div style={{
                            background: c.cardBg,
                            borderRadius: '12px',
                            padding: '30px',
                            textAlign: 'center',
                            color: c.textMuted
                        }}>
                            No transactions found
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            maxHeight: '200px',
                            overflowY: 'auto'
                        }}>
                            {history.map((tx) => (
                                <div key={tx.signature} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '10px',
                                    border: `1px solid ${c.border}`
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span style={{ color: c.text, fontWeight: '500' }}>{tx.type}</span>
                                        <span style={{ color: c.textMuted, fontSize: '12px' }}>
                                            {new Date(tx.blockTime * 1000).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ color: c.text, fontWeight: '600' }}>
                                            {tx.type === 'Deposit' ? '+' : '-'}{tx.amount.toFixed(4)} SOL
                                        </div>
                                        <a
                                            href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: c.accent, fontSize: '11px', textDecoration: 'none' }}
                                        >
                                            View ↗
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Export Button */}
                <button
                    onClick={downloadCSV}
                    style={{
                        background: 'linear-gradient(90deg, #9945FF 0%, #14F195 100%)',
                        border: 'none',
                        padding: '16px',
                        borderRadius: '12px',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '16px',
                        cursor: 'pointer',
                        marginTop: 'auto'
                    }}
                >
                    📥 Export CSV for Accountant
                </button>

                <div style={{ textAlign: 'center', fontSize: '11px', color: c.textMuted }}>
                    Price by CoinGecko · FASB ASU 2023-08 compliant
                </div>

            </div>
        </div>
    );
}
