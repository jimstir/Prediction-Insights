import { createPublicClient, http } from 'viem';

const RPC_MAINNET = 'https://api.infra.mainnet.somnia.network/';
const PLATFORM_ADDRESS = '0x5E5205CF39E766118C01636bED000A54D93163E6';
const TARGET_ID = 88651n;

const platformAbi = [
  {
    type: 'event',
    name: 'RequestCreated',
    inputs: [
      { type: 'uint256', name: 'requestId', indexed: true },
      { type: 'uint256', name: 'agentId', indexed: true },
      { type: 'uint256', name: 'perAgentBudget', indexed: false },
      { type: 'bytes', name: 'payload', indexed: false },
      { type: 'address[]', name: 'subcommittee', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'RequestFinalized',
    inputs: [
      { type: 'uint256', name: 'requestId', indexed: true },
      { type: 'uint8', name: 'status', indexed: false }
    ]
  }
];

async function check() {
  const publicClient = createPublicClient({
    transport: http(RPC_MAINNET)
  });

  try {
    const latestBlock = await publicClient.getBlockNumber();
    console.log(`Latest block: ${latestBlock}`);
    
    // We will query in chunks of 900 blocks, going backwards up to 15,000 blocks to find the TARGET_ID
    const chunkSize = 900n;
    let foundCreated = null;
    let foundFinalized = null;
    
    for (let i = 0n; i < 20n; i++) {
      const toBlock = latestBlock - (i * chunkSize);
      const fromBlock = toBlock - chunkSize;
      
      console.log(`Searching range: ${fromBlock} to ${toBlock}...`);
      
      const createdLogs = await publicClient.getContractEvents({
        address: PLATFORM_ADDRESS,
        abi: platformAbi,
        eventName: 'RequestCreated',
        args: { requestId: TARGET_ID },
        fromBlock,
        toBlock
      });
      
      if (createdLogs.length > 0) {
        foundCreated = createdLogs[0];
        console.log(`FOUND RequestCreated for ${TARGET_ID} in block ${foundCreated.blockNumber}!`);
      }

      const finalizedLogs = await publicClient.getContractEvents({
        address: PLATFORM_ADDRESS,
        abi: platformAbi,
        eventName: 'RequestFinalized',
        args: { requestId: TARGET_ID },
        fromBlock,
        toBlock
      });

      if (finalizedLogs.length > 0) {
        foundFinalized = finalizedLogs[0];
        console.log(`FOUND RequestFinalized for ${TARGET_ID} in block ${foundFinalized.blockNumber} with status ${foundFinalized.args.status}!`);
      }

      if (foundCreated && foundFinalized) {
        break;
      }
    }

    if (!foundCreated) {
      console.log(`Could not find RequestCreated for ${TARGET_ID} in the last 18,000 blocks.`);
    }
    if (!foundFinalized) {
      console.log(`Could not find RequestFinalized for ${TARGET_ID} in the last 18,000 blocks.`);
    }

  } catch (error) {
    console.error('Error fetching logs:', error);
  }
}

check();
