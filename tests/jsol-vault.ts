import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { JsolVault } from "../target/types/jsol_vault";

describe("jsol-vault", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.JsolVault as Program<JsolVault>;

  it("Is initialized!", async () => {
    // Add your test here.
    // Initialize with default values
    const allocations = [{ protocol: 1, targetBps: 1000 }]; // 10% to protocol 1 (Marinade)
    const managementFeeBps = 100; // 1%
    const performanceFeeBps = 1000; // 10%
    const depositCap = new anchor.BN(1000 * 1_000_000_000); // 1000 SOL

    const tx = await program.methods
      .initialize(allocations, managementFeeBps, performanceFeeBps, depositCap)
      .rpc();
    console.log("Your transaction signature", tx);
  });
});
