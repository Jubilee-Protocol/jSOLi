//! LST protocol staking instructions
//!
//! This module handles staking and unstaking to/from various LST protocols.

use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::VaultError;
use crate::state::*;

/// Stake SOL to a specific LST protocol
/// 
/// This instruction takes SOL from the vault and stakes it to the specified
/// protocol, receiving the corresponding LST token.
/// 
/// # Arguments
/// * `ctx` - The context containing all accounts
/// * `protocol` - The LST protocol to stake to
/// * `amount` - Amount of lamports to stake
pub fn stake_handler(
    ctx: Context<StakeToProtocol>,
    protocol: u8,
    amount: u64,
) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    
    // Check vault is not paused
    require!(!vault.config.is_paused, VaultError::VaultPaused);
    
    // Validate amount
    require!(amount > 0, VaultError::ZeroAmount);
    
    // Validate protocol is configured
    let mut protocol_found = false;
    let mut protocol_index = 0;
    
    for i in 0..vault.num_allocations as usize {
        if vault.allocations[i].protocol == protocol {
            protocol_found = true;
            protocol_index = i;
            break;
        }
    }
    
    require!(protocol_found, VaultError::UnsupportedProtocol);
    
    // In a real implementation, this would:
    // 1. Call the appropriate protocol's stake function
    // 2. Handle the LST token receipt
    // 3. Update internal accounting
    
    // For now, we just update the allocation amount
    vault.allocations[protocol_index].amount = vault.allocations[protocol_index].amount
        .checked_add(amount)
        .ok_or(VaultError::MathOverflow)?;
    
    // Recalculate current allocation percentages
    if vault.total_tvl > 0 {
        for i in 0..vault.num_allocations as usize {
            vault.allocations[i].current_bps = ((vault.allocations[i].amount as u128)
                .checked_mul(TOTAL_ALLOCATION_BPS as u128)
                .ok_or(VaultError::MathOverflow)?
                .checked_div(vault.total_tvl as u128)
                .ok_or(VaultError::DivisionByZero)?) as u16;
        }
    }
    
    msg!("Staked {} lamports to protocol {}", amount, protocol);
    
    Ok(())
}

/// Unstake from a specific LST protocol
/// 
/// This instruction initiates unstaking from the specified protocol.
/// 
/// # Arguments
/// * `ctx` - The context containing all accounts
/// * `protocol` - The LST protocol to unstake from
/// * `amount` - Amount of LST value to unstake (in lamports equivalent)
pub fn unstake_handler(
    ctx: Context<UnstakeFromProtocol>,
    protocol: u8,
    amount: u64,
) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    
    // Validate amount
    require!(amount > 0, VaultError::ZeroAmount);
    
    // Validate protocol is configured
    let mut protocol_found = false;
    let mut protocol_index = 0;
    
    for i in 0..vault.num_allocations as usize {
        if vault.allocations[i].protocol == protocol {
            protocol_found = true;
            protocol_index = i;
            break;
        }
    }
    
    require!(protocol_found, VaultError::UnsupportedProtocol);
    
    // Check sufficient balance
    require!(
        vault.allocations[protocol_index].amount >= amount,
        VaultError::InsufficientLiquidity
    );
    
    // In a real implementation, this would:
    // 1. Call the appropriate protocol's unstake function
    // 2. Create ticket/request for delayed unstaking
    // 3. Track pending unstake requests
    
    // For now, update the allocation amount
    vault.allocations[protocol_index].amount = vault.allocations[protocol_index].amount
        .checked_sub(amount)
        .ok_or(VaultError::MathUnderflow)?;
    
    // Recalculate current allocation percentages
    if vault.total_tvl > 0 {
        for i in 0..vault.num_allocations as usize {
            vault.allocations[i].current_bps = ((vault.allocations[i].amount as u128)
                .checked_mul(TOTAL_ALLOCATION_BPS as u128)
                .ok_or(VaultError::MathOverflow)?
                .checked_div(vault.total_tvl as u128)
                .ok_or(VaultError::DivisionByZero)?) as u16;
        }
    }
    
    msg!("Initiated unstake of {} lamports from protocol {}", amount, protocol);
    
    Ok(())
}

#[derive(Accounts)]
pub struct StakeToProtocol<'info> {
    /// The vault state account
    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump = vault.bump,
        has_one = authority @ VaultError::Unauthorized
    )]
    pub vault: Account<'info, VaultState>,
    
    /// Vault's SOL holding account
    /// CHECK: This is a PDA that holds SOL
    #[account(
        mut,
        seeds = [b"vault_sol"],
        bump
    )]
    pub vault_sol_account: UncheckedAccount<'info>,
    
    /// The vault authority
    pub authority: Signer<'info>,
    
    /// System program
    pub system_program: Program<'info, System>,
    
    // Additional accounts for protocol-specific staking would be added here
    // e.g., Marinade state, Jito pool, etc.
}

#[derive(Accounts)]
pub struct UnstakeFromProtocol<'info> {
    /// The vault state account
    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump = vault.bump,
        has_one = authority @ VaultError::Unauthorized
    )]
    pub vault: Account<'info, VaultState>,
    
    /// The vault authority
    pub authority: Signer<'info>,
    
    /// System program
    pub system_program: Program<'info, System>,
    
    // Additional accounts for protocol-specific unstaking would be added here
}
