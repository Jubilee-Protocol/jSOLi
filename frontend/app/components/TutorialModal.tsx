'use client';

import { useState, useEffect } from 'react';

interface TutorialModalProps {
    isOpen: boolean;
    onClose: () => void;
    theme: 'light' | 'dark';
    solPrice?: number; // Live SOL price from useSolPrice hook
}

type TutorialStep = 1 | 2 | 3 | 4;

const TUTORIAL_VERSION = 'jsoli_tutorial_v1';

export function useTutorial() {
    const [showTutorial, setShowTutorial] = useState(false);
    const [hasSeenTutorial, setHasSeenTutorial] = useState(true); // Default true to prevent flash

    useEffect(() => {
        const seen = localStorage.getItem(TUTORIAL_VERSION);
        if (!seen) {
            setShowTutorial(true);
            setHasSeenTutorial(false);
        } else {
            setHasSeenTutorial(true);
        }
    }, []);

    const completeTutorial = () => {
        localStorage.setItem(TUTORIAL_VERSION, 'true');
        setShowTutorial(false);
        setHasSeenTutorial(true);
    };

    const reopenTutorial = () => {
        setShowTutorial(true);
    };

    return {
        showTutorial,
        hasSeenTutorial,
        completeTutorial,
        reopenTutorial,
        closeTutorial: () => setShowTutorial(false),
    };
}

