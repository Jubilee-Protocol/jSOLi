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
import { Program, AnchorProvider, BN, Wallet } from '@coral-xyz/anchor';
import idlJson from '../../../idl/jsol_vault.json';

// Program ID from IDL
const PROGRAM_ID = new PublicKey((idlJson as any).address);
const VAULT_SEED = 'vault';
const JSOLI_MINT_SEED = 'jsoli_mint';
const USER_ACCOUNT_SEED = 'user';

// RPC endpoint (use environment variable in production)
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com';

// GET handler - returns Action metadata
export async function GET(request: Request) {
    const actionMetadata: ActionGetResponse = {
        type: 'action',
        icon: 'https://mint.jsoli.xyz/og-image.png',
        title: 'Deposit SOL to jSOLi',
        description: 'Stake your SOL and receive jSOLi tokens with ~7% APY through diversified LST yield.',
        label: 'Deposit SOL',
        links: {
            actions: [
                {
                    type: 'transaction',
                    label: 'Deposit 1 SOL',
                    href: `/api/actions/deposit?amount=1`,
                },
                {
                    type: 'transaction',
                    label: 'Deposit 5 SOL',
                    href: `/api/actions/deposit?amount=5`,
                },
                {
                    type: 'transaction',
                    label: 'Deposit 10 SOL',
                    href: `/api/actions/deposit?amount=10`,
                },
                {
                    type: 'transaction',
                    label: 'Deposit SOL',
                    href: `/api/actions/deposit?amount={amount}`,
                    parameters: [
                        {
                            name: 'amount',
                            label: 'Amount in SOL',
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
        const amountParam = url.searchParams.get('amount');

        if (!amountParam) {
            return Response.json(
                { error: { message: 'Amount parameter is required' } },
                { status: 400, headers: ACTIONS_CORS_HEADERS }
            );
        }

        const amount = parseFloat(amountParam);
        if (isNaN(amount) || amount <= 0) {
            return Response.json(
                { error: { message: 'Invalid amount. Must be a positive number.' } },
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
        const [jsoliMintPda] = PublicKey.findProgramAddressSync(
            [Buffer.from(JSOLI_MINT_SEED)],
            PROGRAM_ID
        );
        const [userAccountPda] = PublicKey.findProgramAddressSync(
            [Buffer.from(USER_ACCOUNT_SEED), userPubkey.toBuffer()],
            PROGRAM_ID
        );

        // Get user's jSOLi token account (ATA)
        const { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = await import('@solana/spl-token');
        const userJsoliAccount = await getAssociatedTokenAddress(
            jsoliMintPda,
            userPubkey
        );

        // Build deposit instruction data
        // Anchor instruction discriminator for 'deposit' + amount as u64
        const amountLamports = new BN(Math.floor(amount * LAMPORTS_PER_SOL));

        // Create the transaction with deposit instruction
        // For Anchor programs, we need to manually construct the instruction
        const depositDiscriminator = Buffer.from([242, 35, 198, 137, 82, 225, 242, 182]); // deposit discriminator
        const data = Buffer.concat([
            depositDiscriminator,
            amountLamports.toArrayLike(Buffer, 'le', 8),
        ]);

        const depositInstruction = {
            programId: PROGRAM_ID,
            keys: [
                { pubkey: vaultPda, isSigner: false, isWritable: true },
                { pubkey: userPubkey, isSigner: true, isWritable: true },
                { pubkey: userAccountPda, isSigner: false, isWritable: true },
                { pubkey: jsoliMintPda, isSigner: false, isWritable: true },
                { pubkey: userJsoliAccount, isSigner: false, isWritable: true },
                { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            data,
        };

        const transaction = new Transaction();
        transaction.add(depositInstruction);
        transaction.feePayer = userPubkey;

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.lastValidBlockHeight = lastValidBlockHeight;

        const response: ActionPostResponse = await createPostResponse({
            fields: {
                type: 'transaction',
                transaction,
                message: `Depositing ${amount} SOL to receive jSOLi tokens`,
            },
        });

        return Response.json(response, { headers: ACTIONS_CORS_HEADERS });
    } catch (error: any) {
        console.error('Deposit action error:', error);
        return Response.json(
            { error: { message: error.message || 'Failed to create deposit transaction' } },
            { status: 500, headers: ACTIONS_CORS_HEADERS }
        );
    }
}
