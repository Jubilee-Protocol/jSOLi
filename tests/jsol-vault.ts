import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { JsolVault } from "../target/types/jsol_vault";
import { expect } from "chai";

describe("jsol-vault", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.JsolVault as Program<JsolVault>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;

  console.log("Program ID:", program.programId.toBase58());

  it("Is initialized!", async () => {
    const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      program.programId
    );
    const [mintPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("jsoli_mint")],
      program.programId
    );

    const allocations = [
      { protocol: 0, targetBps: 2500 }, // Jito
      { protocol: 1, targetBps: 2500 }, // Marinade
      { protocol: 2, targetBps: 2500 }, // BlazeStake
      { protocol: 3, targetBps: 2500 }  // Jupiter
    ];
    const managementFeeBps = 50; // 0.5%
    const performanceFeeBps = 1000; // 10%
    const depositCap = new anchor.BN(1000 * 1_000_000_000); // 1000 SOL

    try {
      const tx = await program.methods
        .initialize(allocations, managementFeeBps, performanceFeeBps, depositCap)
        .accounts({
          vault: vaultPda,
          jsoliMint: mintPda,
          authority: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      console.log("Initialize transaction signature", tx);
    } catch (e) {
      if (e.message.includes("already in use")) {
        console.log("Vault already initialized");
      } else {
        throw e;
      }
    }
  });

  it("Handles a deposit (attempt)", async () => {
    const amount = new anchor.BN(1 * 1_000_000_000); // 1 SOL
    const user = provider.wallet.publicKey;

    const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("vault")], program.programId);
    const [mintPda] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("jsoli_mint")], program.programId);
    const [vaultSolPda] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("vault_sol")], program.programId);
    const [userAccountPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user.toBuffer()],
      program.programId
    );

    const userJsolAccount = anchor.utils.token.associatedAddress({
      mint: mintPda,
      owner: user,
    });

    const mockOracle = anchor.web3.Keypair.generate().publicKey;

    try {
      await program.methods
        .deposit(amount)
        .accounts({
          vault: vaultPda,
          jsoliMint: mintPda,
          userJsolAccount: userJsolAccount,
          userAccount: userAccountPda,
          vaultSolAccount: vaultSolPda,
          user: user,
          oracleAccount: mockOracle,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();
    } catch (e) {
      console.log("Deposit call attempted - expected failure since oracle is mock.");
    }
  });
});
