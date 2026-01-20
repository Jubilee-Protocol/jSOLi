//! Program constants for the jSOLi Vault
//! 
//! All fee values are in basis points (bps) where 10000 bps = 100%

use anchor_lang::prelude::*;

// ============================================================================
// PDA Seeds
// ============================================================================

/// Seed for vault state PDA
pub const VAULT_SEED: &[u8] = b"vault";

/// Seed for jSOL mint authority PDA
pub const JSOLI_MINT_SEED: &[u8] = b"jsoli_mint";

/// Seed for user account PDA
pub const USER_ACCOUNT_SEED: &[u8] = b"user";

/// Seed for withdraw request PDA
pub const WITHDRAW_REQUEST_SEED: &[u8] = b"withdraw";

/// Seed for fee collector PDA
pub const FEE_COLLECTOR_SEED: &[u8] = b"fees";

// ============================================================================
// Fee Configuration
// ============================================================================

/// Default management fee: 0.5% (50 bps)
pub const DEFAULT_MANAGEMENT_FEE_BPS: u16 = 50;

/// Maximum allowed management fee: 1% (100 bps)
pub const MAX_MANAGEMENT_FEE_BPS: u16 = 100;

/// Default performance fee: 10% (1000 bps)
pub const DEFAULT_PERFORMANCE_FEE_BPS: u16 = 1000;

/// Maximum allowed performance fee: 20% (2000 bps)
pub const MAX_PERFORMANCE_FEE_BPS: u16 = 2000;

// ============================================================================
// Allocation Configuration
// ============================================================================

/// Maximum allocation per protocol: 50% (5000 bps)
pub const MAX_PROTOCOL_ALLOCATION_BPS: u16 = 5000;

/// Total allocation must equal 100% (10000 bps)
pub const TOTAL_ALLOCATION_BPS: u16 = 10000;

/// Maximum number of supported protocols
pub const MAX_PROTOCOLS: usize = 10;

// ============================================================================
// Limits
// ============================================================================

/// Minimum deposit: 0.1 SOL (100,000,000 lamports)
pub const MIN_DEPOSIT_LAMPORTS: u64 = 100_000_000;

/// Minimum initial shares to burn on first deposit (prevents first-depositor attack)
/// These shares are effectively "dead" and protect against share price manipulation
pub const MINIMUM_INITIAL_SHARES: u64 = 1_000;

/// Number of epochs for unstaking
pub const UNSTAKING_EPOCHS: u8 = 1;

// ============================================================================
// Precision
// ============================================================================

/// Basis points denominator (100%)
pub const BPS_DENOMINATOR: u64 = 10_000;

/// Share precision for accurate calculations (1e9)
pub const SHARE_PRECISION: u64 = 1_000_000_000;

// ============================================================================
// Oracle Configuration
// ============================================================================

/// Maximum oracle staleness in seconds
pub const MAX_ORACLE_STALENESS_SECS: i64 = 60;

/// Maximum allowed oracle price deviation: 5%
pub const MAX_ORACLE_DEVIATION_BPS: u16 = 500;

// ============================================================================
// Rebalance Configuration
// ============================================================================

/// Default rebalance threshold: 5% deviation from target allocation
pub const DEFAULT_REBALANCE_THRESHOLD_BPS: u16 = 500;

/// Minimum time between rebalances: 1 hour (3600 seconds)
pub const MIN_REBALANCE_INTERVAL_SECS: i64 = 3600;

// ============================================================================
// Protocol Program IDs (Mainnet)
// ============================================================================

/// Marinade Finance Program ID
pub const MARINADE_PROGRAM_ID: &str = "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD";

/// Jito Staking Program ID  
pub const JITO_PROGRAM_ID: &str = "Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb";

/// BlazeStake Program ID
pub const BLAZESTAKE_PROGRAM_ID: &str = "stk9ApL5HeVAwPLr3TLhDXdZS8ptVu7zp6ov8HFDuMi";

/// Lido (Solido) Program ID
pub const LIDO_PROGRAM_ID: &str = "CrX7kMhLC3cSsXJdT7JDgqrRVWGnUpX3gfEfxxU2NVLi";

/// Jupiter Staked SOL Program ID
pub const JUPITER_PROGRAM_ID: &str = "jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v";

// ============================================================================
// LST Token Mints (Mainnet)
// ============================================================================

/// Jito staked SOL (jitoSOL) mint
pub const JITO_SOL_MINT: &str = "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn";

/// Marinade staked SOL (mSOL) mint
pub const MSOL_MINT: &str = "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So";

/// BlazeStake SOL (bSOL) mint
pub const BSOL_MINT: &str = "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1";

/// Lido staked SOL (stSOL) mint
pub const STSOL_MINT: &str = "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj";
