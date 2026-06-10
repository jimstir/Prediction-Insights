import { createPublicClient, http, formatEther } from 'viem';

const PLATFORM_ADDRESS = '0x5E5205CF39E766118C01636bED000A54D93163E6';
const RPC_URL = 'https://dream-rpc.somnia.network/';

const platformAbi = [
  {
    type: 'function',
    name: 'getRequestDeposit',
    inputs: [],
    outputs: [{ type: 'uint256', name: '' }],
    stateMutability: 'view'
  }
];

async function check() {
  const publicClient = createPublicClient({
    transport: http(RPC_URL)
  });

  const address = '0xb1041133942d2e95e81b69aca3e7252c40d784b2';
  try {
    const balance = await publicClient.getBalance({ address });
    console.log(`Address: ${address}`);
    console.log(`Balance: ${formatEther(balance)} STT`);

    const reserve = await publicClient.readContract({
      address: PLATFORM_ADDRESS,
      abi: platformAbi,
      functionName: 'getRequestDeposit'
    });
    console.log(`Contract getRequestDeposit: ${formatEther(reserve)} STT`);
    
    const reward = 0.07 * 3;
    const totalNeeded = Number(formatEther(reserve)) + reward;
    console.log(`Total deposit needed: ${totalNeeded} STT`);
    
    if (balance < reserve + BigInt(210000000000000000)) {
      console.log('WARNING: INSUFFICIENT BALANCE!');
    } else {
      console.log('Balance is SUFFICIENT!');
    }
  } catch (error) {
    console.error('Error checking balance/contract:', error);
  }
}

check();
