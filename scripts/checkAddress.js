import { createPublicClient, http } from 'viem';

const ADDR_1 = '0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776';
const ADDR_2 = '0x5E5205CF39E766118C01636bED000A54D93163E6';

const RPC_MAINNET = 'https://api.infra.mainnet.somnia.network/';
const RPC_TESTNET = 'https://dream-rpc.somnia.network/';

async function checkAddress(rpc, name) {
  const client = createPublicClient({ transport: http(rpc) });
  console.log(`\n--- Checking ${name} ---`);
  
  for (const addr of [ADDR_1, ADDR_2]) {
    try {
      const code = await client.getBytecode({ address: addr });
      console.log(`Address ${addr}: code length = ${code ? code.length : 0}`);
    } catch (err) {
      console.log(`Address ${addr}: error: ${err.message}`);
    }
  }
}

async function run() {
  await checkAddress(RPC_MAINNET, 'MAINNET');
  await checkAddress(RPC_TESTNET, 'TESTNET');
}

run();