export function TutorialModal({ isOpen, onClose, theme, solPrice = 150 }: TutorialModalProps) {
    const [step, setStep] = useState<TutorialStep>(1);

    // Calculate min deposit in USD using live SOL price
    const minDepositUSD = (0.1 * solPrice).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    // Calculate sats equivalent (assuming 1 BTC = $100k for now, 100M sats/BTC)
    const minDepositSats = Math.round((0.1 * solPrice / 100000) * 100000000).toLocaleString();

    const c = theme === 'dark' ? {
        bg: 'rgba(20, 20, 35, 0.98)',
        card: '#1a1a2e',
        text: '#ffffff',
        textMuted: '#a0a0b0',
        border: '#2a2a3e',
        accent: '#9945FF', // Solana Purple
    } : {
        bg: 'rgba(255, 255, 255, 0.98)',
        card: '#ffffff',
        text: '#1a1a2e',
        textMuted: '#666680',
        border: '#e5e7eb',
        accent: '#9945FF', // Solana Purple
    };

    if (!isOpen) return null;

    const handleNext = () => {
        if (step < 4) {
            setStep((s) => (s + 1) as TutorialStep);
        } else {
            onClose();
            setStep(1);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep((s) => (s - 1) as TutorialStep);
        }
    };

    const handleSkip = () => {
        onClose();
        setStep(1);
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
        }}>
            <div style={{
                background: c.card,
                borderRadius: '24px',
                maxWidth: '480px',
                width: '100%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: `1px solid ${c.border}`,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '90vh', // Ensure it fits on screen
            }}>
                {/* Header */}
                <div style={{
                    background: `linear-gradient(135deg, #9945FF 0%, #14F195 100%)`, // Solana Gradient
                    padding: '24px',
                    textAlign: 'center',
                    flexShrink: 0, // Prevent header from shrinking
                }}>
                    <h2 style={{
                        color: 'white',
                        fontSize: '24px',
                        fontWeight: '700',
                        margin: 0,
                    }}>
                        {step === 1 && '💜 Welcome to jSOLi'}
                        {step === 2 && '⚙️ How It Works'}
                        {step === 3 && '💰 Getting Started'}
                        {step === 4 && '🚀 Ready to Deposit'}
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.9)', margin: '8px 0 0', fontSize: '14px' }}>
                        Step {step} of 4
                    </p>
                </div>

                {/* Content */}
                <div style={{
                    padding: '24px',
                    overflowY: 'auto', // Allow scrolling
                    flex: 1, // Take up remaining space
                }}>
                    {step === 1 && (
                        <div>
                            <h3 style={{ color: c.text, fontSize: '18px', marginBottom: '16px' }}>
                                Diversified Staking, Simplified
                            </h3>
                            <p style={{ color: c.textMuted, lineHeight: 1.6, marginBottom: '20px' }}>
                                jSOLi is a Solana Liquid Staking Index that automatically diversifies your SOL
                                across <strong>Marinade</strong>, <strong>Jito</strong>, and <strong>BlazeStake</strong> — the top LST protocols on Solana.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <Feature icon="🔐" text="Non-custodial — You control your tokens" theme={theme} />
                                <Feature icon="⚖️" text="Auto-rebalancing — Optimized yield" theme={theme} />
                                <Feature icon="📈" text="One token — Tracks the SOL staking index" theme={theme} />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div>
                            <h3 style={{ color: c.text, fontSize: '18px', marginBottom: '16px' }}>
                                Deposit SOL, Get jSOLi
                            </h3>
                            {/* Visual Flow */}
                            <div style={{
                                background: theme === 'dark' ? '#0d0d1a' : '#f8f9fa',
                                borderRadius: '12px',
                                padding: '20px',
                                marginBottom: '20px',
                                textAlign: 'center',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                    <Token name="SOL" color="#9945FF" />
                                    <Arrow />
                                    <div style={{
                                        background: c.accent,
                                        borderRadius: '12px',
                                        padding: '12px 20px',
                                        color: 'white',
                                        fontWeight: '600',
                                    }}>
                                        jSOLi Strategy
                                    </div>
                                    <Arrow />
                                    <Token name="jSOLi" color="#14F195" />
                                </div>
                                <div style={{
                                    marginTop: '16px',
                                    fontSize: '13px',
                                    color: c.textMuted,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    gap: '24px',
                                }}>
                                    <span>Marinade</span>
                                    <span>Jito</span>
                                    <span>Blaze</span>
                                </div>
                            </div>
                            <ol style={{ color: c.textMuted, lineHeight: 1.8, paddingLeft: '20px', margin: 0 }}>
                                <li>Deposit your SOL</li>
                                <li>Receive jSOLi tokens</li>
                                <li>Strategy autocompounds staking rewards</li>
                                <li>Withdraw anytime to get SOL back</li>
                            </ol>
                        </div>
                    )}

                    {step === 3 && (
                        <div>
                            <h3 style={{ color: c.text, fontSize: '18px', marginBottom: '16px' }}>
                                You'll Need SOL
                            </h3>
                            <p style={{ color: c.textMuted, lineHeight: 1.6, marginBottom: '20px' }}>
                                Don't have SOL? You can get it easily:
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                                <LinkCard
                                    icon="🏦"
                                    title="Coinbase"
                                    subtitle="Buy SOL directly"
                                    href="https://coinbase.com"
                                    theme={theme}
                                />
                                <LinkCard
                                    icon="🔄"
                                    title="Jupiter"
                                    subtitle="Swap any token for SOL"
                                    href="https://jup.ag"
                                    theme={theme}
                                />
                            </div>
                            <div style={{
                                background: theme === 'dark' ? '#1a1a2e' : '#FEF3C7',
                                border: `1px solid ${theme === 'dark' ? '#2a2a3e' : '#F59E0B'}`,
                                borderRadius: '12px',
                                padding: '16px',
                            }}>
                                <p style={{ margin: 0, color: theme === 'dark' ? '#FCD34D' : '#92400E', fontSize: '14px' }}>
                                    <strong>Recommended deposit:</strong> 0.1 SOL (~{minDepositUSD})
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div>
                            <h3 style={{ color: c.text, fontSize: '18px', marginBottom: '16px' }}>
                                Quick Recap
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                                <Step num={1} text="Connect your Phantom/Solflare wallet" theme={theme} />
                                <Step num={2} text="Enter your SOL deposit amount" theme={theme} />
                                <Step num={3} text="Confirm transaction" theme={theme} />
                                <Step num={4} text="Receive jSOLi & earn yield" theme={theme} />
                            </div>
                            <div style={{
                                background: `linear-gradient(135deg, ${c.accent}15 0%, ${c.accent}05 100%)`,
                                borderRadius: '12px',
                                padding: '16px',
                                textAlign: 'center',
                            }}>
                                <p style={{ margin: 0, color: c.text, fontSize: '14px' }}>
                                    💡 You can reopen this tutorial anytime
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Progress Dots */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '0 24px' }}>
                    {[1, 2, 3, 4].map((s) => (
                        <div
                            key={s}
                            style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: s === step ? c.accent : c.border,
                                transition: 'background 0.2s',
                            }}
                        />
                    ))}
                </div>

                {/* Footer */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '24px',
                    gap: '12px',
                    flexShrink: 0, // Prevent footer from shrinking
                    borderTop: `1px solid ${c.border}`, // Add subtle separation
                    background: c.card, // Ensure background matches
                }}>
                    {step === 1 ? (
                        <button
                            onClick={handleSkip}
                            style={{
                                background: 'transparent',
                                border: `1px solid ${c.border}`,
                                borderRadius: '12px',
                                padding: '12px 24px',
                                color: c.textMuted,
                                cursor: 'pointer',
                                fontSize: '14px',
                            }}
                        >
                            Skip
                        </button>
                    ) : (
                        <button
                            onClick={handleBack}
                            style={{
                                background: 'transparent',
                                border: `1px solid ${c.border}`,
                                borderRadius: '12px',
                                padding: '12px 24px',
                                color: c.text,
                                cursor: 'pointer',
                                fontSize: '14px',
                            }}
                        >
                            ← Back
                        </button>
                    )}
                    <button
                        onClick={handleNext}
                        style={{
                            background: `linear-gradient(135deg, #9945FF 0%, #14F195 100%)`,
                            border: 'none',
                            borderRadius: '12px',
                            padding: '12px 32px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            flex: 1,
                            maxWidth: '200px',
                        }}
                    >
                        {step === 4 ? "Let's Go! 🚀" : 'Next →'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Helper Components
function Feature({ icon, text, theme }: { icon: string; text: string; theme: 'light' | 'dark' }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: theme === 'dark' ? '#0d0d1a' : '#f8f9fa',
            padding: '12px 16px',
            borderRadius: '12px',
        }}>
            <span style={{ fontSize: '20px' }}>{icon}</span>
            <span style={{ color: theme === 'dark' ? '#e0e0e0' : '#374151', fontSize: '14px' }}>{text}</span>
        </div>
    );
}

