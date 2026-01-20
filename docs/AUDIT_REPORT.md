# jSOL Vault Security Audit Report

> **Version**: 0.1.0 (Pre-Audit Draft)  
> **Program ID**: `EYJcdmSJEEtkTLHhgDCvGci1GgEthDe4RFn1tV2PoZu3`  
> **Network**: Solana Devnet (Pending)  
> **Audit Date**: January 20, 2026  
> **Status**: ⚠️ **CRITICAL ISSUES FOUND** — Requires fixes before deployment

---

## Executive Summary

| Category | Score | Notes |
|----------|-------|-------|
| **Overall Security** | **68/100** ⚠️ | Critical vulnerability in withdrawal flow |
| Code Quality | 88/100 | Well-structured, good documentation |
| Access Control | 82/100 | Good but fee collector unchecked |
| Arithmetic Safety | 95/100 | Checked math throughout |
| Reentrancy Protection | 60/100 | No explicit guards on CPI |
| Oracle Security | 50/100 | Placeholder implementation only |

**Verdict**: Critical issues must be fixed before any deployment. Code architecture is sound but implementation has exploitable vulnerabilities.

---

## Critical Findings (1 Found)

### CRITICAL-01: Withdrawal Burns Tokens Using Vault Authority

**Severity**: 🔴 CRITICAL  
**File**: `instructions/withdraw.rs:125-134`  
**Status**: ❌ OPEN

**Issue**:
The `complete_handler` function burns jSOL tokens using the vault as the burn authority:

```rust
let burn_ctx = CpiContext::new_with_signer(
    ctx.accounts.token_program.to_account_info(),
    Burn {
        mint: ctx.accounts.jsol_mint.to_account_info(),
        from: ctx.accounts.user_jsol_account.to_account_info(),
        authority: ctx.accounts.vault.to_account_info(), // ❌ WRONG!
    },
    signer_seeds,
);
token::burn(burn_ctx, withdraw_request.shares)?;
```

**Problem**: The vault PDA is not the authority of the user's token account. The **user** is. This will cause all withdrawal completions to fail with "owner does not match" error.

**Attack Vector**: None (fails safely), but breaks core functionality.

**Fix**:
```rust
let burn_ctx = CpiContext::new(
    ctx.accounts.token_program.to_account_info(),
    Burn {
        mint: ctx.accounts.jsol_mint.to_account_info(),
        from: ctx.accounts.user_jsol_account.to_account_info(),
        authority: ctx.accounts.user.to_account_info(), // ✅ User is authority
    },
);
token::burn(burn_ctx, withdraw_request.shares)?;
```

---

## High Severity Findings (3 Found)

### HIGH-01: First Depositor Share Manipulation Attack

**Severity**: 🟠 HIGH  
**File**: `state.rs:193-204`, `instructions/deposit.rs:37`  
**Status**: ❌ OPEN

**Issue**:
The first depositor receives shares 1:1 with lamports. An attacker can:

1. Deposit 1 lamport → receive 1 share
2. Directly transfer 10 SOL to vault (donation)
3. Pool now has 10 SOL + 1 lamport, 1 share outstanding
4. Next depositor deposits 10 SOL → receives ~1 share (severe dilution)
5. Attacker withdraws 1 share → receives ~10 SOL

**Attack Cost**: ~10 SOL + gas  
**Profit**: ~5 SOL from victim's deposit

**Fix**: Implement minimum initial deposit and "dead shares":
```rust
const MIN_INITIAL_DEPOSIT: u64 = 1_000_000_000; // 1 SOL
const DEAD_SHARES: u64 = 1000; // Burn to "dead" address

// First deposit burns minimum shares to prevent manipulation
if self.total_shares == 0 {
    let shares = deposit_lamports;
    // Burn dead shares
    mint_to_dead_address(DEAD_SHARES);
    return shares - DEAD_SHARES;
}
```

---

### HIGH-02: Missing Duplicate Protocol Validation

**Severity**: 🟠 HIGH  
**File**: `instructions/initialize.rs:41-49`, `instructions/admin.rs:236-245`  
**Status**: ❌ OPEN

**Issue**:
Neither `initialize` nor `update_allocations_handler` checks for duplicate protocols:

```rust
for alloc in &allocations {
    // ❌ No duplicate check!
    require!(
        alloc.target_bps <= MAX_PROTOCOL_ALLOCATION_BPS,
        VaultError::AllocationExceedsMax
    );
}
```

**Attack Vector**:
- Admin passes `[{Jito, 50%}, {Jito, 30%}, {Jito, 20%}]` = 100% "valid"
- All funds go to single protocol, defeating diversification
- Allocation tracking becomes inconsistent

