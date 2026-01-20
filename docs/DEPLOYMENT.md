# jSOL Deployment Guide

This guide covers deploying jSOL Vault from local development through testnet to mainnet.

---

## Prerequisites

### Installed Tools
```bash
# Verify installations
rustc --version        # 1.79.0+
solana --version       # 1.18.26+
anchor --version       # 0.29.0
node --version         # 18.0.0+
yarn --version         # 1.22+
```

### Solana Keypairs
```bash
# Create development keypair (if not exists)
solana-keygen new --outfile ~/.config/solana/id.json

# Create separate deployer keypair for mainnet
solana-keygen new --outfile ~/.config/solana/deployer.json --no-bip39-passphrase
```

---

## Phase 1: Local Development

### 1.1 Start Local Validator
```bash
# Terminal 1: Start validator with cloned accounts
solana-test-validator \
  --clone J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn \
  --clone mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So \
  --clone bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1 \
  --url devnet \
  --reset
```

### 1.2 Configure for Localnet
```bash
solana config set --url localhost
```

### 1.3 Build and Deploy
```bash
anchor build
anchor deploy
```

### 1.4 Run Tests
```bash
anchor test
```

### 1.5 Initialize Vault (Local)
```bash
# Use the scripts/initialize-vault.ts when ready
npx ts-node scripts/initialize-vault.ts --network localnet
```

---

## Phase 2: Devnet Deployment

### 2.1 Configure for Devnet
```bash
solana config set --url devnet
solana airdrop 5  # Get test SOL
```

### 2.2 Update Anchor.toml
```toml
[programs.devnet]
jsol_vault = "YOUR_PROGRAM_ID"

[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"
```

### 2.3 Deploy to Devnet
```bash
anchor build
anchor deploy --provider.cluster devnet
```

### 2.4 Verify Deployment
```bash
# Check program account
solana program show <PROGRAM_ID>

# View on Solscan
open "https://solscan.io/account/<PROGRAM_ID>?cluster=devnet"
```

### 2.5 Initialize Vault on Devnet
```bash
npx ts-node scripts/initialize-vault.ts --network devnet \
  --authority <YOUR_AUTHORITY_PUBKEY> \
  --deposit-cap 1000000000000  # 1000 SOL cap for testing
```

### 2.6 Testing Checklist
- [ ] Deposit 0.5 SOL, verify jSOL minted
- [ ] Request withdrawal, verify request created
- [ ] Wait for unlock, complete withdrawal
- [ ] Test rebalance trigger
- [ ] Test admin functions (pause, config update)
- [ ] Test with multiple users

---

## Phase 3: Public Beta (Devnet)

### 3.1 Beta Program Setup
1. Create Discord/Telegram for beta testers
2. Document known limitations
3. Set up monitoring (see below)
4. Limit deposit cap to 10 SOL per user

### 3.2 Monitoring Setup
```bash
# Create monitoring script
touch scripts/monitor.ts
```

Monitor these metrics:
- Total TVL
- Number of depositors
- Pending withdrawals
- Rebalance events
- Error rates

### 3.3 Bug Bounty
- Set aside 5-10 SOL for bug bounty rewards
- Critical bugs: 5 SOL
- Medium bugs: 1 SOL
- Low/informational: 0.1 SOL

---

## Phase 4: Security Audit

### 4.1 Audit Preparation
1. **Freeze code** - No changes after audit begins
2. **Documentation** - All functions documented
3. **Test coverage** - Aim for 90%+
4. **Known issues** - Document any accepted risks

### 4.2 Audit Providers (Solana Specialists)
| Provider | Est. Cost | Timeline |
|----------|-----------|----------|
| Sherlock | $25-50K | 2-4 weeks |
| OtterSec | $30-60K | 3-4 weeks |
| Neodyme | $20-40K | 2-3 weeks |
| Sec3 | $15-30K | 2-3 weeks |
| Halborn | $25-50K | 3-4 weeks |

### 4.3 Audit Scope
- `programs/jsol-vault/src/` - All Rust code
- Focus areas:
  - Share price manipulation
  - Reentrancy on CPI calls
  - Oracle manipulation
  - Access control bypass
  - Arithmetic overflow

---

## Phase 5: Mainnet Deployment

### 5.1 Pre-Deployment Checklist
- [ ] Audit completed with no critical/high findings
- [ ] All findings remediated
- [ ] 7+ days of devnet stability
- [ ] Multisig wallet configured (3 of 5)
- [ ] Emergency procedures documented
- [ ] Monitoring infrastructure ready

### 5.2 Configure Multisig Authority
```bash
# Example using Squads
# 1. Create Squads multisig at https://squads.so
# 2. Add 5 signers
# 3. Set threshold to 3
# 4. Use multisig as vault authority
```

### 5.3 Deploy to Mainnet
```bash
# Switch to mainnet
solana config set --url mainnet-beta

# Check deployer balance (need ~3 SOL)
solana balance ~/.config/solana/deployer.json

# Deploy with confirmation
anchor deploy --provider.cluster mainnet-beta
```

### 5.4 Initialize with Conservative Settings
```bash
npx ts-node scripts/initialize-vault.ts --network mainnet \
  --authority <MULTISIG_ADDRESS> \
  --deposit-cap 100000000000000  # 100K SOL initial cap \
  --management-fee 50 \
  --performance-fee 1000
```

### 5.5 Post-Deployment
1. **Verify on Solscan** - Confirm IDL upload
2. **Test with 0.1 SOL** - Small deposit before announcement
3. **Update README** - Add mainnet addresses
4. **Announce launch** - Twitter, Discord, etc.

---

## Phase 6: Post-Launch Operations

### 6.1 Monitoring Dashboard
Set up Grafana/Datadog with:
- TVL over time
- Share price changes
- Rebalance frequency
- User activity
- Error alerts

### 6.2 Gradual Deposit Cap Increase
| Week | Deposit Cap |
|------|-------------|
| 1 | 100K SOL |
| 2 | 500K SOL |
| 4 | 2M SOL |
| 8 | Unlimited |

### 6.3 Emergency Procedures
1. **Pause immediately** if exploit detected
2. **Communicate** via all channels
3. **Analyze** root cause
4. **Fix and audit** the fix
5. **Unpause** with new cap

---

## Deployment Costs Estimate

| Item | Cost (SOL) |
|------|------------|
| Program deployment | ~3 SOL |
| PDA account creation | ~0.01 SOL |
| Test transactions | ~0.1 SOL |
| Buffer for operations | ~2 SOL |
| **Total** | **~5 SOL** |

---

## Quick Reference Commands

```bash
# Build
anchor build

# Test locally
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet
anchor deploy --provider.cluster mainnet-beta

# View logs
solana logs <PROGRAM_ID>

# Upgrade program (if upgradeable)
anchor upgrade target/deploy/jsol_vault.so \
  --program-id <PROGRAM_ID> \
  --provider.cluster mainnet-beta
```

---

## Troubleshooting

### "Insufficient funds"
```bash
solana airdrop 2  # Devnet only
# For mainnet, fund from exchange
```

### "Account already in use"
Program already deployed. Use `anchor upgrade` instead.

### "Transaction too large"
Split initialization into multiple transactions.

### Build fails with "edition2024"
Known Solana ecosystem issue. Wait for platform-tools update or use cargo vendor workaround.