function Token({ name, color }: { name: string; color: string }) {
    return (
        <div style={{
            background: `${color}20`,
            border: `2px solid ${color}`,
            borderRadius: '12px',
            padding: '8px 16px',
            color: color,
            fontWeight: '600',
            fontSize: '14px',
        }}>
            {name}
        </div>
    );
}

function Arrow() {
    return (
        <span style={{ color: '#9ca3af', fontSize: '18px' }}>→</span>
    );
}

function LinkCard({ icon, title, subtitle, href, theme }: {
    icon: string;
    title: string;
    subtitle: string;
    href: string;
    theme: 'light' | 'dark';
}) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: theme === 'dark' ? '#0d0d1a' : '#f8f9fa',
                padding: '16px',
                borderRadius: '12px',
                textDecoration: 'none',
                border: `1px solid ${theme === 'dark' ? '#2a2a3e' : '#e5e7eb'}`,
                transition: 'transform 0.2s',
            }}
        >
            <span style={{ fontSize: '24px' }}>{icon}</span>
            <div>
                <div style={{ color: theme === 'dark' ? '#fff' : '#1a1a2e', fontWeight: '600', fontSize: '14px' }}>{title}</div>
                <div style={{ color: theme === 'dark' ? '#a0a0b0' : '#6b7280', fontSize: '12px' }}>{subtitle}</div>
            </div>
        </a>
    );
}

function Step({ num, text, theme }: { num: number; text: string; theme: 'light' | 'dark' }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
        }}>
            <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: '#9945FF',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '600',
                fontSize: '14px',
            }}>
                {num}
            </div>
            <span style={{ color: theme === 'dark' ? '#e0e0e0' : '#374151', fontSize: '14px' }}>{text}</span>
        </div>
    );
}
