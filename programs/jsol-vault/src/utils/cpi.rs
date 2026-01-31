//! LST Protocol CPI Helpers
//! 
//! Provides functions to interact with external LST protocols.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    program::invoke_signed,
    system_instruction,
};
use crate::errors::VaultError;

/// Stake SOL to Jito (SPL Stake Pool)
pub fn stake_jito_sol<'info>(
    _pool: &AccountInfo<'info>,
    _withdraw_authority: &AccountInfo<'info>,
    _reserve_stake: &AccountInfo<'info>,
    _mint: &AccountInfo<'info>,
    _user_token_account: &AccountInfo<'info>,
    _vault_sol_account: &AccountInfo<'info>,
    _stake_pool_program: &AccountInfo<'info>,
    _token_program: &AccountInfo<'info>,
    lamports: u64,
) -> Result<()> {
    // In a production implementation, we would use spl_stake_pool::instruction::deposit_sol
    // but we can also use raw invoke if needed.
    
    msg!("CPI: Staking {} lamports to Jito", lamports);
    
    // Placeholder for actual CPI
    // Real implementation would use spl_stake_pool::instruction::deposit_sol
    
    Ok(())
}

/// Stake SOL to Marinade
pub fn stake_marinade<'info>(
    _marinade_state: &AccountInfo<'info>,
    _msol_mint: &AccountInfo<'info>,
    _liq_pool_sol_pda: &AccountInfo<'info>,
    _liqp_pool_msol_pda: &AccountInfo<'info>,
    _user_token_account: &AccountInfo<'info>,
    _vault_sol_account: &AccountInfo<'info>,
    _marinade_program: &AccountInfo<'info>,
    _token_program: &AccountInfo<'info>,
    lamports: u64,
) -> Result<()> {
    msg!("CPI: Staking {} lamports to Marinade", lamports);
    
    // Placeholder for actual CPI 
    // Real implementation would use marinade_sdk::instruction::liquid_stake
    
    Ok(())
}
