# 🚀 jSOLi Mainnet Rollout Guide

This guide outlines the step-by-step process for deploying the jSOLi protocol to Solana Mainnet.

---

## Phase 1: Preparation (Local)

### 1. Update Configuration
In `programs/jsol-vault/src/constants.rs`, update the LST Protocol Addresses to their Mainnet values:

| Protocol | Mainnet Address |
| :--- | :--- |
| **Jito** | `J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn` |
| **Marinade** | `mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So` |
| **BlazeStake** | `bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1` |
| **Jupiter** | `jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v` |

### 2. Prepare Deployer Wallet
*   Ensure your deployer wallet has approximately **10-15 SOL**.
*   Cost Breakdown:
    *   **Program Rent**: ~7-10 SOL (for ~1MB binary)
    *   **Deploy Fees**: ~0.05 SOL
    *   **State Initialization**: ~0.05 SOL

### 3. Generate Mainnet Program Keypair (Optional)
If you want a vanity address or a fresh address for mainnet:
```bash
solana-keygen new -o target/deploy/jsol_vault-mainnet.json
```
*   Update `Anchor.toml` `[programs.mainnet]` with this new address.
*   Update `declare_id!` in `programs/jsol-vault/src/lib.rs`.

---

## Phase 2: Deployment

### 1. Build for Mainnet
```bash
anchor build
```

### 2. Deploy
```bash
anchor deploy --provider.cluster mainnet --program-keypair target/deploy/jsol_vault-mainnet.json
```
*   *Note: This may take a few minutes. If it fails, retry with `--use-rpc`.*

### 3. Initialize Vault
Run the initialization script pointing to mainnet RPC:
```bash
export ANCHOR_PROVIDER_URL="https://api.mainnet-beta.solana.com"
export ANCHOR_WALLET="~/.config/solana/id.json"
npx ts-node scripts/initialize-vault.ts
```

---

## Phase 3: Post-Deployment & Security

### 1. Transfer Authority to Squads (CRITICAL)
For security, the "Upgrade Authority" and "Vault Authority" should not stay on your laptop.
1.  Go to [Squads](https://app.squads.so) and create a Multisig.
2.  **Transfer Program Authority**:
    ```bash
    solana program set-upgrade-authority <PROGRAM_ID> --new-upgrade-authority <SQUADS_VAULT_ADDRESS>
    ```
3.  **Transfer Vault Authority**:
    (Requires a CLI admin script or using `update_config` to set `authority` field to Squads).

### 2. Verify on Explorer
1.  Go to [Solana Explorer](https://explorer.solana.com/?cluster=mainnet-beta).
2.  Search your Program ID.
3.  Upload the IDL:
    ```bash
    anchor idl init --provider.cluster mainnet --filepath target/idl/jsol_vault.json <PROGRAM_ID>
    ```

### 3. Frontend Update
*   Update `frontend/config.ts` with the new **Mainnet Program ID**.
*   Deploy frontend to [Vercel/Netlify](https://jsoli.xyz).

---

## Phase 4: Operations

### 1. Set Up Keepers
*   Use the `scripts/keeper.ts` script.
*   Deploy it to a secure server (e.g., AWS t3.micro, DigitalOcean Droplet).
*   Run with `pm2 start scripts/keeper.ts` to keep it alive.
*   Ensure the keeper wallet has ~0.5 SOL for transaction fees.

### 2. Monitor
*   Use the "FASB/History" modal to track deposits.
*   Watch the `RebalanceEvent` logs on Solana Explorer to ensure rebalancing is firing.