**Fix**:
```rust
// Check for duplicates
let mut seen_protocols = Vec::new();
for alloc in &allocations {
    require!(!seen_protocols.contains(&alloc.protocol), VaultError::DuplicateProtocol);
    seen_protocols.push(alloc.protocol);
}
```

---

### HIGH-03: Fee Collector Not Validated

**Severity**: 🟠 HIGH  
**File**: `instructions/admin.rs:317-319`  
**Status**: ❌ OPEN

**Issue**:
```rust
/// Fee collector account
/// CHECK: This receives the fees
#[account(mut)]
pub fee_collector: UncheckedAccount<'info>,
```

The `fee_collector` account has no validation. Any account can be passed:

**Attack Vector**:
1. Malicious authority calls `collect_fees` with attacker's wallet as fee_collector
2. All accumulated fees go to attacker wallet instead of protocol treasury

**Fix**: Store expected fee collector in vault state or use hard-coded PDA:
```rust
#[account(
    mut,
    seeds = [FEE_COLLECTOR_SEED],
    bump
)]
pub fee_collector: UncheckedAccount<'info>,
```

Or store in vault state:
```rust
pub struct VaultState {
    pub fee_collector: Pubkey,  // Add this
    // ...
}

#[account(
    mut,
    constraint = fee_collector.key() == vault.fee_collector @ VaultError::InvalidFeeCollector
)]
pub fee_collector: UncheckedAccount<'info>,
```

---

## Medium Severity Findings (4 Found)

### MEDIUM-01: Share Price Calculation Uses unwrap_or

**Severity**: 🟡 MEDIUM  
**File**: `state.rs:180-189`  
**Status**: ❌ OPEN

**Issue**:
```rust
pub fn share_price(&self) -> u64 {
    if self.total_shares == 0 {
        SHARE_PRECISION
    } else {
        self.total_tvl
            .checked_mul(SHARE_PRECISION)
            .unwrap_or(0)  // ❌ Masks overflow errors
            .checked_div(self.total_shares)
            .unwrap_or(SHARE_PRECISION)  // ❌ Masks division errors
    }
}
```

**Problem**: If overflow occurs, returns 0 or SHARE_PRECISION silently. This could cause incorrect share calculations downstream.

**Fix**: Return Result or use saturating arithmetic:
```rust
pub fn share_price(&self) -> Result<u64> {
    if self.total_shares == 0 {
        Ok(SHARE_PRECISION)
    } else {
        let result = (self.total_tvl as u128)
            .checked_mul(SHARE_PRECISION as u128)
            .ok_or(VaultError::MathOverflow)?
            .checked_div(self.total_shares as u128)
            .ok_or(VaultError::DivisionByZero)?;
        Ok(result as u64)
    }
}
```

---

### MEDIUM-02: No Reentrancy Guards on CPI Calls

**Severity**: 🟡 MEDIUM  
**File**: `instructions/deposit.rs`, `instructions/withdraw.rs`  
**Status**: ⚠️ WARNING

**Issue**:
Deposit performs SOL transfer then updates state:
```rust
// Transfer SOL from user to vault
anchor_lang::system_program::transfer(cpi_context, amount)?;

// Mint jSOL shares AFTER transfer
token::mint_to(mint_ctx, shares_to_mint)?;

// Update vault state LAST
vault.total_tvl = vault.total_tvl.checked_add(amount)?;
```

**Risk**: Current Solana/Anchor architecture makes reentrancy difficult, but future CPI to external protocols (Marinade, Jito) could introduce reentrancy vectors.

**Recommendation**: Add state mutex or explicit reentrancy guard:
```rust
pub struct VaultState {
    pub is_processing: bool,  // Lock flag
}

// At start of handler
require!(!vault.is_processing, VaultError::Reentrancy);
vault.is_processing = true;
// ... logic ...
vault.is_processing = false;
```

---

### MEDIUM-03: Rebalance Has No Slippage Protection (Placeholder)

**Severity**: 🟡 MEDIUM  
**File**: `instructions/rebalance.rs:68-84`  
**Status**: ⚠️ PLACEHOLDER

**Issue**:
```rust
// For now, we update current allocations to target (placeholder)
let mut new_allocations = [0u16; MAX_PROTOCOLS];

for i in 0..vault.num_allocations as usize {
    // ❌ No actual swap logic
    // ❌ No slippage check
    alloc.amount = new_amount;
    alloc.current_bps = alloc.target_bps;
}
```

**Risk**: When real swaps are implemented, MEV attacks possible without slippage protection.

**Recommendation**: When implementing real swaps:
```rust
let expected_output = calculate_expected_output(amount);
let actual_output = swap(amount);
let slippage = ((expected_output - actual_output) * BPS_DENOMINATOR) / expected_output;
require!(slippage <= vault.config.max_slippage_bps, VaultError::SlippageExceeded);
```

