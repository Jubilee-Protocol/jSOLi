# jSOLi Frontend

A Next.js 14 frontend for the jSOLi vault on Solana, adapted from the jBTCi web app.

## Tech Stack

- **Next.js 14** - React framework
- **Solana Wallet Adapter** - Phantom, Solflare, Ledger support
- **@solana/web3.js** - Solana SDK
- **@coral-xyz/anchor** - Anchor client
- **TailwindCSS 4** - Styling

## Setup

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with your RPC endpoints

# Run development server
npm run dev
```

## Environment Variables

```env
# Network: 'devnet' or 'mainnet-beta'
NEXT_PUBLIC_NETWORK=devnet

# Optional: Custom RPC endpoints (recommended for production)
NEXT_PUBLIC_DEVNET_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_MAINNET_RPC=https://your-rpc-provider.com

# Program ID (use deployed program address)
NEXT_PUBLIC_PROGRAM_ID=EYJcdmSJEEtkTLHhgDCvGci1GgEthDe4RFn1tV2PoZu3
```

## Features (Planned)

- [x] Wallet connection (Phantom, Solflare, Ledger)
- [ ] Deposit SOL → receive jSOLi
- [ ] Withdraw jSOLi → receive SOL
- [ ] View allocations across protocols
- [ ] Real-time share price
- [ ] Withdrawal request status
- [ ] FASB-compliant dashboard (treasury mode)

## Building for Production

```bash
npm run build
npm start
```

## Deployment

Deploy to Vercel:
```bash
vercel deploy --prod
```
