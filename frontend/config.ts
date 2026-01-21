// jSOLi Configuration
// Solana Program and Token Configuration

import { PublicKey } from '@solana/web3.js';

// Environment - Check for local development first
export const IS_LOCAL = process.env.NEXT_PUBLIC_NETWORK === 'local' || process.env.NODE_ENV === 'development';
export const IS_MAINNET = process.env.NEXT_PUBLIC_NETWORK === 'mainnet-beta';
export const IS_DEVNET = !IS_MAINNET && !IS_LOCAL;

// RPC Endpoints
export const RPC_ENDPOINTS = {
  local: 'http://localhost:8899',
  mainnet: process.env.NEXT_PUBLIC_MAINNET_RPC || 'https://api.mainnet-beta.solana.com',
  devnet: process.env.NEXT_PUBLIC_DEVNET_RPC || 'https://api.devnet.solana.com',
};

// Use localhost for development by default
export const RPC_ENDPOINT = IS_LOCAL
  ? RPC_ENDPOINTS.local
  : IS_MAINNET
    ? RPC_ENDPOINTS.mainnet
    : RPC_ENDPOINTS.devnet;

// Program IDs - All networks use the same deployed program
const PROGRAM_IDS = {
  local: 'DSBLsQNcR9UVnoqbBw2cVvQUXj9PkHzp22xBq9ow8NdV',
  devnet: 'DSBLsQNcR9UVnoqbBw2cVvQUXj9PkHzp22xBq9ow8NdV',  // Deployed Jan 21, 2026
  mainnet: 'DSBLsQNcR9UVnoqbBw2cVvQUXj9PkHzp22xBq9ow8NdV', // Same program ID
};

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || (IS_LOCAL ? PROGRAM_IDS.local : PROGRAM_IDS.devnet)
);

// PDA Seeds (must match Rust constants)
export const VAULT_SEED = 'vault';
export const JSOLI_MINT_SEED = 'jsoli_mint'; // Note: with 'i'
export const USER_ACCOUNT_SEED = 'user';
export const WITHDRAW_REQUEST_SEED = 'withdraw';

// Token Decimals
export const SOL_DECIMALS = 9;
export const JSOLI_DECIMALS = 9;

// UI Configuration
export const APP_NAME = 'jSOLi';
export const APP_DESCRIPTION = 'The Solana Staking Index - Diversified passive yield across top LST protocols';

// Production URLs
export const PRODUCTION_URL = 'https://mint.jsoli.xyz';
export const LANDING_URL = 'https://jsoli.xyz';

// Links
export const LINKS = {
  app: 'https://mint.jsoli.xyz',
  landing: 'https://jsoli.xyz',
  github: 'https://github.com/Jubilee-Protocol/jSOLi',
  twitter: 'https://twitter.com/jubileeprotocol',
  audit: 'https://github.com/Jubilee-Protocol/jSOLi/blob/main/docs/AUDIT_REPORT.md',
  docs: 'https://github.com/Jubilee-Protocol/jSOLi#readme',
  explorer: IS_MAINNET
    ? 'https://solscan.io'
    : IS_LOCAL
      ? 'http://localhost:8899'
      : 'https://solscan.io/?cluster=devnet',
};

// Fee Display
export const MANAGEMENT_FEE_DISPLAY = '0.5%';
export const PERFORMANCE_FEE_DISPLAY = '10%';

// Target APY (for display)
export const TARGET_APY_LOW = 6.8;
export const TARGET_APY_HIGH = 7.2;

// Protocol Allocations (for display)
export const ALLOCATIONS = [
  { protocol: 'Jito', percentage: 30, color: '#FF6B6B' },
  { protocol: 'Marinade', percentage: 30, color: '#4ECDC4' },
  { protocol: 'BlazeStake', percentage: 20, color: '#45B7D1' },
  { protocol: 'Lido', percentage: 10, color: '#96CEB4' },
  { protocol: 'Native', percentage: 10, color: '#FFEAA7' },
];

// Wallet Configuration
export const SUPPORTED_WALLETS = [
  'Phantom',
  'Solflare',
  'Backpack',
  'Ledger',
];

// Helper Functions
export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatSOL(lamports: number): string {
  return (lamports / 1e9).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

export function formatUSD(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}
