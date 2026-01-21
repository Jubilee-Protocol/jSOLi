import { Providers } from './providers';
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    metadataBase: new URL('https://mint.jsoli.xyz'),
    title: 'jSOLi | Solana Staking Index',
    description: 'The first Solana Staking Index. Earn yield on diversified SOL exposure through Marinade, Jito, and BlazeStake.',
    keywords: ['jSOLi', 'Solana', 'Index Fund', 'LST', 'DeFi', 'Marinade', 'Jito', 'BlazeStake'],
    icons: {
        icon: '/jubilee-logo-pink.png',
        apple: '/jubilee-logo-pink.png',
    },
    openGraph: {
        title: 'jSOLi | Solana Staking Index',
        description: 'The first Solana Staking Index. Earn ~7% APY on diversified SOL exposure.',
        url: 'https://mint.jsoli.xyz',
        siteName: 'jSOLi',
        images: [
            {
                url: 'https://mint.jsoli.xyz/og-image.png',
                width: 625,
                height: 625,
                alt: 'jSOLi - Solana Staking Index',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'jSOLi | Solana Staking Index',
        description: 'The first Solana Staking Index. Earn ~7% APY on diversified SOL exposure.',
        images: ['https://mint.jsoli.xyz/og-image.png'],
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="format-detection" content="telephone=no" />
            </head>
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
