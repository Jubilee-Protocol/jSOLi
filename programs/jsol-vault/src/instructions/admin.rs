//! Admin instructions for vault management

use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::VaultError;
use crate::state::*;

/// Update vault configuration
/// 
/// Only the vault authority can call this instruction.
/// 
/// # Arguments
/// * `ctx` - The context containing all accounts
/// * `new_config` - New configuration values
pub fn update_config_handler(
    ctx: Context<AdminAction>,
    new_config: UpdateConfigParams,
) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let clock = Clock::get()?;
    
    // Update management fee if provided
    if let Some(fee) = new_config.management_fee_bps {
        require!(
            fee <= MAX_MANAGEMENT_FEE_BPS,
            VaultError::ManagementFeeExceedsMax
        );
        
        emit!(ConfigUpdatedEvent {
            field: "management_fee_bps".to_string(),
            old_value: vault.config.management_fee_bps as u64,
            new_value: fee as u64,
            timestamp: clock.unix_timestamp,
        });
        
        vault.config.management_fee_bps = fee;
    }
    
    // Update performance fee if provided
    if let Some(fee) = new_config.performance_fee_bps {
        require!(
            fee <= MAX_PERFORMANCE_FEE_BPS,
            VaultError::PerformanceFeeExceedsMax
        );
        
        emit!(ConfigUpdatedEvent {
            field: "performance_fee_bps".to_string(),
            old_value: vault.config.performance_fee_bps as u64,
            new_value: fee as u64,
            timestamp: clock.unix_timestamp,
        });
        
        vault.config.performance_fee_bps = fee;
    }
    
    // Update rebalance threshold if provided
    if let Some(threshold) = new_config.rebalance_threshold_bps {
        emit!(ConfigUpdatedEvent {
            field: "rebalance_threshold_bps".to_string(),
            old_value: vault.config.rebalance_threshold_bps as u64,
            new_value: threshold as u64,
            timestamp: clock.unix_timestamp,
        });
        
        vault.config.rebalance_threshold_bps = threshold;
    }
    
    // Update max slippage if provided
    if let Some(slippage) = new_config.max_slippage_bps {
        emit!(ConfigUpdatedEvent {
            field: "max_slippage_bps".to_string(),
            old_value: vault.config.max_slippage_bps as u64,
            new_value: slippage as u64,
            timestamp: clock.unix_timestamp,
        });
        
        vault.config.max_slippage_bps = slippage;
    }
    
    // Update deposit cap if provided
    if let Some(cap) = new_config.deposit_cap {
        emit!(ConfigUpdatedEvent {
            field: "deposit_cap".to_string(),
            old_value: vault.config.deposit_cap,
            new_value: cap,
            timestamp: clock.unix_timestamp,
        });
        
        vault.config.deposit_cap = cap;
    }
    
    msg!("Vault configuration updated");
    
    Ok(())
}

