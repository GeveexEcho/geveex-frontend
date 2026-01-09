import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import { createCreateMetadataAccountV3Instruction } from "@metaplex-foundation/mpl-token-metadata";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { pubkey: userPubkeyStr } = req.body || {};
  if (!userPubkeyStr) {
    return res.status(400).json({ error: 'Missing pubkey' });
  }

  const secret = process.env.WALLET_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  let payer;
  try {
    payer = Keypair.fromSecretKey(bs58.decode(secret));
  } catch {
    try {
      payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret)));
    } catch (e) {
      return res.status(500).json({ error: 'Invalid wallet secret' });
    }
  }

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  try {
    const mint = await createMint(
      connection,
      payer,
      payer.publicKey,
      payer.publicKey,
      0
    );

    const userPubkey = new PublicKey(userPubkeyStr);
    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      userPubkey
    );

    await mintTo(
      connection,
      payer,
      mint,
      ata.address,
      payer.publicKey,
      1
    );

    const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      METADATA_PROGRAM_ID
    );

    const tx = new Transaction().add(
      createCreateMetadataAccountV3Instruction(
        {
          metadata: metadataPDA,
          mint,
          mintAuthority: payer.publicKey,
          payer: payer.publicKey,
          updateAuthority: payer.publicKey,
          systemProgram: PublicKey.default,
        },
        {
          createMetadataAccountArgsV3: {
            data: {
              name: "Early Bird",
              symbol: "EARLYBIRD",
              uri: "https://raw.githubusercontent.com/GeveexEcho/geveex-devnet-test/refs/heads/main/assets/metadata.json",
              sellerFeeBasisPoints: 0,
              creators: null,
              collection: null,
              uses: null,
            },
            isMutable: true,
            collectionDetails: null,
          },
        }
      )
    );

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = payer.publicKey;

    const signature = await connection.sendTransaction(tx, [payer]);
    
    await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
    }, "confirmed");

    return res.status(200).json({ 
      success: true, 
      mint: mint.toBase58() 
    });

  } catch (err) {
    return res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
          }
      
