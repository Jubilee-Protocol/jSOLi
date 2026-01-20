//! On-chain state accounts for the jSOL Vault
//!
//! This module defines all account structures stored on-chain.

use anchor_lang::prelude::*;
use crate::constants::*;

// ============================================================================
// Enums
// ============================================================================

/// Supported LST protocols
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum LstProtocol {
    /// Jito staked SOL (jitoSOL)
    Jito,
    /// Marinade staked SOL (mSOL)
    Marinade,
    /// BlazeStake SOL (bSOL)
    BlazeStake,
    /// Lido staked SOL (stSOL)
    Lido,
    /// Native Solana staking
    Native,
    /// Jupiter staked SOL (JupSOL)
    Jupiter,
}

/// Status of a withdrawal request
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, Default)]
pub enum WithdrawStatus {
    /// Request is pending and waiting for unstaking period
    #[default]
    Pending,
    /// Request is ready to be completed
    Ready,
    /// Request has been completed
    Completed,
    /// Request was cancelled
    Cancelled,
}

// ============================================================================
// Structs
// ============================================================================

/// Protocol allocation configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, Default)]
pub struct Allocation {
    /// The LST protocol
    pub protocol: u8, // Stored as u8 for space efficiency, maps to LstProtocol
    /// Target allocation in basis points (0-10000)
    pub target_bps: u16,
    /// Current actual allocation in basis points
    pub current_bps: u16,
    /// Amount of SOL value in this protocol
    pub amount: u64,
}

impl Allocation {
    /// Size of Allocation struct in bytes
    pub const LEN: usize = 1 + 2 + 2 + 8; // 13 bytes
}

/// Vault configuration parameters
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug)]
pub struct VaultConfig {
    /// Management fee in basis points
    pub management_fee_bps: u16,
    /// Performance fee in basis points
    pub performance_fee_bps: u16,
    /// Rebalance threshold in basis points
    pub rebalance_threshold_bps: u16,
    /// Maximum slippage allowed in basis points
    pub max_slippage_bps: u16,
    /// Deposit cap in lamports (0 = no cap)
    pub deposit_cap: u64,
    /// Whether the vault is paused
    pub is_paused: bool,
}

impl Default for VaultConfig {
    fn default() -> Self {
        Self {
            management_fee_bps: DEFAULT_MANAGEMENT_FEE_BPS,
            performance_fee_bps: DEFAULT_PERFORMANCE_FEE_BPS,
            rebalance_threshold_bps: DEFAULT_REBALANCE_THRESHOLD_BPS,
            max_slippage_bps: 100, // 1% default slippage
            deposit_cap: 0,        // No cap by default
            is_paused: false,
        }
    }
}

impl VaultConfig {
    /// Size of VaultConfig struct in bytes
    pub const LEN: usize = 2 + 2 + 2 + 2 + 8 + 1; // 17 bytes
}

// ============================================================================
// Account Structures
// ============================================================================

/// Main vault state account
/// 
/// Stores the global state of the jSOL vault including TVL, share info,
/// and protocol allocations.
#[account]
pub struct VaultState {
    /// Bump seed for PDA derivation
    pub bump: u8,
    
    /// Authority that can perform admin operations
    pub authority: Pubkey,
    
    /// jSOLi token mint address
    pub jsoli_mint: Pubkey,
    
    /// Total value locked in the vault (in lamports)
    pub total_tvl: u64,
    
    /// Total jSOL shares outstanding
    pub total_shares: u64,
    
    /// High water mark for performance fee calculation (in lamports per share)
    pub high_water_mark: u64,
    
    /// Accumulated management fees (in lamports)
    pub accrued_management_fees: u64,
    
    /// Accumulated performance fees (in lamports)
    pub accrued_performance_fees: u64,
    
    /// Last fee collection timestamp
    pub last_fee_collection: i64,
    
    /// Last rebalance timestamp
    pub last_rebalance: i64,
    
    /// Number of rebalances performed
    pub rebalance_count: u64,
    
    /// Number of unique depositors
    pub depositor_count: u64,
    
    /// Vault configuration
    pub config: VaultConfig,
    
    /// Number of active allocations
    pub num_allocations: u8,
    
    /// Protocol allocations (fixed size array)
    pub allocations: [Allocation; MAX_PROTOCOLS],
    
    /// Reserved space for future upgrades
    pub reserved: [u8; 128],
}

impl VaultState {
    /// Size of VaultState account in bytes
    pub const LEN: usize = 8 + // Anchor discriminator
        1 +                    // bump
        32 +                   // authority
        32 +                   // jsoli_mint
        8 +                    // total_tvl
        8 +                    // total_shares
        8 +                    // high_water_mark
        8 +                    // accrued_management_fees
        8 +                    // accrued_performance_fees
        8 +                    // last_fee_collection
        8 +                    // last_rebalance
        8 +                    // rebalance_count
        8 +                    // depositor_count
        VaultConfig::LEN +     // config
        1 +                    // num_allocations
        (Allocation::LEN * MAX_PROTOCOLS) + // allocations
        128;                   // reserved
    
    /// Calculate the current share price (value per share in lamports)
    /// Returns error on overflow instead of masking with unwrap_or
    pub fn share_price(&self) -> Result<u64, anchor_lang::error::Error> {
        use crate::errors::VaultError;
        if self.total_shares == 0 {
            Ok(SHARE_PRECISION)
        } else {
            let result = (self.total_tvl as u128)
                .checked_mul(SHARE_PRECISION as u128)
                .ok_or(VaultError::MathOverflow)?
                .checked_div(self.total_shares as u128)
                .ok_or(VaultError::DivisionByZero)?;
            Ok(result as u64)
        }
    }
    
