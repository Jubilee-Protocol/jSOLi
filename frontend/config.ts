// jSOLi Configuration
// Solana Program and Token Configuration

import { PublicKey } from '@solana/web3.js';

// Environment
export const IS_MAINNET = process.env.NEXT_PUBLIC_NETWORK === 'mainnet-beta';
export const IS_DEVNET = !IS_MAINNET;

// RPC Endpoints
export const RPC_ENDPOINTS = {
  mainnet: process.env.NEXT_PUBLIC_MAINNET_RPC || 'https://api.mainnet-beta.solana.com',
  devnet: process.env.NEXT_PUBLIC_DEVNET_RPC || 'https://api.devnet.solana.com',
};

export const RPC_ENDPOINT = IS_MAINNET ? RPC_ENDPOINTS.mainnet : RPC_ENDPOINTS.devnet;

// Program IDs
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || 'EYJcdmSJEEtkTLHhgDCvGci1GgEthDe4RFn1tV2PoZu3'
);

// PDA Seeds (must match Rust constants)
export const VAULT_SEED = 'vault';
export const JSOLI_MINT_SEED = 'jsol_mint'; // Will be 'jsoli_mint' after full rename
export const USER_ACCOUNT_SEED = 'user';
export const WITHDRAW_REQUEST_SEED = 'withdraw';

// Token Decimals
export const SOL_DECIMALS = 9;
export const JSOLI_DECIMALS = 9;

// UI Configuration
export const APP_NAME = 'jSOLi';
export const APP_DESCRIPTION = 'The Solana Staking Index - Diversified passive yield across top LST protocols';

// Links
export const LINKS = {
  github: 'https://github.com/Jubilee-Protocol/jSOLi',
  twitter: 'https://twitter.com/jubileeprotocol',
  audit: 'https://github.com/Jubilee-Protocol/jSOLi/blob/main/docs/AUDIT_REPORT.md',
  docs: 'https://github.com/Jubilee-Protocol/jSOLi#readme',
  explorer: IS_MAINNET 
    ? 'https://solscan.io'
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
