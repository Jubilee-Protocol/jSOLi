'use client';

import { useState } from 'react';

interface TreasuryModalProps {
    isOpen: boolean;
    onClose: () => void;
    theme: 'light' | 'dark';
}

export function TreasuryModal({ isOpen, onClose, theme }: TreasuryModalProps) {
    const c = theme === 'dark' ? {
        bg: 'rgba(20, 20, 35, 0.95)',
        card: 'rgba(30, 30, 45, 0.98)',
        text: '#ffffff',
        textMuted: '#a0a0b0',
        accent: '#9945FF',
        success: '#14F195',
        warning: '#fbbf24',
    } : {
        bg: 'rgba(0, 0, 0, 0.6)',
        card: '#ffffff',
        text: '#1a1a2e',
        textMuted: '#666680',
        accent: '#9945FF',
        success: '#14F195',
        warning: '#f59e0b',
    };

    if (!isOpen) return null;

    const handleCreateSquads = () => {
        // Direct link to Squads app for creating a new multisig
        window.open('https://v4.squads.so/squads', '_blank');
    };

    const handleExistingSquads = () => {
        // Link to Squads app dashboard
        window.open('https://v4.squads.so/', '_blank');
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: c.bg,
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
        }}>
            <div style={{
                background: c.card,
                borderRadius: '20px',
                maxWidth: '480px',
                width: '100%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
                border: theme === 'dark' ? '1px solid rgba(153, 69, 255, 0.3)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '90vh', // Ensure it doesn't exceed screen height
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px 24px',
                    borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
                    flexShrink: 0, // Prevent header from shrinking
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                    }}>
                        <span style={{ fontSize: '24px' }}>🏛️</span>
                        <span style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            color: c.text,
                        }}>
                            Treasury Mode
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: c.accent,
                            color: 'white',
                            border: 'none',
                            padding: '6px 16px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                        }}
                    >
                        Close
                    </button>
                </div>

                {/* Content */}
                <div style={{
                    padding: '24px',
                    overflowY: 'auto', // Allow scrolling
                    flex: 1, // Fill available space
                }}>
                    <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: c.text,
                        marginBottom: '12px',
                    }}>
                        Multi-Signature Accountability
                    </h3>
                    <p style={{
                        fontSize: '14px',
                        color: c.textMuted,
                        marginBottom: '20px',
                        lineHeight: '1.6',
                    }}>
                        A <strong style={{ color: c.text }}>multisig wallet</strong> requires multiple people to approve transactions before they execute—like how organizations require multiple signatures on financial documents. This prevents any single person from moving funds unilaterally.
                    </p>

                    {/* Features */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                        {[
                            { icon: '✓', title: 'Non-Custodial Sovereignty', desc: 'Your organization controls the keys' },
                            { icon: '✓', title: 'Accountability Trail', desc: 'Every approval recorded on-chain' },
                            { icon: '✓', title: 'Prevent Unauthorized Transfers', desc: 'No single person can move funds alone' },
                        ].map((feature, i) => (
                            <div key={i} style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                            }}>
                                <span style={{
                                    background: c.success,
                                    color: '#000',
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    flexShrink: 0,
                                }}>
                                    {feature.icon}
                                </span>
                                <div>
                                    <div style={{ fontWeight: '500', color: c.text, fontSize: '14px' }}>
                                        {feature.title}
                                    </div>
                                    <div style={{ fontSize: '13px', color: c.textMuted }}>
                                        {feature.desc}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Cost Info */}
                    <div style={{
                        background: theme === 'dark' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        border: `1px solid ${c.warning}`,
                        borderRadius: '12px',
                        padding: '14px 16px',
                        marginBottom: '20px',
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                        }}>
                            <span style={{ fontSize: '16px' }}>💡</span>
                            <div>
                                <div style={{ fontWeight: '600', color: c.text, fontSize: '13px', marginBottom: '4px' }}>
                                    Cost: ~0.0111 SOL
                                </div>
                                <div style={{ fontSize: '12px', color: c.textMuted, lineHeight: '1.5' }}>
                                    Creating a Squads multisig requires a small SOL deposit for on-chain rent (~0.0111 SOL).
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* How to Login Info */}
                    <div style={{
                        background: theme === 'dark' ? 'rgba(153, 69, 255, 0.1)' : 'rgba(153, 69, 255, 0.05)',
                        border: `1px solid ${theme === 'dark' ? 'rgba(153, 69, 255, 0.3)' : 'rgba(153, 69, 255, 0.2)'}`,
                        borderRadius: '12px',
                        padding: '14px 16px',
                        marginBottom: '24px',
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                        }}>
                            <span style={{ fontSize: '16px' }}>🔑</span>
                            <div>
                                <div style={{ fontWeight: '600', color: c.text, fontSize: '13px', marginBottom: '4px' }}>
                                    How to Use with jSOLi
                                </div>
                                <div style={{ fontSize: '12px', color: c.textMuted, lineHeight: '1.5' }}>
                                    1. Create a Squads wallet → 2. Add team members → 3. Connect Squads wallet to jSOLi → 4. Deposit requires multiple signatures
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Buttons */}
                    <button
                        onClick={handleCreateSquads}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '15px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            marginBottom: '12px',
                        }}
                    >
                        Create New Squads Wallet
                    </button>
                    <button
                        onClick={handleExistingSquads}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: 'transparent',
                            color: c.text,
                            border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.2)' : '#e5e7eb'}`,
                            borderRadius: '10px',
                            fontSize: '15px',
                            fontWeight: '500',
                            cursor: 'pointer',
                        }}
                    >
                        I Already Have a Squads Wallet
                    </button>

                    {/* Learn More */}
                    <p style={{
                        textAlign: 'center',
                        marginTop: '16px',
                        fontSize: '12px',
                        color: c.textMuted,
                    }}>
                        <a
                            href="https://squads.so"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: c.accent, textDecoration: 'none' }}
                        >
                            Learn more about Squads →
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
