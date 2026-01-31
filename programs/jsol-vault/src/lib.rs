//! jSOL Vault: decentralized LST index protocol
//! 
//! This program allows users to deposit SOL and receive jSOLi shares,
//! which represent a diversified index of Solana LSTs (Jito, Marinade, BlazeStake, Jupiter).

use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;
pub mod utils;

use instructions::*;

declare_id!("FQARiEHe31wCxwJHYwQxjqGryvXCFx4h2hJvPeQ7QgB8");

#[program]
pub mod jsol_vault {
    use super::*;

    /// Initialize the jSOL vault with configuration
    ///
    /// Creates the vault state PDA and jSOL mint.
    /// Can only be called once by the initial authority.
    pub fn initialize(
        ctx: Context<Initialize>,
        allocations: Vec<InitAllocation>,
        management_fee_bps: u16,
        performance_fee_bps: u16,
        deposit_cap: u64,
    ) -> Result<()> {
        initialize_handler(ctx, allocations, management_fee_bps, performance_fee_bps, deposit_cap)
    }

    /// Deposit SOL into the vault
    ///
    /// Mints jSOLi shares to the depositor based on current share price.
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        deposit_handler(ctx, amount)
    }

    /// Request a withdrawal from the vault
    pub fn request_withdraw(ctx: Context<RequestWithdraw>, shares: u64) -> Result<()> {
        withdraw::request_handler(ctx, shares)
    }

    /// Complete a pending withdrawal
    pub fn complete_withdraw(ctx: Context<CompleteWithdraw>) -> Result<()> {
        withdraw::complete_handler(ctx)
    }

    /// Rebalance vault allocations
    pub fn rebalance(ctx: Context<Rebalance>) -> Result<()> {
        rebalance_handler(ctx)
    }

    /// Update vault configuration
    pub fn update_config(
        ctx: Context<AdminAction>,
        new_config: UpdateConfigParams,
    ) -> Result<()> {
        admin::update_config_handler(ctx, new_config)
    }

    /// Update target allocations
    pub fn update_allocations(
        ctx: Context<AdminAction>,
        new_allocations: Vec<UpdateAllocation>,
    ) -> Result<()> {
        admin::update_allocations_handler(ctx, new_allocations)
    }

    /// Collect accumulated fees
    pub fn collect_fees(ctx: Context<CollectFees>) -> Result<()> {
        admin::collect_fees_handler(ctx)
    }

    /// Pause the vault
    pub fn pause(ctx: Context<AdminAction>) -> Result<()> {
        admin::pause_handler(ctx)
    }

    /// Unpause the vault
    pub fn unpause(ctx: Context<AdminAction>) -> Result<()> {
        admin::unpause_handler(ctx)
    }

    /// Stake SOL to a specific protocol
    pub fn stake_to_protocol(
        ctx: Context<StakeToProtocol>,
        protocol: u8,
        amount: u64,
    ) -> Result<()> {
        staking::stake_handler(ctx, protocol, amount)
    }

    /// Unstake from a specific protocol
    pub fn unstake_from_protocol(
        ctx: Context<UnstakeFromProtocol>,
        protocol: u8,
        amount: u64,
    ) -> Result<()> {
        staking::unstake_handler(ctx, protocol, amount)
    }
}
