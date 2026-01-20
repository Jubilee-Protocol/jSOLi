//! Custom error types for the jSOL Vault program
//! 
//! All errors are documented with their cause and suggested remediation.

use anchor_lang::prelude::*;

#[error_code]
pub enum VaultError {
    // ========================================================================
    // Initialization Errors (6000-6019)
    // ========================================================================
    
    /// Vault has already been initialized
    #[msg("Vault has already been initialized")]
    AlreadyInitialized,
    
    /// Invalid authority provided
    #[msg("Invalid authority provided")]
    InvalidAuthority,
    
    // ========================================================================
    // Allocation Errors (6020-6039)
    // ========================================================================
    
    /// Allocations do not sum to 100%
    #[msg("Allocations must sum to exactly 10000 basis points (100%)")]
    InvalidAllocationSum,
    
    /// Single protocol allocation exceeds maximum (50%)
    #[msg("Single protocol allocation cannot exceed 5000 basis points (50%)")]
    AllocationExceedsMax,
    
    /// Too many protocols configured
    #[msg("Maximum number of protocols exceeded")]
    TooManyProtocols,
    
    /// Duplicate protocol in allocation list
    #[msg("Duplicate protocol in allocation list")]
    DuplicateProtocol,
    
    // ========================================================================
    // Fee Errors (6040-6059)
    // ========================================================================
    
    /// Management fee exceeds maximum
    #[msg("Management fee cannot exceed 100 basis points (1%)")]
    ManagementFeeExceedsMax,
    
    /// Performance fee exceeds maximum
    #[msg("Performance fee cannot exceed 2000 basis points (20%)")]
    PerformanceFeeExceedsMax,
    
    // ========================================================================
    // Deposit Errors (6060-6079)
    // ========================================================================
    
    /// Deposit amount is below minimum
    #[msg("Deposit amount is below the minimum required")]
    DepositBelowMinimum,
    
    /// Deposit would exceed vault's deposit cap
    #[msg("Deposit would exceed vault's deposit cap")]
    DepositCapExceeded,
    
    /// Vault is paused and not accepting deposits
    #[msg("Vault is currently paused")]
    VaultPaused,
    
    /// Zero amount not allowed
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    
    // ========================================================================
    // Withdrawal Errors (6080-6099)
    // ========================================================================
    
    /// Insufficient shares for withdrawal
    #[msg("Insufficient shares for withdrawal")]
    InsufficientShares,
    
    /// Withdrawal request not found
    #[msg("Withdrawal request not found")]
    WithdrawRequestNotFound,
    
    /// Withdrawal request not yet mature
    #[msg("Withdrawal request is not yet ready to be completed")]
    WithdrawNotReady,
    
    /// Withdrawal request already completed or cancelled
    #[msg("Withdrawal request has already been processed")]
    WithdrawAlreadyProcessed,
    
    /// Insufficient vault liquidity for withdrawal
    #[msg("Insufficient vault liquidity for withdrawal")]
    InsufficientLiquidity,
    
    // ========================================================================
    // Rebalance Errors (6100-6119)
    // ========================================================================
    
    /// Rebalance threshold not met
    #[msg("Current allocation deviation is below rebalance threshold")]
    RebalanceThresholdNotMet,
    
    /// Rebalance called too soon
    #[msg("Minimum time between rebalances has not elapsed")]
    RebalanceTooSoon,
    
    /// Slippage exceeded during rebalance
    #[msg("Slippage exceeded maximum allowed")]
    SlippageExceeded,
    
    // ========================================================================
    // Oracle Errors (6120-6139)
    // ========================================================================
    
    /// Oracle price is stale
    #[msg("Oracle price data is stale")]
    StaleOraclePrice,
    
    /// Oracle price deviation too high
    #[msg("Oracle price deviation exceeds maximum allowed")]
    OraclePriceDeviation,
    
    /// Invalid oracle account
    #[msg("Invalid oracle account provided")]
    InvalidOracleAccount,
    
    /// Oracle not available
    #[msg("Oracle is not available")]
    OracleUnavailable,
    
    // ========================================================================
    // Authorization Errors (6140-6159)
    // ========================================================================
    
    /// Unauthorized operation
    #[msg("Unauthorized: signer is not the vault authority")]
    Unauthorized,
    
    /// Operation not allowed in current state
    #[msg("Operation not allowed in current vault state")]
    InvalidVaultState,
    
    // ========================================================================
    // Math Errors (6160-6179)
    // ========================================================================
    
    /// Arithmetic overflow
    #[msg("Arithmetic operation resulted in overflow")]
    MathOverflow,
    
    /// Arithmetic underflow  
    #[msg("Arithmetic operation resulted in underflow")]
    MathUnderflow,
    
    /// Division by zero
    #[msg("Division by zero")]
    DivisionByZero,
    
    // ========================================================================
    // Protocol Integration Errors (6180-6199)
    // ========================================================================
    
    /// Protocol integration failed
    #[msg("LST protocol integration failed")]
    ProtocolIntegrationFailed,
    
    /// Unsupported protocol
    #[msg("Protocol is not supported")]
    UnsupportedProtocol,
    
    /// Protocol is temporarily unavailable
    #[msg("Protocol is temporarily unavailable")]
    ProtocolUnavailable,
    
    // ========================================================================
    // Account Errors (6200-6219)
    // ========================================================================
    
    /// Invalid account owner
    #[msg("Account has invalid owner")]
    InvalidAccountOwner,
    
    /// Account not initialized
    #[msg("Account is not initialized")]
    AccountNotInitialized,
    
    /// Invalid mint
    #[msg("Invalid token mint")]
    InvalidMint,
}
