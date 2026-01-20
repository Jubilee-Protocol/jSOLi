# jSOL Vault

A production-grade Solana Liquid Staking Token (LST) aggregator vault with automated rebalancing.

## Overview

jSOL Vault aggregates user deposits across multiple LST protocols on Solana to optimize yield. Users deposit SOL and receive jSOL shares representing their proportional ownership of the vault's total value.

### Supported Protocols
- **Jito** (jitoSOL) - Includes MEV rewards
- **Marinade** (mSOL) - Largest LST on Solana
- **BlazeStake** (bSOL) - Auto-compounding rewards
- **Lido** (stSOL) - Cross-chain staking
- **Native Staking** - Direct validator staking
- **Jupiter** (JupSOL) - Jupiter's staked SOL

## Features

- ✅ Multi-protocol LST aggregation
- ✅ Automated rebalancing based on APY
- ✅ Share-based accounting (jSOL token)
- ✅ Management & performance fees
- ✅ Emergency pause mechanism
- ✅ Two-step withdrawal with unbonding
- ✅ Oracle integration (Pyth)
- ✅ Checked arithmetic (overflow safe)

## Architecture

```
jsol-vault/
├── programs/jsol-vault/src/
│   ├── lib.rs              # Program entry point
│   ├── constants.rs        # Configuration constants
│   ├── errors.rs           # Custom error types
│   ├── state.rs            # On-chain accounts & events
│   ├── instructions/       # Instruction handlers
│   │   ├── initialize.rs   # Vault setup
│   │   ├── deposit.rs      # User deposits
│   │   ├── withdraw.rs     # Withdrawal flow
│   │   ├── rebalance.rs    # Allocation adjustment
│   │   ├── admin.rs        # Admin functions
│   │   └── staking.rs      # Protocol interactions
│   └── utils/              # Utility functions
│       ├── math.rs         # Safe math operations
│       ├── validation.rs   # Input validation
│       ├── oracle.rs       # Price feeds
│       └── protocols.rs    # LST protocol helpers
├── tests/                  # Test suite
├── scripts/                # Deployment scripts
└── deployments/            # Network-specific configs
```

## Getting Started

### Prerequisites

- Rust 1.70+
- Solana CLI 1.17+
- Anchor 0.29.0
- Node.js 18+
- Yarn

### Installation

```bash
# Install dependencies
yarn install

# Build the program
anchor build

# Run tests
anchor test
```

### Local Development

```bash
# Start local validator
solana-test-validator

# Deploy locally
anchor deploy

# Run tests against local
anchor test --skip-local-validator
```

## Configuration

### Fee Structure
| Fee Type | Default | Maximum |
|----------|---------|---------|
| Management | 0.5% (50 bps) | 1.0% (100 bps) |
| Performance | 10% (1000 bps) | 20% (2000 bps) |

### Allocation Limits
- Maximum per protocol: 50% (5000 bps)
- Total must equal: 100% (10000 bps)
- Maximum protocols: 10

### Default Allocations
| Protocol | Allocation |
|----------|------------|
| Jito | 30% |
| Marinade | 30% |
| BlazeStake | 20% |
| Lido | 10% |
| Native | 10% |

## Security

- [x] Reentrancy guards on external calls
- [x] Checked arithmetic (no overflow/underflow)
- [x] Role-based access control
- [x] Emergency pause mechanism
- [x] Oracle staleness validation
- [x] Slippage protection
- [x] Allocation concentration limits

### Audit Status
- [ ] Pending security audit

## Deployment

### Devnet
```bash
anchor deploy --provider.cluster devnet
```

### Mainnet
```bash
# Requires confirmation
anchor deploy --provider.cluster mainnet-beta
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

---

Built with ❤️ by Jubilee Protocol
