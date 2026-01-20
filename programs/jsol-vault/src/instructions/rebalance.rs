//! Rebalance instruction for optimizing protocol allocations

use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::VaultError;
use crate::state::*;

/// Rebalance the vault's LST allocations
/// 
/// This instruction adjusts the actual allocations to match target allocations.
/// Can be called by anyone, but will only execute if deviation exceeds threshold.
/// 
/// # Arguments
/// * `ctx` - The context containing all accounts
pub fn handler(ctx: Context<Rebalance>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let clock = Clock::get()?;
    
    // Check vault is not paused
    require!(!vault.config.is_paused, VaultError::VaultPaused);
    
    // Check minimum time between rebalances
    let time_since_last = clock.unix_timestamp
        .checked_sub(vault.last_rebalance)
        .ok_or(VaultError::MathUnderflow)?;
    require!(
        time_since_last >= MIN_REBALANCE_INTERVAL_SECS,
        VaultError::RebalanceTooSoon
    );
    
    // Calculate current allocation deviations
    let mut max_deviation: u16 = 0;
    let mut needs_rebalance = false;
    
    let mut old_allocations = [0u16; MAX_PROTOCOLS];
    
    for i in 0..vault.num_allocations as usize {
        let alloc = &vault.allocations[i];
        old_allocations[i] = alloc.current_bps;
        
        // Calculate deviation from target
        let deviation = if alloc.current_bps > alloc.target_bps {
            alloc.current_bps - alloc.target_bps
        } else {
            alloc.target_bps - alloc.current_bps
        };
        
        if deviation > max_deviation {
            max_deviation = deviation;
        }
        
        if deviation >= vault.config.rebalance_threshold_bps {
            needs_rebalance = true;
        }
    }
    
    // Check if rebalance is necessary
    require!(needs_rebalance, VaultError::RebalanceThresholdNotMet);
    
    // Perform rebalancing logic
    // In a real implementation, this would:
    // 1. Calculate required swaps between protocols
    // 2. Unstake from overweight protocols
    // 3. Stake to underweight protocols
    // 4. Use Jupiter for efficient routing
    
    // For now, we update current allocations to target (placeholder)
    let mut new_allocations = [0u16; MAX_PROTOCOLS];
    
    for i in 0..vault.num_allocations as usize {
        let alloc = &mut vault.allocations[i];
        
        // Calculate new amount based on target allocation
        let new_amount = (vault.total_tvl as u128)
            .checked_mul(alloc.target_bps as u128)
            .ok_or(VaultError::MathOverflow)?
            .checked_div(TOTAL_ALLOCATION_BPS as u128)
            .ok_or(VaultError::DivisionByZero)? as u64;
        
        alloc.amount = new_amount;
        alloc.current_bps = alloc.target_bps;
        new_allocations[i] = alloc.current_bps;
    }
    
    // Update vault state
    vault.last_rebalance = clock.unix_timestamp;
    vault.rebalance_count = vault.rebalance_count
        .checked_add(1)
        .ok_or(VaultError::MathOverflow)?;
    
    // Emit rebalance event
    emit!(RebalanceEvent {
        old_allocations,
        new_allocations,
        timestamp: clock.unix_timestamp,
    });
    
    msg!("Vault rebalanced successfully");
    msg!("Max deviation was: {} bps", max_deviation);
    msg!("Rebalance count: {}", vault.rebalance_count);
    
    Ok(())
}

#[derive(Accounts)]
pub struct Rebalance<'info> {
    /// The vault state account
    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump = vault.bump
    )]
    pub vault: Account<'info, VaultState>,
    
    /// Anyone can trigger rebalance if threshold is met
    pub rebalancer: Signer<'info>,
}
