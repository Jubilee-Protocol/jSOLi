'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const TERMS_VERSION = 'jsoli_terms_v1';

interface TermsModalProps {
    isOpen: boolean;
    onAccept: () => void;
    theme: 'light' | 'dark';
}

export function useTerms() {
    const [showTerms, setShowTerms] = useState(false);
    const [hasAcceptedTerms, setHasAcceptedTerms] = useState(true); // Default true to prevent flash

    useEffect(() => {
        const accepted = localStorage.getItem(TERMS_VERSION);
        if (!accepted) {
            setShowTerms(true);
            setHasAcceptedTerms(false);
        } else {
            setHasAcceptedTerms(true);
        }
    }, []);

    const acceptTerms = (remember: boolean) => {
        if (remember) {
            localStorage.setItem(TERMS_VERSION, 'true');
        }
        setShowTerms(false);
        setHasAcceptedTerms(true);
    };

    return {
        showTerms,
        hasAcceptedTerms,
        acceptTerms,
    };
}

export function TermsModal({ isOpen, onAccept, theme }: TermsModalProps) {
    const [rememberDevice, setRememberDevice] = useState(true);

    const c = theme === 'dark' ? {
        bg: 'rgba(20, 20, 35, 0.98)',
        card: '#ffffff',
        text: '#1a1a2e',
        textMuted: '#666680',
        border: '#e5e7eb',
        accent: '#9945FF',
        accentHover: '#7c35db',
    } : {
        bg: 'rgba(255, 255, 255, 0.98)',
        card: '#ffffff',
        text: '#1a1a2e',
        textMuted: '#666680',
        border: '#e5e7eb',
        accent: '#9945FF',
        accentHover: '#7c35db',
    };

    if (!isOpen) return null;

    const handleAccept = () => {
        onAccept();
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
        }}>
            <div style={{
                background: c.card,
                borderRadius: '24px',
                maxWidth: '480px',
                width: '100%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden',
            }}>
                {/* Header with Logo */}
                <div style={{
                    textAlign: 'center',
                    padding: '32px 24px 16px',
                }}>
                    {/* Jubilee Logo + jSOLi */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        marginBottom: '12px',
                    }}>
                        <Image
                            src="/jubilee-logo-pink.png"
                            alt="Jubilee Protocol"
                            width={40}
                            height={40}
                            style={{ borderRadius: '8px' }}
                        />
                        <span style={{
                            fontSize: '28px',
                            fontWeight: 'bold',
                            color: c.text,
                        }}>
                            jSOLi
                        </span>
                    </div>
                    <div style={{
                        fontSize: '20px',
                        fontWeight: '600',
                        color: c.accent,
                    }}>
                        Terms of Use
                    </div>
                </div>

                {/* Terms Content */}
                <div style={{
                    padding: '0 24px 24px',
                }}>
                    <div style={{
                        background: '#f8f9fa',
                        borderRadius: '16px',
                        padding: '20px',
                        fontSize: '14px',
                        lineHeight: '1.7',
                        color: c.text,
                        maxHeight: '300px',
                        overflowY: 'auto',
                    }}>
                        <p style={{ marginBottom: '16px' }}>
                            <strong>By using jSOLi, a product of Jubilee Protocol governed by Hundredfold Foundation and developed by Jubilee Labs, you acknowledge and agree:</strong>
                        </p>

                        <p style={{ marginBottom: '12px' }}>
                            <span style={{ color: c.accent, fontWeight: '600' }}>(a)</span> jSOLi is provided on an "AS-IS" and "AS AVAILABLE" basis. Hundredfold Foundation, Jubilee Labs, and their affiliates expressly disclaim all representations, warranties, and conditions of any kind, whether express, implied, or statutory.
                        </p>

                        <p style={{ marginBottom: '12px' }}>
                            <span style={{ color: c.accent, fontWeight: '600' }}>(b)</span> Neither Hundredfold Foundation nor Jubilee Labs makes any warranty that jSOLi will meet your requirements, be available on an uninterrupted, timely, secure, or error-free basis, or be accurate, reliable, or free of harmful code.
                        </p>

                        <p style={{ marginBottom: '12px' }}>
                            <span style={{ color: c.accent, fontWeight: '600' }}>(c)</span> You shall have no claim against Hundredfold Foundation, Jubilee Labs, or their affiliates for any loss arising from your use of jSOLi or Jubilee Protocol products.
                        </p>

                        <p style={{ marginBottom: '12px' }}>
                            <span style={{ color: c.accent, fontWeight: '600' }}>(d)</span> DeFi protocols carry significant risks including: smart contract vulnerabilities, market volatility, oracle failures, LST depegs, and potential total loss of deposited funds.
                        </p>

                        <p>
                            <span style={{ color: c.accent, fontWeight: '600' }}>(e)</span> This is not financial, legal, or tax advice. You are solely responsible for your own investment decisions and due diligence.
                        </p>
                    </div>

                    {/* Remember checkbox */}
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        marginTop: '20px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: c.textMuted,
                    }}>
                        <input
                            type="checkbox"
                            checked={rememberDevice}
                            onChange={(e) => setRememberDevice(e.target.checked)}
                            style={{
                                width: '18px',
                                height: '18px',
                                cursor: 'pointer',
                            }}
                        />
                        Remember this device
                    </label>

                    {/* Accept Button */}
                    <button
                        onClick={handleAccept}
                        style={{
                            width: '100%',
                            padding: '16px',
                            marginTop: '20px',
                            background: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#1d4ed8'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#2563eb'}
                    >
                        I Understand & Accept
                    </button>

                    {/* Footer text */}
                    <p style={{
                        textAlign: 'center',
                        marginTop: '16px',
                        fontSize: '12px',
                        color: c.textMuted,
                    }}>
                        By clicking Accept, you agree to the Jubilee Protocol Terms of Service
                    </p>
                </div>
            </div>
        </div>
    );
}
