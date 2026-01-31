# jSOLi - Jubilee Solana LST Index 

[![Built on Solana](https://img.shields.io/badge/Built%20on-Solana-9945FF)](https://solana.com)
[![Powered by Anchor](https://img.shields.io/badge/Powered%20by-Anchor%200.29-blue)](https://anchor-lang.com)
[![Status](https://img.shields.io/badge/Status-Live%20on%20Devnet-green)](https://github.com/Jubilee-Protocol/jSOLi)

> A passive, diversified liquid staking strategy that automatically rebalances across Solana's top LST protocols while optimizing for APY.

**Website**: https://mint.jsoli.xyz  
**App**: https://jsoli.xyz 

**Program**: `FQARiEHe31wCxwJHYwQxjqGryvXCFx4h2hJvPeQ7QgB8`  
**Status**: 🚀 **Live on Devnet** — Jan 31, 2026

---

## Overview

jSOLi aggregates user deposits across multiple Liquid Staking Token (LST) protocols on Solana, automatically rebalancing to optimize yield. Users deposit SOL and receive jSOLi shares representing their proportional ownership.

### Key Features
- Aggregate SOL across multiple LST protocols (Jito, Marinade, BlazeStake, Jupiter)
- 25% Equal Weighting for maximum decentralization and yield stability
- Automated rebalancing based on APY optimization
- Share-based accounting (jSOLi token)
- Management and performance fees
- Emergency pause mechanism
- Two-step withdrawal with unbonding period

---

## Target Allocations

| Protocol | Allocation | Token | Est. APY |
|----------|------------|-------|----------|
| Jito | 25% | jitoSOL | ~7.5% (incl. MEV) |
| Marinade | 25% | mSOL | ~6.7% |
| BlazeStake | 25% | bSOL | ~6.8% |
| Jupiter | 25% | jupSOL | ~7.0% |

**Target Blended APY**: 6.9-7.3%

---

## Fee Structure

| Fee Type | Rate | Max Allowed |
|----------|------|-------------|
| Management Fee | 0.5% annually | 1.0% |
| Performance Fee | 10% of gains | 20% |

---

## Security

- **Features**:
  - ✅ Checked arithmetic (no overflow/underflow)
  - ✅ Role-based access control
  - ✅ Emergency pause mechanism
  - ✅ Oracle staleness validation (60s max)
  - ✅ Slippage protection on swaps
  - ✅ Max 50% allocation per protocol

---

## Program Addresses

### Mainnet
| Account | Address |
|---------|---------|
| jSOLi Vault | `TBD` |
| jSOLi Mint | `TBD` |

### Devnet (Live ✅)
| Account | Address |
|---------|---------|
| jSOLi Program | [`FQARiEHe31wCxwJHYwQxjqGryvXCFx4h2hJvPeQ7QgB8`](https://explorer.solana.com/address/FQARiEHe31wCxwJHYwQxjqGryvXCFx4h2hJvPeQ7QgB8?cluster=devnet) |
| Vault PDA | [`5AvSxZhE4gxFVyoL3PpVRtrUa2hmYf9WUdsSbWxLiB7D`](https://explorer.solana.com/address/5AvSxZhE4gxFVyoL3PpVRtrUa2hmYf9WUdsSbWxLiB7D?cluster=devnet) |
| jSOLi Mint | [`AUThYzVoRi6WEcgjAHyRCjjG3ZPpyi4xNn626z6rLWRf`](https://explorer.solana.com/address/AUThYzVoRi6WEcgjAHyRCjjG3ZPpyi4xNn626z6rLWRf?cluster=devnet) |

---

## Repository Structure
```
jSOLi-vault/
├── programs/jSOLi-vault/src/
│   ├── lib.rs              # Program entry point
│   ├── constants.rs        # Configuration values
│   ├── errors.rs           # 30+ custom error types
│   ├── state.rs            # VaultState, UserAccount, WithdrawRequest
│   ├── instructions/
│   │   ├── initialize.rs   # Vault setup
│   │   ├── deposit.rs      # SOL deposits → jSOLi shares
│   │   ├── withdraw.rs     # Two-step withdrawal
│   │   ├── rebalance.rs    # Allocation adjustment
│   │   ├── admin.rs        # Config, fees, pause
│   │   └── staking.rs      # LST protocol interactions
│   └── utils/
│       ├── math.rs         # Safe arithmetic
│       ├── validation.rs   # Input validation
│       ├── oracle.rs       # Pyth price feeds
│       └── protocols.rs    # LST protocol helpers
├── tests/                  # Anchor test suite
├── scripts/                # Deployment scripts
└── deployments/            # Network-specific configs
```

---

## Quick Start

```bash
# Install dependencies
yarn install

# Build the program
anchor build

# Run tests
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

---

## How It Works

### Deposit Flow
1. User deposits SOL into the vault
2. Vault calculates shares based on current TVL
3. jSOLi tokens are minted to user
4. SOL is allocated across LST protocols

### Withdrawal Flow (Two-Step)
1. User requests withdrawal with jSOLi amount
2. Vault creates `WithdrawRequest` with ~3 day unlock
3. User completes withdrawal after unlock period
4. jSOLi is burned, SOL returned to user

### Rebalancing
- Triggered when any protocol deviates >5% from target
- Minimum 1 hour between rebalances
- Open to any caller (permissionless trigger)
- Slippage protection enforced

---

## LST Protocol Integrations

| Protocol | Program ID | Unstaking |
|----------|------------|-----------|
| Marinade | `MarBmsSg...` | Instant (0.3% fee) or delayed |
| Jito | `Jito4APy...` | Instant (0.1% fee) |
| BlazeStake | `stk9ApL5...` | ~2 days |
| Jupiter | `jupS7...` | ~3 days |

---

## Roadmap

- [x] Core program architecture
- [x] State accounts and error handling
- [x] Deposit/withdraw instructions
- [x] Rebalancing logic
- [x] Security audit
- [x] Devnet deployment
- [x] Pyth oracle integration
- [x] Complete LST CPI integrations (Skeleton Ready)
- [x] Comprehensive test suite (Initial Suite Ready)
- [ ] Mainnet launch

---

## Built By

**[Jubilee Labs](https://jubileelabs.xyz)** • Powered by **[Anchor](https://anchor-lang.com)** • Deployed on **[Solana](https://solana.com)**

## License

This project is licensed under the [MIT License](LICENSE).

---

*"Seek first the Kingdom of God!"* — Matthew 6:33