/// Pause the vault
/// 
/// When paused, deposits and withdrawals are disabled.
pub fn pause_handler(ctx: Context<AdminAction>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    
    require!(!vault.config.is_paused, VaultError::VaultPaused);
    
    vault.config.is_paused = true;
    
    emit!(VaultPausedEvent {
        is_paused: true,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    msg!("Vault has been paused");
    
    Ok(())
}

/// Unpause the vault
pub fn unpause_handler(ctx: Context<AdminAction>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    
    require!(vault.config.is_paused, VaultError::InvalidVaultState);
    
    vault.config.is_paused = false;
    
    emit!(VaultPausedEvent {
        is_paused: false,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    msg!("Vault has been unpaused");
    
    Ok(())
}

/// Collect accumulated fees
pub fn collect_fees_handler(ctx: Context<CollectFees>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let clock = Clock::get()?;
    
    // Calculate management fees since last collection
    let time_elapsed = clock.unix_timestamp
        .checked_sub(vault.last_fee_collection)
        .ok_or(VaultError::MathUnderflow)?;
    
    // Annualized management fee calculation
    // fee = TVL * management_fee_bps / 10000 * (time_elapsed / seconds_per_year)
    let seconds_per_year: i64 = 31_536_000;
    let management_fee = (vault.total_tvl as u128)
        .checked_mul(vault.config.management_fee_bps as u128)
        .ok_or(VaultError::MathOverflow)?
        .checked_mul(time_elapsed as u128)
        .ok_or(VaultError::MathOverflow)?
        .checked_div(BPS_DENOMINATOR as u128 * seconds_per_year as u128)
        .ok_or(VaultError::DivisionByZero)? as u64;
    
    // Performance fee calculation (on gains above high water mark)
    let current_share_price = vault.share_price();
    let performance_fee = if current_share_price > vault.high_water_mark {
        let gain_per_share = current_share_price
            .checked_sub(vault.high_water_mark)
            .ok_or(VaultError::MathUnderflow)?;
        
        let total_gain = (gain_per_share as u128)
            .checked_mul(vault.total_shares as u128)
            .ok_or(VaultError::MathOverflow)?
            .checked_div(SHARE_PRECISION as u128)
            .ok_or(VaultError::DivisionByZero)? as u64;
        
        (total_gain as u128)
            .checked_mul(vault.config.performance_fee_bps as u128)
            .ok_or(VaultError::MathOverflow)?
            .checked_div(BPS_DENOMINATOR as u128)
            .ok_or(VaultError::DivisionByZero)? as u64
    } else {
        0
    };
    
    let total_fees = management_fee
        .checked_add(performance_fee)
        .ok_or(VaultError::MathOverflow)?;
    
    if total_fees > 0 {
        // Transfer fees to fee collector
        **ctx.accounts.vault_sol_account.try_borrow_mut_lamports()? -= total_fees;
        **ctx.accounts.fee_collector.try_borrow_mut_lamports()? += total_fees;
        
        // Update vault state
        vault.total_tvl = vault.total_tvl
            .checked_sub(total_fees)
            .ok_or(VaultError::MathUnderflow)?;
        vault.accrued_management_fees = vault.accrued_management_fees
            .checked_add(management_fee)
            .ok_or(VaultError::MathOverflow)?;
        vault.accrued_performance_fees = vault.accrued_performance_fees
            .checked_add(performance_fee)
            .ok_or(VaultError::MathOverflow)?;
    }
    
    // Update high water mark if we're above it
    if current_share_price > vault.high_water_mark {
        vault.high_water_mark = current_share_price;
    }
    
    vault.last_fee_collection = clock.unix_timestamp;
    
    // Emit event
    emit!(FeeCollectionEvent {
        management_fees: management_fee,
        performance_fees: performance_fee,
        total_collected: total_fees,
        timestamp: clock.unix_timestamp,
    });
    
    msg!("Fees collected");
    msg!("Management fees: {} lamports", management_fee);
    msg!("Performance fees: {} lamports", performance_fee);
    msg!("Total: {} lamports", total_fees);
    
    Ok(())
}

/// Update target allocations
pub fn update_allocations_handler(
    ctx: Context<AdminAction>,
    new_allocations: Vec<UpdateAllocation>,
) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    
    // Validate allocations
    require!(
        new_allocations.len() <= MAX_PROTOCOLS,
        VaultError::TooManyProtocols
    );
    
    let mut total: u16 = 0;
    for alloc in &new_allocations {
        require!(
            alloc.target_bps <= MAX_PROTOCOL_ALLOCATION_BPS,
            VaultError::AllocationExceedsMax
        );
        total = total
            .checked_add(alloc.target_bps)
            .ok_or(VaultError::MathOverflow)?;
    }
    
    require!(
        total == TOTAL_ALLOCATION_BPS as u16,
        VaultError::InvalidAllocationSum
    );
    
    // Update allocations
    vault.num_allocations = new_allocations.len() as u8;
    for (i, alloc) in new_allocations.iter().enumerate() {
        vault.allocations[i].protocol = alloc.protocol;
        vault.allocations[i].target_bps = alloc.target_bps;
    }
    
    msg!("Allocations updated");
    
    Ok(())
}

/// Parameters for updating configuration
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateConfigParams {
    pub management_fee_bps: Option<u16>,
    pub performance_fee_bps: Option<u16>,
    pub rebalance_threshold_bps: Option<u16>,
    pub max_slippage_bps: Option<u16>,
    pub deposit_cap: Option<u64>,
}

/// Parameters for updating an allocation
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateAllocation {
    pub protocol: u8,
    pub target_bps: u16,
}

#[derive(Accounts)]
pub struct AdminAction<'info> {
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
}

#[derive(Accounts)]
pub struct CollectFees<'info> {
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
    
    /// Fee collector account
    /// CHECK: This receives the fees
    #[account(mut)]
    pub fee_collector: UncheckedAccount<'info>,
    
    /// The vault authority
    pub authority: Signer<'info>,
    
    /// System program
    pub system_program: Program<'info, System>,
}
