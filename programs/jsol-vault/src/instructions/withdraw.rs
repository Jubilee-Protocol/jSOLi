//! Withdrawal instructions for the jSOL Vault
//!
//! Implements two-step withdrawal: request -> complete

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount};

use crate::constants::*;
use crate::errors::VaultError;
use crate::state::*;

/// Request a withdrawal from the vault
/// 
/// This creates a pending withdrawal request that can be completed
/// after the unstaking period has elapsed.
/// 
/// # Arguments
/// * `ctx` - The context containing all accounts
/// * `shares` - Number of jSOLi shares to withdraw
pub fn request_handler(ctx: Context<RequestWithdraw>, shares: u64) -> Result<()> {
    require!(shares > 0, VaultError::ZeroAmount);
    
    let vault = &ctx.accounts.vault;
    let user_account = &mut ctx.accounts.user_account;
    
    // Check vault is not paused
    require!(!vault.config.is_paused, VaultError::VaultPaused);
    
    // Check user has enough shares
    require!(user_account.shares >= shares, VaultError::InsufficientShares);
    
    // Calculate estimated lamports value
    let estimated_lamports = vault.calculate_lamports(shares)?;
    
    // Get current timestamp and calculate ready time
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;
    
    // Unstaking takes approximately 2-3 days, we use epoch-based calculation
    // For simplicity, using a fixed delay of 3 days (259200 seconds)
    let unstaking_delay: i64 = 259200;
    let ready_at = now + unstaking_delay;
    
    // Initialize withdraw request
    let withdraw_request = &mut ctx.accounts.withdraw_request;
    withdraw_request.bump = ctx.bumps.withdraw_request;
    withdraw_request.owner = ctx.accounts.user.key();
    withdraw_request.shares = shares;
    withdraw_request.estimated_lamports = estimated_lamports;
    withdraw_request.created_at = now;
    withdraw_request.ready_at = ready_at;
    withdraw_request.status = WithdrawStatus::Pending;
    withdraw_request.request_index = user_account.pending_withdrawals as u64;
    
    // Update user account
    user_account.shares = user_account.shares
        .checked_sub(shares)
        .ok_or(VaultError::MathUnderflow)?;
    user_account.pending_withdrawals = user_account.pending_withdrawals
        .checked_add(1)
        .ok_or(VaultError::MathOverflow)?;
    user_account.last_activity = now;
    
    // Emit event
    emit!(WithdrawRequestEvent {
        user: ctx.accounts.user.key(),
        shares,
        estimated_lamports,
        ready_at,
        timestamp: now,
    });
    
    msg!("Withdrawal request created");
    msg!("Shares: {}", shares);
    msg!("Estimated lamports: {}", estimated_lamports);
    msg!("Ready at: {}", ready_at);
    
    Ok(())
}

