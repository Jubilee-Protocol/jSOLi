//! Input validation utilities

use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::VaultError;

/// Validate that allocations sum to exactly 100%
pub fn validate_allocation_sum(allocations: &[(u8, u16)]) -> Result<()> {
    let total: u16 = allocations.iter().map(|(_, bps)| *bps).sum();
    
    require!(
        total == TOTAL_ALLOCATION_BPS as u16,
        VaultError::InvalidAllocationSum
    );
    
    Ok(())
}

/// Validate that no single allocation exceeds the maximum
pub fn validate_allocation_limits(allocations: &[(u8, u16)]) -> Result<()> {
    for (_, bps) in allocations {
        require!(
            *bps <= MAX_PROTOCOL_ALLOCATION_BPS,
            VaultError::AllocationExceedsMax
        );
    }
    
    Ok(())
}

/// Validate that there are no duplicate protocols
pub fn validate_no_duplicates(allocations: &[(u8, u16)]) -> Result<()> {
    for i in 0..allocations.len() {
        for j in (i + 1)..allocations.len() {
            require!(
                allocations[i].0 != allocations[j].0,
                VaultError::DuplicateProtocol
            );
        }
    }
    
    Ok(())
}

/// Validate management fee
pub fn validate_management_fee(fee_bps: u16) -> Result<()> {
    require!(
        fee_bps <= MAX_MANAGEMENT_FEE_BPS,
        VaultError::ManagementFeeExceedsMax
    );
    Ok(())
}

/// Validate performance fee
pub fn validate_performance_fee(fee_bps: u16) -> Result<()> {
    require!(
        fee_bps <= MAX_PERFORMANCE_FEE_BPS,
        VaultError::PerformanceFeeExceedsMax
    );
    Ok(())
}

/// Validate deposit amount
pub fn validate_deposit_amount(amount: u64) -> Result<()> {
    require!(amount > 0, VaultError::ZeroAmount);
    require!(amount >= MIN_DEPOSIT_LAMPORTS, VaultError::DepositBelowMinimum);
    Ok(())
}

/// Validate deposit against cap
pub fn validate_deposit_cap(current_tvl: u64, deposit: u64, cap: u64) -> Result<()> {
    if cap == 0 {
        return Ok(()); // No cap
    }
    
    let new_tvl = current_tvl
        .checked_add(deposit)
        .ok_or(VaultError::MathOverflow)?;
    
    require!(new_tvl <= cap, VaultError::DepositCapExceeded);
    Ok(())
}

/// Validate that a protocol ID is valid
pub fn validate_protocol_id(protocol: u8) -> Result<()> {
    // Protocol IDs 0-5 are valid (Jito, Marinade, BlazeStake, Lido, Native, Jupiter)
    require!(protocol <= 5, VaultError::UnsupportedProtocol);
    Ok(())
}
