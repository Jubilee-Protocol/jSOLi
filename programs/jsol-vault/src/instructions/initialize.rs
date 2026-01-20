//! Initialize instruction for setting up the jSOL Vault

use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

use crate::constants::*;
use crate::errors::VaultError;
use crate::state::*;

/// Initialize the vault with the given configuration
/// 
/// # Arguments
/// * `ctx` - The context containing all accounts
/// * `allocations` - Initial protocol allocations (must sum to 10000 bps)
/// * `management_fee_bps` - Management fee in basis points (max 100)
/// * `performance_fee_bps` - Performance fee in basis points (max 2000)
/// * `deposit_cap` - Maximum total deposits allowed (0 = no cap)
pub fn handler(
    ctx: Context<Initialize>,
    allocations: Vec<InitAllocation>,
    management_fee_bps: u16,
    performance_fee_bps: u16,
    deposit_cap: u64,
) -> Result<()> {
    // Validate fees
    require!(
        management_fee_bps <= MAX_MANAGEMENT_FEE_BPS,
        VaultError::ManagementFeeExceedsMax
    );
    require!(
        performance_fee_bps <= MAX_PERFORMANCE_FEE_BPS,
        VaultError::PerformanceFeeExceedsMax
    );
    
    // Validate allocations
    require!(
        allocations.len() <= MAX_PROTOCOLS,
        VaultError::TooManyProtocols
    );
    
    let mut total_allocation: u16 = 0;
    let mut seen_protocols: Vec<u8> = Vec::new();
    
    for alloc in &allocations {
        // HIGH-02 FIX: Check for duplicate protocols
        require!(
            !seen_protocols.contains(&alloc.protocol),
            VaultError::DuplicateProtocol
        );
        seen_protocols.push(alloc.protocol);
        
        require!(
            alloc.target_bps <= MAX_PROTOCOL_ALLOCATION_BPS,
            VaultError::AllocationExceedsMax
        );
        total_allocation = total_allocation
            .checked_add(alloc.target_bps)
            .ok_or(VaultError::MathOverflow)?;
    }
    
    require!(
        total_allocation == TOTAL_ALLOCATION_BPS as u16,
        VaultError::InvalidAllocationSum
    );
    
    // Initialize vault state
    let vault = &mut ctx.accounts.vault;
    vault.bump = ctx.bumps.vault;
    vault.authority = ctx.accounts.authority.key();
    vault.jsoli_mint = ctx.accounts.jsoli_mint.key();
    vault.total_tvl = 0;
    vault.total_shares = 0;
    vault.high_water_mark = SHARE_PRECISION;
    vault.accrued_management_fees = 0;
    vault.accrued_performance_fees = 0;
    vault.last_fee_collection = Clock::get()?.unix_timestamp;
    vault.last_rebalance = Clock::get()?.unix_timestamp;
    vault.rebalance_count = 0;
    vault.depositor_count = 0;
    
    // Set configuration
    vault.config = VaultConfig {
        management_fee_bps,
        performance_fee_bps,
        rebalance_threshold_bps: DEFAULT_REBALANCE_THRESHOLD_BPS,
        max_slippage_bps: 100,
        deposit_cap,
        is_paused: false,
    };
    
    // Set allocations
    vault.num_allocations = allocations.len() as u8;
    for (i, alloc) in allocations.iter().enumerate() {
        vault.allocations[i] = Allocation {
            protocol: alloc.protocol,
            target_bps: alloc.target_bps,
            current_bps: 0, // No current allocation yet
            amount: 0,
        };
    }
    
    // Emit initialization event
    emit!(VaultInitialized {
        authority: vault.authority,
        jsoli_mint: vault.jsoli_mint,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    msg!("jSOL Vault initialized successfully");
    msg!("Authority: {}", vault.authority);
    msg!("jSOL Mint: {}", vault.jsoli_mint);
    
    Ok(())
}

/// Input allocation for initialization
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitAllocation {
    /// Protocol ID (maps to LstProtocol enum)
    pub protocol: u8,
    /// Target allocation in basis points
    pub target_bps: u16,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    /// The vault state account to initialize
    #[account(
        init,
        payer = authority,
        space = VaultState::LEN,
        seeds = [VAULT_SEED],
        bump
    )]
    pub vault: Account<'info, VaultState>,
    
    /// The jSOLi token mint
    #[account(
        init,
        payer = authority,
        mint::decimals = 9,
        mint::authority = vault,
        seeds = [JSOLI_MINT_SEED],
        bump
    )]
    pub jsoli_mint: Account<'info, Mint>,
    
    /// Authority who initializes and controls the vault
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// System program for account creation
    pub system_program: Program<'info, System>,
    
    /// Token program for mint creation
    pub token_program: Program<'info, Token>,
    
    /// Rent sysvar
    pub rent: Sysvar<'info, Rent>,
}
