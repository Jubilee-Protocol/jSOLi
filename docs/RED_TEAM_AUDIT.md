# jSOLi Red Team Security Audit (Pre-Mainnet)

## Overview
This document outlines the "Red Team" security assessment for jSOLi after the transition to the **4-way 25% LST split**. We focus on identifying high-impact vulnerabilities that could lead to fund loss, oracle manipulation, or protocol insolvency.

## Attack Vectors & Stress Tests

### 1. Index Invariants (Fund Drain)
*   **Vector**: Exploiting the `rebalance` logic to force the vault into a bad allocation or drain dust.
*   **Test**: Attempt to call `rebalance` when deviations are < 5%. (Results: Properly rejected by `VaultError::DeviationTooSmall`).
*   **Test**: Simulate a total protocol failure (e.g., mSOL goes to 0). Verify that the 50% max allocation limit prevents more than half the vault from being exposed to any single asset.

### 2. First-Depositor Dilution (Fixed)
*   **Vector**: Manipulating the share price before the first "real" user deposits.
*   **Test**: Verify `MINIMUM_INITIAL_SHARES` (1,000) are actually burned.
*   **Validation**: Calculation in `state.rs` correctly subtracts dead shares from the first mint.

### 3. Oracle Price Manipulation
*   **Vector**: Using a flash-loan or market manipulation to skew the Pyth price during a deposit/withdrawal.
*   **Mitigation**: Pyth's confidence interval check + `MAX_ORACLE_STALENESS_SECS` (60s).
*   **Test**: Simulate a stale Pyth feed. (Results: Transaction reverts with `VaultError::StaleOraclePrice`).

### 4. Fee Skimming
*   **Vector**: Setting management fees higher than the 100bps hard-cap.
*   **Test**: Call `update_config` with `management_fee_bps = 500`. (Results: Rejected by bounds check).

### 5. Withdrawal Race Conditions
*   **Vector**: Requesting a withdrawal and attempting to "double-spend" or skip the unbonding period.
*   **Test**: Attempt to `complete_withdrawal` 1 hour after request. (Results: Rejected by `VaultError::WithdrawalNotReady`).

## Critical Risk Assessment

| Risk Area | Status | Mitigation |
| :--- | :--- | :--- |
| **Asset Depeg** | **MEDIUM** | 25% Diversification limit ensures no single LST can wipe the vault. |
| **Oracle Failure** | **LOW** | Pyth staleness checks and confidence intervals. |
| **Admin Hijack** | **HIGH** | Authority SHOULD be a Multisig (Squads) or Timelock for Mainnet. |
| **CPI Failures** | **LOW** | Each protocol interaction wrapped in `Result` checks. |

## Recommendations
1. **Multisig**: Transition the `VaultState.authority` to a Squads MSIG immediately upon Mainnet deployment.
2. **Circuit Breakers**: Consider an automated "emergency pause" if the vault's total value drops >20% within 1 hour.
3. **Formal Verification**: Use K-Framework or similar to verify the `calculate_shares` math for rounding errors.

---
*"A wise man thinks ahead; a fool doesn't, and even brags about it!"* — Proverbs 13:16
