//! Oracle integration utilities
//!
//! Handles price feeds and exchange rate lookups.

use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::VaultError;
use crate::state::LstProtocol;

/// Oracle price data
#[derive(Debug, Clone)]
pub struct OraclePrice {
    pub price: u64,        // Price in lamports (scaled)
    pub confidence: u64,   // Confidence interval
    pub timestamp: i64,    // Unix timestamp of last update
}

/// Get protocol APY (placeholder - would integrate with actual oracle)
/// 
/// Returns APY in basis points (e.g., 500 = 5%)
pub fn get_protocol_apy(_protocol: LstProtocol) -> Result<u64> {
    // In production, this would query:
    // 1. Pyth Network for on-chain APY feeds
    // 2. Protocol-specific state accounts
    // 3. Historical performance calculations
    
    // Placeholder values based on typical LST APYs
    Ok(match _protocol {
        LstProtocol::Jito => 750,       // 7.5% (includes MEV rewards)
        LstProtocol::Marinade => 670,   // 6.7%
        LstProtocol::BlazeStake => 680, // 6.8%
        LstProtocol::Lido => 650,       // 6.5%
        LstProtocol::Native => 600,     // 6.0% (base staking rate)
        LstProtocol::Jupiter => 700,    // 7.0%
    })
}

/// Get LST exchange rate (LST per SOL)
/// 
/// Returns exchange rate scaled by SHARE_PRECISION
pub fn get_lst_exchange_rate(_protocol: LstProtocol) -> Result<u64> {
    // In production, this would query the protocol's state account
    // to get the current exchange rate
    
    // For now, return a slightly-above-1 rate (LSTs appreciate over time)
    // This represents the accumulated staking rewards
    Ok(match _protocol {
        LstProtocol::Jito => 1_050_000_000,       // 1.05 SOL per jitoSOL
        LstProtocol::Marinade => 1_045_000_000,   // 1.045 SOL per mSOL
        LstProtocol::BlazeStake => 1_042_000_000, // 1.042 SOL per bSOL
        LstProtocol::Lido => 1_038_000_000,       // 1.038 SOL per stSOL  
        LstProtocol::Native => SHARE_PRECISION,    // 1:1 for native
        LstProtocol::Jupiter => 1_048_000_000,    // 1.048 SOL per JupSOL
    })
}

/// Validate oracle data freshness
pub fn validate_oracle_freshness(oracle_timestamp: i64, current_timestamp: i64) -> Result<()> {
    let age = current_timestamp
        .checked_sub(oracle_timestamp)
        .ok_or(VaultError::MathUnderflow)?;
    
    require!(
        age <= MAX_ORACLE_STALENESS_SECS,
        VaultError::StaleOraclePrice
    );
    
    Ok(())
}

/// Validate oracle price deviation
pub fn validate_price_deviation(
    current_price: u64,
    reference_price: u64,
    max_deviation_bps: u16,
) -> Result<()> {
    if reference_price == 0 {
        return Ok(()); // Can't calculate deviation with zero reference
    }
    
    let deviation = if current_price > reference_price {
        ((current_price - reference_price) as u128)
            .checked_mul(BPS_DENOMINATOR as u128)
            .ok_or(VaultError::MathOverflow)?
            .checked_div(reference_price as u128)
            .ok_or(VaultError::DivisionByZero)?
    } else {
        ((reference_price - current_price) as u128)
            .checked_mul(BPS_DENOMINATOR as u128)
            .ok_or(VaultError::MathOverflow)?
            .checked_div(reference_price as u128)
            .ok_or(VaultError::DivisionByZero)?
    };
    
    require!(
        deviation <= max_deviation_bps as u128,
        VaultError::OraclePriceDeviation
    );
    
    Ok(())
}

/// Calculate weighted average APY across allocations
pub fn get_weighted_average_apy(
    allocations: &[(LstProtocol, u16)], // (protocol, allocation_bps)
) -> Result<u64> {
    let mut weighted_sum: u128 = 0;
    let mut total_allocation: u128 = 0;
    
    for (protocol, bps) in allocations {
        let apy = get_protocol_apy(*protocol)?;
        weighted_sum = weighted_sum
            .checked_add(
                (apy as u128)
                    .checked_mul(*bps as u128)
                    .ok_or(VaultError::MathOverflow)?
            )
            .ok_or(VaultError::MathOverflow)?;
        total_allocation = total_allocation
            .checked_add(*bps as u128)
            .ok_or(VaultError::MathOverflow)?;
    }
    
    if total_allocation == 0 {
        return Ok(0);
    }
    
    let weighted_apy = weighted_sum
        .checked_div(total_allocation)
        .ok_or(VaultError::DivisionByZero)?;
    
    Ok(weighted_apy as u64)
}

/// Pyth price feed IDs (mainnet)
/// These would be used with the Pyth SDK for actual price queries
pub mod pyth_feeds {
    /// SOL/USD price feed
    pub const SOL_USD: &str = "H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG";
    
    /// BTC/USD price feed (for jBTCi compatibility)
    pub const BTC_USD: &str = "GVXRSBjFk6e6J3NbVPXohDJetcTjaeeuykUpbQF8UoMU";
}
