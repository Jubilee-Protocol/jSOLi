//! Deposit instruction for users to deposit SOL into the vault

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};

use crate::constants::*;
use crate::errors::VaultError;
use crate::state::*;

use crate::utils::oracle::{get_pyth_price, pyth_feeds};

/// Deposit SOL into the vault and receive jSOLi shares
/// 
/// # Arguments
/// * `ctx` - The context containing all accounts
/// * `amount` - Amount of lamports to deposit
pub fn deposit_handler(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    // Validate amount
    require!(amount > 0, VaultError::ZeroAmount);
    require!(amount >= MIN_DEPOSIT_LAMPORTS, VaultError::DepositBelowMinimum);

    // Validate Oracle Price (Solana / USD)
    // We check this BEFORE deposit to ensure external market conditions are valid
    let sol_price = get_pyth_price(&ctx.accounts.oracle_account, MAX_ORACLE_STALENESS_SECS)?;
    
    // Verify we are looking at the correct feed
    require!(
        ctx.accounts.oracle_account.key().to_string() == pyth_feeds::SOL_USD, 
        VaultError::InvalidOracleAccount
    );

    msg!("Oracle Price: ${} (conf: {})", sol_price.price, sol_price.confidence);

    let vault = &mut ctx.accounts.vault;
    
    // Check vault is not paused
    require!(!vault.config.is_paused, VaultError::VaultPaused);
    
    // Check deposit cap
    if vault.config.deposit_cap > 0 {
        let new_tvl = vault.total_tvl
            .checked_add(amount)
            .ok_or(VaultError::MathOverflow)?;
        require!(
            new_tvl <= vault.config.deposit_cap,
            VaultError::DepositCapExceeded
        );
    }
    
    // Calculate shares to mint
    let shares_to_mint = vault.calculate_shares_to_mint(amount)?;
    require!(shares_to_mint > 0, VaultError::ZeroAmount);
    
    // Record share price before deposit
    let share_price = vault.share_price()?;
    
    // Transfer SOL from user to vault
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
            from: ctx.accounts.user.to_account_info(),
            to: ctx.accounts.vault_sol_account.to_account_info(),
        },
    );
    anchor_lang::system_program::transfer(cpi_context, amount)?;
    
    // Mint jSOLi shares to user
    let vault_seeds = &[VAULT_SEED, &[vault.bump]];
    let signer_seeds = &[&vault_seeds[..]];
    
    let mint_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.jsoli_mint.to_account_info(),
            to: ctx.accounts.user_jsol_account.to_account_info(),
            authority: vault.to_account_info(),
        },
        signer_seeds,
    );
    token::mint_to(mint_ctx, shares_to_mint)?;
    
    // Update vault state
    vault.total_tvl = vault.total_tvl
        .checked_add(amount)
        .ok_or(VaultError::MathOverflow)?;
    vault.total_shares = vault.total_shares
        .checked_add(shares_to_mint)
        .ok_or(VaultError::MathOverflow)?;
    
    // Update or initialize user account
    let user_account = &mut ctx.accounts.user_account;
    let clock = Clock::get()?;
    
    if user_account.first_deposit == 0 {
        // New user
        user_account.bump = ctx.bumps.user_account;
        user_account.owner = ctx.accounts.user.key();
        user_account.first_deposit = clock.unix_timestamp;
        vault.depositor_count = vault.depositor_count
            .checked_add(1)
            .ok_or(VaultError::MathOverflow)?;
    }
    
    user_account.shares = user_account.shares
        .checked_add(shares_to_mint)
        .ok_or(VaultError::MathOverflow)?;
    user_account.total_deposited = user_account.total_deposited
        .checked_add(amount)
        .ok_or(VaultError::MathOverflow)?;
    user_account.last_activity = clock.unix_timestamp;
    
    // Emit deposit event
    emit!(DepositEvent {
        user: ctx.accounts.user.key(),
        lamports: amount,
        shares_minted: shares_to_mint,
        share_price: share_price,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    msg!("Deposit successful");
    msg!("Amount: {} lamports", amount);
    msg!("Shares minted: {}", shares_to_mint);
    msg!("Share price: {}", share_price);
    
    Ok(())
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    /// The vault state account
    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump = vault.bump
    )]
    pub vault: Box<Account<'info, VaultState>>,
    
    /// The jSOLi token mint
    #[account(
        mut,
        seeds = [JSOLI_MINT_SEED],
        bump
    )]
    pub jsoli_mint: Box<Account<'info, Mint>>,
    
    /// User's jSOLi token account
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = jsoli_mint,
        associated_token::authority = user
    )]
    pub user_jsol_account: Box<Account<'info, TokenAccount>>,
    
    /// User account for tracking position
    #[account(
        init_if_needed,
        payer = user,
        space = UserAccount::LEN,
        seeds = [USER_ACCOUNT_SEED, user.key().as_ref()],
        bump
    )]
    pub user_account: Box<Account<'info, UserAccount>>,
    
    /// Vault's SOL holding account
    /// CHECK: This is a PDA that holds SOL
    #[account(
        mut,
        seeds = [b"vault_sol"],
        bump
    )]
    pub vault_sol_account: UncheckedAccount<'info>,
    
    /// The user depositing SOL
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// System program
    pub system_program: Program<'info, System>,
    
    /// Token program
    pub token_program: Program<'info, Token>,
    
    /// Associated token program
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    
    /// Rent sysvar
    pub rent: Sysvar<'info, Rent>,

    /// Pyth Oracle Account (SOL/USD)
    /// CHECK: Validated by Pyth SDK and Feed ID check in handler
    pub oracle_account: AccountInfo<'info>,
}
