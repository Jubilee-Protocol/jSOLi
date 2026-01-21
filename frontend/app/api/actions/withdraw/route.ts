import {
    ActionGetResponse,
    ActionPostRequest,
    ActionPostResponse,
    ACTIONS_CORS_HEADERS,
    createPostResponse,
} from '@solana/actions';
import {
    Connection,
    PublicKey,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import idlJson from '../../../idl/jsol_vault.json';

// Program ID from IDL
const PROGRAM_ID = new PublicKey((idlJson as any).address);
const VAULT_SEED = 'vault';
const USER_ACCOUNT_SEED = 'user';
const WITHDRAW_REQUEST_SEED = 'withdraw';

// RPC endpoint
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com';

// GET handler - returns Action metadata
export async function GET(request: Request) {
    const actionMetadata: ActionGetResponse = {
        type: 'action',
        icon: 'https://mint.jsoli.xyz/og-image.png',
        title: 'Withdraw from jSOLi',
        description: 'Burn your jSOLi tokens and receive SOL back.',
        label: 'Withdraw jSOLi',
        links: {
            actions: [
                {
                    type: 'transaction',
                    label: 'Withdraw All',
                    href: `/api/actions/withdraw?shares=max`,
                },
                {
                    type: 'transaction',
                    label: 'Withdraw jSOLi',
                    href: `/api/actions/withdraw?shares={shares}`,
                    parameters: [
                        {
                            name: 'shares',
                            label: 'Amount in jSOLi',
                            required: true,
                            type: 'number',
                        },
                    ],
                },
            ],
        },
    };

    return Response.json(actionMetadata, { headers: ACTIONS_CORS_HEADERS });
}

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
    return new Response(null, { headers: ACTIONS_CORS_HEADERS });
}

// POST handler - creates and returns unsigned transaction
export async function POST(request: Request) {
    try {
        const url = new URL(request.url);
        const sharesParam = url.searchParams.get('shares');

        if (!sharesParam) {
            return Response.json(
                { error: { message: 'Shares parameter is required' } },
                { status: 400, headers: ACTIONS_CORS_HEADERS }
            );
        }

        const body: ActionPostRequest = await request.json();
        const userPubkey = new PublicKey(body.account);

        // Create connection
        const connection = new Connection(RPC_URL, 'confirmed');

        // Derive PDAs
        const [vaultPda] = PublicKey.findProgramAddressSync(
            [Buffer.from(VAULT_SEED)],
            PROGRAM_ID
        );
        const [userAccountPda] = PublicKey.findProgramAddressSync(
            [Buffer.from(USER_ACCOUNT_SEED), userPubkey.toBuffer()],
            PROGRAM_ID
        );
        const [withdrawRequestPda] = PublicKey.findProgramAddressSync(
            [Buffer.from(WITHDRAW_REQUEST_SEED), userPubkey.toBuffer()],
            PROGRAM_ID
        );

        // Handle 'max' for full withdrawal - for now just use a large value
        // In production, we'd query the user's balance first
        let sharesLamports: BN;
        if (sharesParam.toLowerCase() === 'max') {
            // Query user account to get actual balance
            // For now, just set a placeholder - in real impl, fetch from chain
            sharesLamports = new BN(LAMPORTS_PER_SOL * 1000000); // Max possible
        } else {
            const shares = parseFloat(sharesParam);
            if (isNaN(shares) || shares <= 0) {
                return Response.json(
                    { error: { message: 'Invalid shares amount. Must be a positive number.' } },
                    { status: 400, headers: ACTIONS_CORS_HEADERS }
                );
            }
            sharesLamports = new BN(Math.floor(shares * LAMPORTS_PER_SOL));
        }

        // Build request_withdraw instruction
        // Anchor instruction discriminator for 'request_withdraw' + shares as u64
        const requestWithdrawDiscriminator = Buffer.from([177, 175, 45, 228, 127, 95, 45, 190]); // request_withdraw discriminator
        const data = Buffer.concat([
            requestWithdrawDiscriminator,
            sharesLamports.toArrayLike(Buffer, 'le', 8),
        ]);

        const requestWithdrawInstruction = {
            programId: PROGRAM_ID,
            keys: [
                { pubkey: vaultPda, isSigner: false, isWritable: true },
                { pubkey: userAccountPda, isSigner: false, isWritable: true },
                { pubkey: withdrawRequestPda, isSigner: false, isWritable: true },
                { pubkey: userPubkey, isSigner: true, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            data,
        };

        const transaction = new Transaction();
        transaction.add(requestWithdrawInstruction);
        transaction.feePayer = userPubkey;

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.lastValidBlockHeight = lastValidBlockHeight;

        const sharesDisplay = sharesParam.toLowerCase() === 'max' ? 'all' : sharesParam;
        const response: ActionPostResponse = await createPostResponse({
            fields: {
                type: 'transaction',
                transaction,
                message: `Withdrawing ${sharesDisplay} jSOLi tokens`,
            },
        });

        return Response.json(response, { headers: ACTIONS_CORS_HEADERS });
    } catch (error: any) {
        console.error('Withdraw action error:', error);
        return Response.json(
            { error: { message: error.message || 'Failed to create withdraw transaction' } },
            { status: 500, headers: ACTIONS_CORS_HEADERS }
        );
    }
}
