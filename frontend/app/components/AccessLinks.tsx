'use client';

import { useState } from 'react';

interface AccessLinksProps {
    theme: 'light' | 'dark';
    isPaused: boolean;
    onTutorialClick: () => void;
    onTreasuryClick: () => void;
}

// Links configuration
const LINKS = {
    contract: 'https://explorer.solana.com/address/DSBLsQNcR9UVnoqbBw2cVvQUXj9PkHzp22xBq9ow8NdV?cluster=devnet',
    audit: 'https://github.com/Jubilee-Protocol/jSOLi/blob/main/docs/AUDIT_REPORT.md',
    faq: 'https://github.com/Jubilee-Protocol/jSOLi#readme',
    learnMore: 'https://github.com/Jubilee-Protocol/jSOLi',
};

export function AccessLinks({ theme, isPaused, onTutorialClick, onTreasuryClick }: AccessLinksProps) {
    const c = theme === 'dark' ? {
        bg: 'rgba(30, 30, 45, 0.8)',
        text: '#ffffff',
        textMuted: '#a0a0b0',
        link: '#9945FF',
        linkHover: '#14F195',
        statusActive: '#14F195',
        statusPaused: '#ff6b6b',
    } : {
        bg: 'rgba(255, 255, 255, 0.9)',
        text: '#1a1a2e',
        textMuted: '#666680',
        link: '#9945FF',
        linkHover: '#7c35db',
        statusActive: '#22c55e',
        statusPaused: '#ef4444',
    };

    const linkStyle: React.CSSProperties = {
        color: c.link,
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '8px 12px',
        borderRadius: '8px',
        transition: 'all 0.2s',
        cursor: 'pointer',
    };

    return (
        <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '16px 24px',
            background: c.bg,
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            marginBottom: '24px',
        }}>
            {/* Status Indicator */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                background: theme === 'dark' ? 'rgba(20, 241, 149, 0.1)' : 'rgba(34, 197, 94, 0.1)',
            }}>
                <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isPaused ? c.statusPaused : c.statusActive,
                    boxShadow: `0 0 8px ${isPaused ? c.statusPaused : c.statusActive}`,
                }} />
                <span style={{
                    color: isPaused ? c.statusPaused : c.statusActive,
                    fontWeight: '600',
                    fontSize: '14px',
                }}>
                    {isPaused ? 'Paused' : 'Active'}
                </span>
            </div>

            {/* Divider */}
            <div style={{
                width: '1px',
                height: '24px',
                background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb',
            }} />

            {/* Links */}
            <a
                href={LINKS.contract}
                target="_blank"
                rel="noopener noreferrer"
                style={linkStyle}
                onMouseEnter={(e) => e.currentTarget.style.color = c.linkHover}
                onMouseLeave={(e) => e.currentTarget.style.color = c.link}
            >
                Contract ↗
            </a>

            <a
                href={LINKS.audit}
                target="_blank"
                rel="noopener noreferrer"
                style={linkStyle}
                onMouseEnter={(e) => e.currentTarget.style.color = c.linkHover}
                onMouseLeave={(e) => e.currentTarget.style.color = c.link}
            >
                Audit ↗
            </a>

            <a
                href={LINKS.faq}
                target="_blank"
                rel="noopener noreferrer"
                style={linkStyle}
                onMouseEnter={(e) => e.currentTarget.style.color = c.linkHover}
                onMouseLeave={(e) => e.currentTarget.style.color = c.link}
            >
                FAQ ↗
            </a>

            <a
                href={LINKS.learnMore}
                target="_blank"
                rel="noopener noreferrer"
                style={linkStyle}
                onMouseEnter={(e) => e.currentTarget.style.color = c.linkHover}
                onMouseLeave={(e) => e.currentTarget.style.color = c.link}
            >
                Learn More ↗
            </a>

            {/* Divider */}
            <div style={{
                width: '1px',
                height: '24px',
                background: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb',
            }} />

            {/* Tutorial Button */}
            <button
                onClick={onTutorialClick}
                style={{
                    ...linkStyle,
                    background: 'none',
                    border: 'none',
                }}
            >
                📚 Tutorial
            </button>

            {/* Treasury Button */}
            <button
                onClick={onTreasuryClick}
                style={{
                    ...linkStyle,
                    background: 'linear-gradient(135deg, rgba(153, 69, 255, 0.1) 0%, rgba(20, 241, 149, 0.1) 100%)',
                    border: 'none',
                }}
            >
                🏛️ Treasury
            </button>
        </div>
    );
}
