//! Safe math operations for the jSOL Vault
//!
//! All operations are checked to prevent overflow/underflow.

use anchor_lang::prelude::*;
use crate::errors::VaultError;

/// Safely add two u64 values
pub fn checked_add(a: u64, b: u64) -> Result<u64> {
    a.checked_add(b).ok_or_else(|| error!(VaultError::MathOverflow))
}

/// Safely subtract two u64 values
pub fn checked_sub(a: u64, b: u64) -> Result<u64> {
    a.checked_sub(b).ok_or_else(|| error!(VaultError::MathUnderflow))
}

/// Safely multiply two u64 values
pub fn checked_mul(a: u64, b: u64) -> Result<u64> {
    a.checked_mul(b).ok_or_else(|| error!(VaultError::MathOverflow))
}

/// Safely divide two u64 values
pub fn checked_div(a: u64, b: u64) -> Result<u64> {
    if b == 0 {
        return Err(error!(VaultError::DivisionByZero));
    }
    a.checked_div(b).ok_or_else(|| error!(VaultError::DivisionByZero))
}

/// Calculate percentage in basis points
/// Returns (value * bps) / 10000
pub fn calculate_bps(value: u64, bps: u16) -> Result<u64> {
    let result = (value as u128)
        .checked_mul(bps as u128)
        .ok_or(VaultError::MathOverflow)?
        .checked_div(10000)
        .ok_or(VaultError::DivisionByZero)?;
    
    Ok(result as u64)
}

/// Calculate share price with precision
/// Returns (total_value * precision) / total_shares
pub fn calculate_share_price(total_value: u64, total_shares: u64, precision: u64) -> Result<u64> {
    if total_shares == 0 {
        return Ok(precision); // 1:1 initial price
    }
    
    let result = (total_value as u128)
        .checked_mul(precision as u128)
        .ok_or(VaultError::MathOverflow)?
        .checked_div(total_shares as u128)
        .ok_or(VaultError::DivisionByZero)?;
    
    Ok(result as u64)
}

/// Calculate shares for a deposit
/// Returns (deposit * total_shares) / total_value
pub fn calculate_shares_for_deposit(
    deposit: u64,
    total_value: u64,
    total_shares: u64,
) -> Result<u64> {
    if total_shares == 0 || total_value == 0 {
        return Ok(deposit); // 1:1 for first deposit
    }
    
    let result = (deposit as u128)
        .checked_mul(total_shares as u128)
        .ok_or(VaultError::MathOverflow)?
        .checked_div(total_value as u128)
        .ok_or(VaultError::DivisionByZero)?;
    
    Ok(result as u64)
}

/// Calculate value for shares
/// Returns (shares * total_value) / total_shares
pub fn calculate_value_for_shares(
    shares: u64,
    total_value: u64,
    total_shares: u64,
) -> Result<u64> {
    if total_shares == 0 {
        return Ok(0);
    }
    
    let result = (shares as u128)
        .checked_mul(total_value as u128)
        .ok_or(VaultError::MathOverflow)?
        .checked_div(total_shares as u128)
        .ok_or(VaultError::DivisionByZero)?;
    
    Ok(result as u64)
}

/// Calculate absolute difference between two values
pub fn abs_diff(a: u16, b: u16) -> u16 {
    if a > b {
        a - b
    } else {
        b - a
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_calculate_bps() {
        // 10% of 1000 = 100
        assert_eq!(calculate_bps(1000, 1000).unwrap(), 100);
        
        // 50% of 1000 = 500
        assert_eq!(calculate_bps(1000, 5000).unwrap(), 500);
        
        // 0.5% of 1000 = 5
        assert_eq!(calculate_bps(1000, 50).unwrap(), 5);
    }
    
    #[test]
    fn test_share_price_calculation() {
        let precision = 1_000_000_000u64;
        
        // Initial price is 1:1
        assert_eq!(calculate_share_price(0, 0, precision).unwrap(), precision);
        
        // 100 value, 100 shares = 1:1
        assert_eq!(calculate_share_price(100, 100, precision).unwrap(), precision);
        
        // 200 value, 100 shares = 2:1
        assert_eq!(calculate_share_price(200, 100, precision).unwrap(), precision * 2);
    }
    
    #[test]
    fn test_abs_diff() {
        assert_eq!(abs_diff(100, 50), 50);
        assert_eq!(abs_diff(50, 100), 50);
        assert_eq!(abs_diff(100, 100), 0);
    }
}
