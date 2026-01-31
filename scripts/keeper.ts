import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { JsolVault } from "../target/types/jsol_vault";
import { PublicKey } from "@solana/web3.js";

// Configuration
const KEEPER_KEY_PATH = process.env.KEEPER_KEY_PATH || "~/.config/solana/id.json";
const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey("FQARiEHe31wCxwJHYwQxjqGryvXCFx4h2hJvPeQ7QgB8");

async function main() {
    // 1. Setup Provider
    process.env.ANCHOR_PROVIDER_URL = RPC_URL;
    process.env.ANCHOR_WALLET = KEEPER_KEY_PATH;
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = new Program<JsolVault>(
        require("../target/idl/jsol_vault.json") as any,
        PROGRAM_ID,
        provider
    );

    console.log("🤖 Keeper started...");
    console.log("Wallet:", provider.wallet.publicKey.toString());

    // 2. Fetch Vault State
    const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault")],
        program.programId
    );

    try {
        const vaultState = await program.account.vaultState.fetch(vaultPda);
        console.log("Vault TVL:", vaultState.totalTvl.toString());

        // 3. Check for Rebalance Need
        // In a real script, you'd calculate the current deviation from target allocations
        // For now, we'll just check if the last rebalance was > 1 hour ago
        const lastRebalance = vaultState.lastRebalance.toNumber();
        const now = Math.floor(Date.now() / 1000);
        const REBALANCE_COOLDOWN = 3600; // 1 hour

        // 1. Check Cooldown
        if (now - lastRebalance < REBALANCE_COOLDOWN) {
            console.log("Rebalance cooldown active. Next check in:", REBALANCE_COOLDOWN - (now - lastRebalance), "s");
            return;
        }

        console.log("Cooldown passed. Checking allocation deviations...");

        // 2. Fetch Allocations and Calculate Deviation
        const allocations = vaultState.allocations; // Assumes fetched via fetch()
        const config = vaultState.config;
        let maxDeviation = 0;

        for (const alloc of allocations) {
            const currentBps = alloc.currentBps;
            const targetBps = alloc.targetBps;
            let deviation = 0;

            if (currentBps > targetBps) {
                deviation = currentBps - targetBps;
            } else {
                deviation = targetBps - currentBps;
            }

            if (deviation > maxDeviation) {
                maxDeviation = deviation;
            }
        }

        console.log(`Max deviation: ${maxDeviation} bps (Threshold: ${config.rebalanceThresholdBps} bps)`);

        // 3. Trigger Rebalance if Needed
        if (maxDeviation >= config.rebalanceThresholdBps) {
            console.log("Threshold exceeded. Triggering rebalance...");

            try {
                const tx = await program.methods
                    .rebalance()
                    .accounts({
                        vault: vaultPda,
                        rebalancer: provider.wallet.publicKey,
                    } as any)
                    .rpc();

                console.log("✅ Rebalance successful:", tx);
            } catch (e) {
                console.error("Rebalance transaction failed:", e);
            }
        } else {
            console.log("Rebalance not needed yet.");
        }

    } catch (e) {
        console.error("Error fetching vault:", e);
    }
}

// Run loop every 10 minutes
// setInterval(main, 10 * 60 * 1000); 
main();