/// Complete a withdrawal request
/// 
/// Called after the unstaking period has elapsed to actually
/// transfer SOL to the user and burn their jSOL.
/// 
/// # Arguments
/// * `ctx` - The context containing all accounts
pub fn complete_handler(ctx: Context<CompleteWithdraw>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let withdraw_request = &mut ctx.accounts.withdraw_request;
    let user_account = &mut ctx.accounts.user_account;
    
    // Verify request owner
    require!(
        withdraw_request.owner == ctx.accounts.user.key(),
        VaultError::Unauthorized
    );
    
    // Check request status
    require!(
        withdraw_request.status == WithdrawStatus::Pending,
        VaultError::WithdrawAlreadyProcessed
    );
    
    // Check if ready
    let clock = Clock::get()?;
    require!(
        clock.unix_timestamp >= withdraw_request.ready_at,
        VaultError::WithdrawNotReady
    );
    
    // Calculate actual lamports to return (recalculate in case share price changed)
    let actual_lamports = vault.calculate_lamports(withdraw_request.shares)?;
    
    // Check vault has sufficient liquidity
    require!(
        vault.total_tvl >= actual_lamports,
        VaultError::InsufficientLiquidity
    );
    
    // Burn jSOLi tokens - user is authority of their own token account
    let burn_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Burn {
            mint: ctx.accounts.jsoli_mint.to_account_info(),
            from: ctx.accounts.user_jsol_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    token::burn(burn_ctx, withdraw_request.shares)?;
    
    // Transfer SOL from vault to user
    **ctx.accounts.vault_sol_account.try_borrow_mut_lamports()? -= actual_lamports;
    **ctx.accounts.user.try_borrow_mut_lamports()? += actual_lamports;
    
    // Update vault state
    vault.total_tvl = vault.total_tvl
        .checked_sub(actual_lamports)
        .ok_or(VaultError::MathUnderflow)?;
    vault.total_shares = vault.total_shares
        .checked_sub(withdraw_request.shares)
        .ok_or(VaultError::MathUnderflow)?;
    
    // Update user account
    user_account.total_withdrawn = user_account.total_withdrawn
        .checked_add(actual_lamports)
        .ok_or(VaultError::MathOverflow)?;
    user_account.pending_withdrawals = user_account.pending_withdrawals
        .checked_sub(1)
        .ok_or(VaultError::MathUnderflow)?;
    user_account.last_activity = clock.unix_timestamp;
    
    // Mark request as completed
    withdraw_request.status = WithdrawStatus::Completed;
    
    // Emit event
    emit!(WithdrawCompleteEvent {
        user: ctx.accounts.user.key(),
        shares: withdraw_request.shares,
        lamports_received: actual_lamports,
        timestamp: clock.unix_timestamp,
    });
    
    msg!("Withdrawal completed");
    msg!("Shares burned: {}", withdraw_request.shares);
    msg!("Lamports received: {}", actual_lamports);
    
    Ok(())
}

#[derive(Accounts)]
#[instruction(shares: u64)]
pub struct RequestWithdraw<'info> {
    /// The vault state account
    #[account(
        seeds = [VAULT_SEED],
        bump = vault.bump
    )]
    pub vault: Account<'info, VaultState>,
    
    /// User account tracking position
    #[account(
        mut,
        seeds = [USER_ACCOUNT_SEED, user.key().as_ref()],
        bump = user_account.bump,
        constraint = user_account.owner == user.key() @ VaultError::Unauthorized
    )]
    pub user_account: Account<'info, UserAccount>,
    
    /// Withdraw request account to create
    #[account(
        init,
        payer = user,
        space = WithdrawRequest::LEN,
        seeds = [
            WITHDRAW_REQUEST_SEED,
            user.key().as_ref(),
            &user_account.pending_withdrawals.to_le_bytes()
        ],
        bump
    )]
    pub withdraw_request: Account<'info, WithdrawRequest>,
    
    /// The user requesting withdrawal
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// System program
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CompleteWithdraw<'info> {
    /// The vault state account  
    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump = vault.bump
    )]
    pub vault: Account<'info, VaultState>,
    
    /// The jSOLi token mint
    #[account(
        mut,
        seeds = [JSOLI_MINT_SEED],
        bump
    )]
    pub jsoli_mint: Account<'info, Mint>,
    
    /// User's jSOLi token account
    #[account(
        mut,
        associated_token::mint = jsoli_mint,
        associated_token::authority = user
    )]
    pub user_jsol_account: Account<'info, TokenAccount>,
    
    /// User account tracking position
    #[account(
        mut,
        seeds = [USER_ACCOUNT_SEED, user.key().as_ref()],
        bump = user_account.bump
    )]
    pub user_account: Account<'info, UserAccount>,
    
    /// Withdraw request account
    #[account(
        mut,
        constraint = withdraw_request.owner == user.key() @ VaultError::Unauthorized
    )]
    pub withdraw_request: Account<'info, WithdrawRequest>,
    
    /// Vault's SOL holding account
    /// CHECK: This is a PDA that holds SOL
    #[account(
        mut,
        seeds = [b"vault_sol"],
        bump
    )]
    pub vault_sol_account: UncheckedAccount<'info>,
    
    /// The user completing withdrawal
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// Token program
    pub token_program: Program<'info, Token>,
    
    /// System program
    pub system_program: Program<'info, System>,
}
