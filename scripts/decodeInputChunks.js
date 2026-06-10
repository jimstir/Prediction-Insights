import { createPublicClient, http } from 'viem';

const RPC_MAINNET = 'https://api.infra.mainnet.somnia.network/';
const TX_HASH = '0xb7c9585b0744859c8e35d39f219e436bc335ea0a97bb8cae79e0134eed2311d0';

async function check() {
  const publicClient = createPublicClient({
    transport: http(RPC_MAINNET)
  });

  try {
    const tx = await publicClient.getTransaction({ hash: TX_HASH });
    const input = tx.input;
    console.log(`Transaction Input length: ${input.length} hex chars`);
    
    // Slice off selector (first 10 chars "0x5dae1f1c")
    const calldata = input.slice(10);
    
    // Split into 32-byte (64 hex characters) chunks
    const chunks = [];
    for (let i = 0; i < calldata.length; i += 64) {
      chunks.push(calldata.slice(i, i + 64));
    }
    
    console.log('\nDecoded calldata chunks:');
    chunks.forEach((chunk, index) => {
      // Try to decode chunk as ASCII text to see if there's any human readable string
      let ascii = '';
      for (let j = 0; j < chunk.length; j += 2) {
        const charCode = parseInt(chunk.slice(j, j + 2), 16);
        if (charCode >= 32 && charCode <= 126) {
          ascii += String.fromCharCode(charCode);
        } else {
          ascii += '.';
        }
      }
      
      console.log(`Chunk #${index.toString().padStart(2, '0')} (offset ${index * 32}): ${chunk} | ASCII: ${ascii}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

check();