    /// Calculate shares for a given deposit amount
    /// Implements first-depositor protection by requiring minimum shares
    pub fn calculate_shares(&self, deposit_lamports: u64) -> Result<u64, anchor_lang::error::Error> {
        use crate::errors::VaultError;
        use crate::constants::MINIMUM_INITIAL_SHARES;
        
        if self.total_shares == 0 || self.total_tvl == 0 {
            // First deposit: 1:1 share ratio minus dead shares
            // Dead shares protect against first-depositor manipulation
            if deposit_lamports <= MINIMUM_INITIAL_SHARES {
                return Err(VaultError::DepositBelowMinimum.into());
            }
            Ok(deposit_lamports - MINIMUM_INITIAL_SHARES)
        } else {
            let result = (deposit_lamports as u128)
                .checked_mul(self.total_shares as u128)
                .ok_or(VaultError::MathOverflow)?
                .checked_div(self.total_tvl as u128)
                .ok_or(VaultError::DivisionByZero)?;
            Ok(result as u64)
        }
    }
    
    /// Calculate lamports value for a given share amount
    pub fn calculate_lamports(&self, shares: u64) -> Result<u64, anchor_lang::error::Error> {
        use crate::errors::VaultError;
        if self.total_shares == 0 {
            Ok(0)
        } else {
            let result = (shares as u128)
                .checked_mul(self.total_tvl as u128)
                .ok_or(VaultError::MathOverflow)?
                .checked_div(self.total_shares as u128)
                .ok_or(VaultError::DivisionByZero)?;
            Ok(result as u64)
        }
    }
}

/// User account tracking individual positions
#[account]
pub struct UserAccount {
    /// Bump seed for PDA derivation
    pub bump: u8,
    
    /// Owner of this account
    pub owner: Pubkey,
    
    /// Number of jSOL shares held
    pub shares: u64,
    
    /// Total amount deposited (for analytics)
    pub total_deposited: u64,
    
    /// Total amount withdrawn (for analytics)
    pub total_withdrawn: u64,
    
    /// First deposit timestamp
    pub first_deposit: i64,
    
    /// Last activity timestamp
    pub last_activity: i64,
    
    /// Number of pending withdrawal requests
    pub pending_withdrawals: u8,
    
    /// Reserved space for future upgrades
    pub reserved: [u8; 64],
}

impl UserAccount {
    /// Size of UserAccount in bytes
    pub const LEN: usize = 8 + // Anchor discriminator
        1 +                    // bump
        32 +                   // owner
        8 +                    // shares
        8 +                    // total_deposited
        8 +                    // total_withdrawn
        8 +                    // first_deposit
        8 +                    // last_activity
        1 +                    // pending_withdrawals
        64;                    // reserved
}

/// Withdrawal request account
#[account]
pub struct WithdrawRequest {
    /// Bump seed for PDA derivation
    pub bump: u8,
    
    /// Owner of this withdrawal request
    pub owner: Pubkey,
    
    /// Number of shares being withdrawn
    pub shares: u64,
    
    /// Estimated lamports value at time of request
    pub estimated_lamports: u64,
    
    /// Timestamp when the request was created
    pub created_at: i64,
    
    /// Timestamp when the request becomes ready
    pub ready_at: i64,
    
    /// Current status of the request
    pub status: WithdrawStatus,
    
    /// Request index for this user (for PDA derivation)
    pub request_index: u64,
    
    /// Reserved space for future upgrades
    pub reserved: [u8; 32],
}

impl WithdrawRequest {
    /// Size of WithdrawRequest in bytes
    pub const LEN: usize = 8 + // Anchor discriminator
        1 +                    // bump
        32 +                   // owner
        8 +                    // shares
        8 +                    // estimated_lamports
        8 +                    // created_at
        8 +                    // ready_at
        1 +                    // status
        8 +                    // request_index
        32;                    // reserved
}

// ============================================================================
// Events
// ============================================================================

/// Event emitted when the vault is initialized
#[event]
pub struct VaultInitialized {
    pub authority: Pubkey,
    pub jsoli_mint: Pubkey,
    pub timestamp: i64,
}

/// Event emitted when a deposit is made
#[event]
pub struct DepositEvent {
    pub user: Pubkey,
    pub lamports: u64,
    pub shares_minted: u64,
    pub share_price: u64,
    pub timestamp: i64,
}

/// Event emitted when a withdrawal is requested
#[event]
pub struct WithdrawRequestEvent {
    pub user: Pubkey,
    pub shares: u64,
    pub estimated_lamports: u64,
    pub ready_at: i64,
    pub timestamp: i64,
}

/// Event emitted when a withdrawal is completed
#[event]
pub struct WithdrawCompleteEvent {
    pub user: Pubkey,
    pub shares: u64,
    pub lamports_received: u64,
    pub timestamp: i64,
}

/// Event emitted when the vault is rebalanced
#[event]
pub struct RebalanceEvent {
    pub old_allocations: [u16; MAX_PROTOCOLS],
    pub new_allocations: [u16; MAX_PROTOCOLS],
    pub timestamp: i64,
}

/// Event emitted when fees are collected
#[event]
pub struct FeeCollectionEvent {
    pub management_fees: u64,
    pub performance_fees: u64,
    pub total_collected: u64,
    pub timestamp: i64,
}

/// Event emitted when vault is paused/unpaused
#[event]
pub struct VaultPausedEvent {
    pub is_paused: bool,
    pub timestamp: i64,
}

/// Event emitted when vault config is updated
#[event]
pub struct ConfigUpdatedEvent {
    pub field: String,
    pub old_value: u64,
    pub new_value: u64,
    pub timestamp: i64,
}
