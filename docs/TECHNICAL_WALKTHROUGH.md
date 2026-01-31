# jSOLi Technical Walkthrough 

This document provides a technical overview of the jSOLi (Jubilee Staking Index) protocol, detailing the architecture, core logic, and user flows. It serves as a reference for developers, auditors, and partners.

## 1. Architecture Overview 

jSOLi is built on the Solana blockchain using the Anchor framework. It operates as a non-custodial vault that aggregates user SOL deposits and routes them to whitelisted Liquid Staking Token (LST) protocols.

**Core Components:**
- **Vault Account (`VaultState`)**: Stores global state, including total TVL, total shares, fees, and protocol allocations.
- **User Account (`UserAccount`)**: Tracks individual user shares and pending withdrawal requests.
- **jSOLi Mint**: The SPL Token representing a share of the vault's diversified portfolio.
- **Vault PDA**: The Program Derived Address that holds the SOL and LST assets.

## 2. Core Logic & Flows 

### A. Deposit Flow
The deposit process converts user SOL into jSOLi shares.

1.  **Input**: User sends `amount` of SOL.
2.  **Validation**:
    *   Checks if vault is active (not paused).
    *   Checks if `deposit_cap` would be exceeded.
3.  **Share Calculation**:
    *   `shares_to_mint = (amount * total_shares) / total_tvl`
    *   *First Depositor Protection*: If `total_shares == 0`, a small number of shares (1000) are burned to prevent inflation attacks.
4.  **Action**:
    *   SOL is transferred from user to Vault PDA.
    *   jSOLi tokens are minted to the user.
    *   Vault state (`total_tvl`, `total_shares`) is updated.
5.  **Allocation**:
    *   The deposited SOL is conceptually allocated according to the `allocations` vector in `VaultState`. In a production efficient implementation, the actual routing (swap/stake) happens in batches or via rebalance to save gas, but the *value* is immediately accretive.

### B. Withdrawal Flow (Two-Step)
Unlike standard swaps, withdrawing from LSTs often requires a cooldown period (unstaking). jSOLi mirrors this.

**Step 1: Request Withdrawal**
1.  **Input**: User specifies `shares` to burn.
2.  **Calculation**:
    *   `sol_value = (shares * total_tvl) / total_shares`
3.  **Action**:
    *   jSOLi shares are transferred to the vault (escrow) or burned immediately (current implementation tracks them as pending burn).
    *   A `WithdrawRequest` is recorded in the `UserAccount` with:
        *   `amount`: SOL value requested.
        *   `shares`: Shares locked.
        *   `unlock_slot`: Current slot + withdrawal delay (e.g., 3 days).
    *   Vault `locked_liquidity` increases.

**Step 2: Claim Withdrawal**
1.  **Input**: Triggered by user after `unlock_slot` has passed.
2.  **Action**:
    *   Vault verifies time requirement is met.
    *   Vault transfers SOL from PDA to user.
    *   Pending request is cleared.
    *   Corresponding shares are finally burned if held in escrow.

### C. Rebalancing (The "Brain") 
The rebalance instruction maintains the target portfolio weights.

1.  **Trigger**: Permissionless (anyone can call it), incentivized or keeper-run.
2.  **Logic**:
    *   Iterates through all supported protocols.
    *   Calculates `current_allocation %` vs `target_allocation %`.
    *   If deviation > threshold (e.g., 1%):
        *   **Divest**: Unstake/Swap from Overweight protocols -> SOL.
        *   **Invest**: Stake/Swap SOL -> Underweight protocols.
3.  **Safety**:
    *   `max_slippage`: Revert if swap return is too low.
    *   `min_rebalance_interval`: Prevents churn.

## 3. Key Functions Reference

| Function | Description | Access |
| :--- | :--- | :--- |
| `initialize` | Sets up the vault, mint, and initial config. | Admin (Multisig) |
| `deposit` | User sends SOL, gets jSOLi. | Public |
| `request_withdraw` | Starts the exit timer. | Public |
| `claim_withdraw` | Finalizes exit and sends SOL. | Public |
| `rebalance` | Adjusts portfolio weights. | Keepers/Public |
| `set_emergency_mode` | Bypasses cooldowns (if liquid) in crisis. | Admin |
| `update_fees` | Changes management/performance fees. | Admin (Timelock*) |

## 4. Measuring Performance (APY) 

**The Concept:**
jSOLi is an **appreciating token**.
*   **Share Price** = `Total Equity (SOL Value of all LSTs)` / `Total Shares Outstanding`

**How APY works:**
1.  **Day 0**: You deposit 1 SOL. Share Price = 1.0. You get 1 jSOLi.
2.  **Day 365**: The LSTs (JitoSOL, mSOL, etc.) have all grown in value vs SOL by ~7%.
3.  **Result**: The Vault's `Total Equity` has grown by 7%.
4.  **End State**: Share Price = 1.07. Your 1 jSOLi is now worth 1.07 SOL.

**Visualization:**
To show this visually, fetch the historical "Exchange Rate" (Vault SOL Balance / Supply) daily and plot it. A steep line = high APY.

## 5. Mainnet Readiness Checklist 

To move from Devnet to Mainnet (`TBD` -> Real Address), we need:

1.  **Audit**: A completed manual audit report (in progress/planned).
2.  **Real Assets**: Replace Devnet "Mock" LSTs with real JitoSOL, mSOL, bSOL addresses.
3.  **Multisig Admin**: Transfer `Update Authority` to a Squads Multisig (Hundredfold + Jubilee).
4.  **Keepers**: Run a cron job (or Gelato/Clockwork) to call `rebalance` and `update_prices` periodically.
5.  **Liquidity**: Seeding the pool with initial SOL (~10-100 SOL) avoids high gas costs for the very first user (though dead shares fix the security issue).

## 6. Security Features

*   **Circuit Breakers**: Emergency Pause stops all outflows if suspicious activity is detected.
*   **Drift Protection**: Caps total allocation per protocol (e.g., max 50% Marinade) to enforce diversification.
*   **Oracle Guard**: Uses Pyth/Chainlink to verify LST prices before rebalancing, preventing manipulation attacks.
