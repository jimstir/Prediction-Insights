import { createPublicClient, http } from 'viem';

const RPC_MAINNET = 'https://api.infra.mainnet.somnia.network/';
const PLATFORM_ADDRESS = '0x5E5205CF39E766118C01636bED000A54D93163E6';
const TARGET_ID = 88651n;

const platformAbiWithConsensus = [
  {
    type: 'event',
    name: 'RequestFinalized',
    inputs: [
      { type: 'uint256', name: 'requestId', indexed: true },
      { type: 'uint8', name: 'status', indexed: false },
      { type: 'bytes', name: 'consensusValue', indexed: false }
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
    
    // We know block of 88651 is 329358686. Let's query from 329358600 to 329358750
    const fromBlock = 329358600n;
    const toBlock = 329358750n;
    
    console.log(`Searching range: ${fromBlock} to ${toBlock} for RequestFinalized...`);
    
    const logs = await publicClient.getLogs({
      address: PLATFORM_ADDRESS,
      fromBlock,
      toBlock
    });

    console.log(`\nFound ${logs.length} raw logs:`);
    logs.forEach((log, index) => {
      console.log(`\nLog #${index} block: ${log.blockNumber}`);
      console.log(`Log #${index} topics:`, log.topics);
      console.log(`Log #${index} data:`, log.data);
    });

  } catch (error) {
    console.error('Error fetching logs:', error);
  }
}

check();