---

### MEDIUM-04: Staking Functions Are Placeholders

**Severity**: 🟡 MEDIUM  
**File**: `instructions/staking.rs`  
**Status**: ⚠️ PLACEHOLDER

**Issue**:
```rust
// In a real implementation, this would:
// 1. Call the appropriate protocol's stake function
// 2. Handle the LST token receipt
// 3. Update internal accounting

// For now, we just update the allocation amount
vault.allocations[protocol_index].amount = vault.allocations[protocol_index].amount
    .checked_add(amount)
    .ok_or(VaultError::MathOverflow)?;
```

**Risk**: No actual staking occurs. TVL accounting will be incorrect.

**Recommendation**: Implement CPI to each protocol before deployment.

---

## Low/Informational Findings (5 Found)

### LOW-01: Vault SOL Account Not Initialized

**Severity**: 🟢 LOW  
**File**: `instructions/deposit.rs:153-159`

**Issue**: The `vault_sol_account` PDA is declared but never explicitly initialized.

**Fix**: Initialize in the `initialize` instruction or use `system_account` type.

---

### LOW-02: No Maximum Pending Withdrawals Limit

**Severity**: 🟢 LOW  
**File**: `state.rs:245`

**Issue**: `pending_withdrawals: u8` means max 255, but no validation in request_handler.

**Fix**: Add check:
```rust
require!(user_account.pending_withdrawals < u8::MAX, VaultError::TooManyPendingWithdrawals);
```

---

### LOW-03: Clock Timestamps Can Be Slightly Manipulated

**Severity**: 🟢 LOW  
**File**: Various

**Issue**: Validator can manipulate `Clock::get()?.unix_timestamp` by ~30 seconds.

**Recommendation**: Acceptable for this use case (fee calculations, rebalance timing).

---

### INFO-01: Unused Error Variants

**Severity**: ℹ️ INFO  
**File**: `errors.rs`

**Issue**: Some errors are defined but never used (e.g., `AccountNotInitialized`, `InvalidOracleAccount`).

**Recommendation**: Remove unused errors or add TODO comments.

---

### INFO-02: No Authority Transfer Mechanism

**Severity**: ℹ️ INFO  
**File**: `state.rs`

**Issue**: Once authority is set, it cannot be changed. No two-step transfer.

**Recommendation**: Add `set_pending_authority` and `accept_authority` for safe transfers.

---

## Security Features Verified

### 1. Access Control ✅
| Modifier | Functions Protected |
|----------|---------------------|
| `has_one = authority` | `update_config`, `pause`, `unpause`, `collect_fees`, `stake_to_protocol`, `unstake` |
| PDA Seeds | Vault, jSOL mint, user accounts properly derived |

### 2. Bounds Checking ✅
| Parameter | Min | Max |
|-----------|-----|-----|
| Management Fee | 0 bps | 100 bps (1%) |
| Performance Fee | 0 bps | 2000 bps (20%) |
| Protocol Allocation | 0 bps | 5000 bps (50%) |
| Deposit | 0.1 SOL | deposit_cap |

### 3. Arithmetic Safety ✅
All arithmetic uses `.checked_*` operations with proper error handling.

### 4. Events/Logging ✅
All critical operations emit events for off-chain monitoring.

---

## Recommendations

### Before Devnet
1. **[CRITICAL]** Fix withdrawal burn authority
2. **[HIGH]** Add duplicate protocol validation
3. **[HIGH]** Implement first-depositor protection
4. **[HIGH]** Validate fee collector address

### Before Mainnet
1. Complete LST protocol integrations (Marinade, Jito, etc.)
2. Implement oracle integration (Pyth)
3. Add reentrancy guards
4. Add authority transfer mechanism
5. Get professional audit (Sherlock/OtterSec)

---

## Test Scenarios Required

| Scenario | Status |
|----------|--------|
| Normal Deposit/Withdraw | ❌ Pending |
| First Depositor Attack | ❌ Pending |
| Duplicate Protocol Allocation | ❌ Pending |
| Fee Collection Accuracy | ❌ Pending |
| Pause/Unpause | ❌ Pending |
| Rebalance Threshold | ❌ Pending |
| Deposit Cap Enforcement | ❌ Pending |

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| Jan 20, 2026 | 0.1.0 | Initial security review |

---

## Disclaimer

This is an internal self-audit performed by Jubilee Labs. It does not constitute a professional security audit. A third-party audit from firms such as Sherlock, OtterSec, Sec3, or Neodyme is strongly recommended before mainnet deployment.

---

*"The prudent see danger and take refuge, but the simple keep going and pay the penalty."* — Proverbs 22:3
