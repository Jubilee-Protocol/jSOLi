import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { JsolVault } from "../target/types/jsol_vault";
import { PublicKey } from "@solana/web3.js";

// Configuration
const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey("FQARiEHe31wCxwJHYwQxjqGryvXCFx4h2hJvPeQ7QgB8");

async function main() {
    // Setup Provider
    process.env.ANCHOR_PROVIDER_URL = RPC_URL;
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = new Program<JsolVault>(
        require("../target/idl/jsol_vault.json") as any,
        PROGRAM_ID, // Explicit Program ID
        provider
    );

    console.log("🚀 Initializing Vault on Devnet...");
    console.log("Wallet:", provider.wallet.publicKey.toString());
    console.log("Program ID:", program.programId.toString());

    // PDA Derivation
    const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault")],
        program.programId
    );
    const [jsoliMintPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("jsoli_mint")],
        program.programId
    );

    // Initial Allocations (25% each)
    const allocations = [
        { protocol: 0, targetBps: 2500 }, // Jito
        { protocol: 1, targetBps: 2500 }, // Marinade
        { protocol: 2, targetBps: 2500 }, // BlazeStake
        { protocol: 3, targetBps: 2500 }, // Jupiter
    ];

    try {
        const tx = await program.methods
            .initialize(
                allocations,
                50,  // Management Fee (0.5%)
                1000, // Performance Fee (10%)
                new anchor.BN(0) // No Deposit Cap
            )
            .accounts({
                vault: vaultPda,
                jsoliMint: jsoliMintPda,
                authority: provider.wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
                tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            } as any)
            .rpc();

        console.log("✅ Initialization successful!");
        console.log("Tx Signature:", tx);
        console.log("Vault PDA:", vaultPda.toString());
    } catch (e: any) {
        console.error("Initialization failed:", e);
        if (e.message.includes("already in use")) {
            console.log("⚠️ Vault already initialized (this is fine).");
        }
    }
}

main();
