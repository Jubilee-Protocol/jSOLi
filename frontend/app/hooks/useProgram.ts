'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import { useMemo, useCallback, useState } from 'react';
import { VAULT_SEED, JSOLI_MINT_SEED, USER_ACCOUNT_SEED } from '../../config';

// Import IDL - Anchor 0.30+ format with address/metadata
import idlJson from '../idl/jsol_vault.json';

// Cast IDL and extract program ID from IDL address field
const idl = idlJson as unknown as Idl;
const PROGRAM_ID = new PublicKey((idlJson as any).address);

// Define account types based on IDL
interface VaultState {
    totalTvl: BN;
    totalShares: BN;
    bump: number;
    // Add other fields as needed
}

interface UserAccount {
    shares: BN;
    owner: PublicKey;
    // Add other fields as needed
}

export function useProgram() {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Create Anchor provider
    const provider = useMemo(() => {
        if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
            console.log('[useProgram] No wallet or missing methods:', {
                publicKey: wallet.publicKey?.toString(),
                hasSignTx: !!wallet.signTransaction,
                hasSignAllTx: !!wallet.signAllTransactions
            });
            return null;
        }
        console.log('[useProgram] Creating provider for wallet:', wallet.publicKey.toString());
        return new AnchorProvider(
            connection,
            wallet as any,
            { commitment: 'confirmed' }
        );
    }, [connection, wallet]);

    // Create program instance
    // Anchor 0.30+ format: Program(idl, provider) - program ID comes from idl.address
    const program = useMemo(() => {
        if (!provider) {
            console.log('[useProgram] No provider, cannot create program');
            return null;
        }
        try {
            // Anchor 0.30+ reads program ID from IDL's "address" field
            console.log('[useProgram] Creating program from IDL with address:', (idl as any).address);
            const prog = new Program(idl as any, provider);
            console.log('[useProgram] Program created successfully, programId:', prog.programId.toString());
            return prog;
        } catch (e) {
            console.error('[useProgram] Failed to create program:', e);
            return null;
        }
    }, [provider]);

    // Derive PDAs
    const pdas = useMemo(() => {
        const [vaultPda] = PublicKey.findProgramAddressSync(
            [Buffer.from(VAULT_SEED)],
            PROGRAM_ID
        );
        const [jsoliMintPda] = PublicKey.findProgramAddressSync(
            [Buffer.from(JSOLI_MINT_SEED)],
            PROGRAM_ID
        );
        return { vaultPda, jsoliMintPda };
    }, []);

    // Get user account PDA
    const getUserAccountPda = useCallback((userPubkey: PublicKey) => {
        const [userAccountPda] = PublicKey.findProgramAddressSync(
            [Buffer.from(USER_ACCOUNT_SEED), userPubkey.toBuffer()],
            PROGRAM_ID
        );
        return userAccountPda;
    }, []);

    // Deposit SOL
    const deposit = useCallback(async (amountSol: number) => {
        if (!program || !wallet.publicKey) {
            throw new Error('Wallet not connected');
        }

        setLoading(true);
        setError(null);

        try {
            const amountLamports = new BN(Math.floor(amountSol * LAMPORTS_PER_SOL));
            const userAccountPda = getUserAccountPda(wallet.publicKey);

            // Get user's jSOLi token account (ATA)
            const { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = await import('@solana/spl-token');
            const userJsoliAccount = await getAssociatedTokenAddress(
                pdas.jsoliMintPda,
                wallet.publicKey
            );

            const tx = await program.methods
                .deposit(amountLamports)
                .accounts({
                    vault: pdas.vaultPda,
                    user: wallet.publicKey,
                    userAccount: userAccountPda,
                    jsolMint: pdas.jsoliMintPda,
                    userJsolAccount: userJsoliAccount,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            console.log('Deposit successful:', tx);
            return tx;
        } catch (e: any) {
            console.error('Deposit failed:', e);
            setError(e.message || 'Deposit failed');
            throw e;
        } finally {
            setLoading(false);
        }
    }, [program, wallet.publicKey, pdas, getUserAccountPda]);

    // Withdraw jSOLi (request_withdraw in the program)
    const withdraw = useCallback(async (sharesToBurn: number) => {
        if (!program || !wallet.publicKey) {
            throw new Error('Wallet not connected');
        }

        setLoading(true);
        setError(null);

        try {
            const sharesLamports = new BN(Math.floor(sharesToBurn * LAMPORTS_PER_SOL));
            const userAccountPda = getUserAccountPda(wallet.publicKey);

            // First, fetch the user account to get the current pending_withdrawals count
            // This is needed to derive the correct withdraw_request PDA
            const userAccount = await (program.account as any).userAccount.fetch(userAccountPda);
            const requestIndex = userAccount.pendingWithdrawals as number;

            // Derive withdraw request PDA with request index
            // Seeds: [b"withdraw", user_pubkey, pending_withdrawals.to_le_bytes(1)]
            const requestIndexBuffer = Buffer.alloc(1);
            requestIndexBuffer.writeUInt8(requestIndex);

            const [withdrawRequestPda] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('withdraw'),
                    wallet.publicKey.toBuffer(),
                    requestIndexBuffer
                ],
                PROGRAM_ID
            );

            console.log('[Withdraw] Request index:', requestIndex);
            console.log('[Withdraw] PDA:', withdrawRequestPda.toString());

            // Use requestWithdraw (camelCase) - Anchor converts snake_case to camelCase
            const tx = await program.methods
                .requestWithdraw(sharesLamports)
                .accounts({
                    vault: pdas.vaultPda,
                    userAccount: userAccountPda,
                    withdrawRequest: withdrawRequestPda,
                    user: wallet.publicKey,
                    systemProgram: SystemProgram.programId,
                } as any)
                .rpc();

            console.log('Withdraw request successful:', tx);
            return tx;
        } catch (e: any) {
            console.error('Withdraw failed:', e);
            setError(e.message || 'Withdraw failed');
            throw e;
        } finally {
            setLoading(false);
        }
    }, [program, wallet.publicKey, pdas, getUserAccountPda]);

    // Fetch vault state
    const getVaultState = useCallback(async (): Promise<VaultState | null> => {
        if (!program) return null;
        try {
            // Use dynamic access for Anchor 0.30+ since account types aren't strongly typed
            const vault = await (program.account as any).vaultState.fetch(pdas.vaultPda);
            return vault as unknown as VaultState;
        } catch (e) {
            console.error('Failed to fetch vault state:', e);
            return null;
        }
    }, [program, pdas.vaultPda]);

    // Fetch user account
    const getUserAccount = useCallback(async (): Promise<UserAccount | null> => {
        if (!program || !wallet.publicKey) return null;
        try {
            const userAccountPda = getUserAccountPda(wallet.publicKey);
            // Use dynamic access for Anchor 0.30+ since account types aren't strongly typed
            const userAccount = await (program.account as any).userAccount.fetch(userAccountPda);
            return userAccount as unknown as UserAccount;
        } catch (e) {
            // User account may not exist yet
            return null;
        }
    }, [program, wallet.publicKey, getUserAccountPda]);

    return {
        program,
        provider,
        pdas,
        deposit,
        withdraw,
        getVaultState,
        getUserAccount,
        loading,
        error,
        connected: !!wallet.publicKey && !!program,
    };
}
