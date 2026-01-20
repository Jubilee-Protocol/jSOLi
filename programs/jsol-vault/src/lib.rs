//! jSOL Vault - A Production-Grade Solana LST Aggregator
//!
//! This program implements an automated vault that aggregates deposits into
//! various Liquid Staking Token (LST) protocols on Solana for optimized yield.
//!
//! ## Features
//! - Aggregate SOL across multiple LST protocols (Jito, Marinade, BlazeStake, Lido)
//! - Automated rebalancing based on APY optimization
//! - Share-based accounting (jSOL token)
//! - Management and performance fees
//! - Emergency pause mechanism
//! - Two-step withdrawal with unbonding period
//!
//! ## Architecture
//! The vault uses PDAs for state management and the jSOL mint authority.
//! Users deposit SOL and receive jSOL shares representing their position.
//! The vault automatically allocates deposits across configured protocols.

use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;
pub mod utils;

use instructions::*;

declare_id!("EYJcdmSJEEtkTLHhgDCvGci1GgEthDe4RFn1tV2PoZu3");

#[program]
pub mod jsol_vault {
    use super::*;

    /// Initialize the jSOL vault with configuration
    ///
    /// Creates the vault state PDA and jSOL mint.
    /// Can only be called once by the initial authority.
    ///
    /// # Arguments
    /// * `allocations` - Initial protocol allocation targets
    /// * `management_fee_bps` - Management fee in basis points (max 100)
    /// * `performance_fee_bps` - Performance fee in basis points (max 2000)
    /// * `deposit_cap` - Maximum total deposits (0 = no cap)
    pub fn initialize(
        ctx: Context<Initialize>,
        allocations: Vec<InitAllocation>,
        management_fee_bps: u16,
        performance_fee_bps: u16,
        deposit_cap: u64,
    ) -> Result<()> {
        initialize::handler(ctx, allocations, management_fee_bps, performance_fee_bps, deposit_cap)
    }

    /// Deposit SOL into the vault
    ///
    /// Mints jSOL shares to the depositor based on current share price.
    ///
    /// # Arguments
    /// * `amount` - Amount of lamports to deposit
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        deposit::handler(ctx, amount)
    }

    /// Request a withdrawal from the vault
    ///
    /// Creates a pending withdrawal that can be completed after
    /// the unstaking period has elapsed.
    ///
    /// # Arguments
    /// * `shares` - Number of jSOL shares to withdraw
    pub fn request_withdraw(ctx: Context<RequestWithdraw>, shares: u64) -> Result<()> {
        withdraw::request_handler(ctx, shares)
    }

    /// Complete a pending withdrawal
    ///
    /// Burns jSOL shares and transfers SOL to the user.
    /// Can only be called after the unbonding period.
    pub fn complete_withdraw(ctx: Context<CompleteWithdraw>) -> Result<()> {
        withdraw::complete_handler(ctx)
    }

    /// Rebalance vault allocations
    ///
    /// Adjusts actual allocations to match targets.
    /// Can be called by anyone if deviation exceeds threshold.
    pub fn rebalance(ctx: Context<Rebalance>) -> Result<()> {
        rebalance::handler(ctx)
    }

    /// Update vault configuration
    ///
    /// Admin-only function to update fees and other config.
    pub fn update_config(
        ctx: Context<AdminAction>,
        new_config: UpdateConfigParams,
    ) -> Result<()> {
        admin::update_config_handler(ctx, new_config)
    }

    /// Update target allocations
    ///
    /// Admin-only function to change protocol allocation targets.
    pub fn update_allocations(
        ctx: Context<AdminAction>,
        new_allocations: Vec<UpdateAllocation>,
    ) -> Result<()> {
        admin::update_allocations_handler(ctx, new_allocations)
    }

    /// Collect accumulated fees
    ///
    /// Admin-only function to collect management and performance fees.
    pub fn collect_fees(ctx: Context<CollectFees>) -> Result<()> {
        admin::collect_fees_handler(ctx)
    }

    /// Pause the vault
    ///
    /// Admin-only emergency function to halt deposits/withdrawals.
    pub fn pause(ctx: Context<AdminAction>) -> Result<()> {
        admin::pause_handler(ctx)
    }

    /// Unpause the vault
    ///
    /// Admin-only function to resume normal operations.
    pub fn unpause(ctx: Context<AdminAction>) -> Result<()> {
        admin::unpause_handler(ctx)
    }

    /// Stake SOL to a specific protocol
    ///
    /// Admin-only function to stake vault SOL to an LST protocol.
    pub fn stake_to_protocol(
        ctx: Context<StakeToProtocol>,
        protocol: u8,
        amount: u64,
    ) -> Result<()> {
        staking::stake_handler(ctx, protocol, amount)
    }

    /// Unstake from a specific protocol
    ///
    /// Admin-only function to initiate unstaking from an LST protocol.
    pub fn unstake_from_protocol(
        ctx: Context<UnstakeFromProtocol>,
        protocol: u8,
        amount: u64,
    ) -> Result<()> {
        staking::unstake_handler(ctx, protocol, amount)
    }
}
