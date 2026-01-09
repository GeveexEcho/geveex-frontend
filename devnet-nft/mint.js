import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import { createCreateMetadataAccountV3Instruction } from "@metaplex-foundation/mpl-token-metadata";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

const secret = process.env.WALLET_SECRET;
if (!secret) throw new Error("Missing WALLET_SECRET");

let payer;
try {
  payer = Keypair.fromSecretKey(bs58.decode(secret));
} catch {
  payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret)));
}

const NFT_NAME = "Early Bird";
const NFT_SYMBOL = "EARLYBIRD";
const NFT_URI = "https://raw.githubusercontent.com/GeveexEcho/geveex-devnet-test/refs/heads/main/assets/metadata.json";

const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

const connection = new Connection("https://api.devnet.solana.com", "confirmed");

async function mintNFT() {
  console.log("Starting NFT mint...");

  const mint = await createMint(
    connection,
    payer,
    payer.publicKey,
    payer.publicKey,
    0
  );

  console.log("Mint Account:", mint.toBase58());

  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );

  await mintTo(
    connection,
    payer,
    mint,
    ata.address,
    payer.publicKey,
    1
  );

  const [metadataPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  );

  const metadataInstruction = createCreateMetadataAccountV3Instruction(
    {
      metadata: metadataPDA,
      mint: mint,
      mintAuthority: payer.publicKey,
      payer: payer.publicKey,
      updateAuthority: payer.publicKey,
      systemProgram: PublicKey.default,
    },
    {
      createMetadataAccountArgsV3: {
        data: {
          name: NFT_NAME,
          symbol: NFT_SYMBOL,
          uri: NFT_URI,
          sellerFeeBasisPoints: 0,
          creators: null,
          collection: null,
          uses: null,
        },
        isMutable: true,
        collectionDetails: null,
      },
    }
  );

  const transaction = new Transaction().add(metadataInstruction);
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  transaction.feePayer = payer.publicKey;

  const signature = await connection.sendTransaction(transaction, [payer]);
  await connection.confirmTransaction(signature, "confirmed");

  console.log("NFT Minted successfully!");
  console.log("Mint:", mint.toBase58());
  console.log("Metadata PDA:", metadataPDA.toBase58());
  console.log("Explorer:", `https://explorer.solana.com/address/${mint.toBase58()}?cluster=devnet`);
}

mintNFT().catch(err => {
  console.error("Mint failed:", err);
  if (err.logs) console.error("Logs:", err.logs);
});
