import { createPublicClient, http } from 'viem';

const RPC_MAINNET = 'https://api.infra.mainnet.somnia.network/';
const PLATFORM_ADDRESS = '0x5E5205CF39E766118C01636bED000A54D93163E6';
const TX_HASH = '0xcceb48065a77a6776fb5085377445077308de345612f4162945fdf76ba99db35'; 

// Let's inspect log 88651
const REQUEST_ID = 88651n;

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

    const fromBlock = latestBlock - 900n;
    const toBlock = latestBlock;
    console.log(`Searching for RequestCreated & RequestFinalized in block range ${fromBlock} to ${toBlock} for Request ID ${REQUEST_ID}...`);

    const createdLogs = await publicClient.getContractEvents({
      address: PLATFORM_ADDRESS,
      abi: platformAbi,
      eventName: 'RequestCreated',
      fromBlock,
      toBlock
    });
    console.log(`\nFound ${createdLogs.length} RequestCreated events in range:`);
    createdLogs.forEach(log => {
      console.log(`- Request ID: ${log.args.requestId}, Block: ${log.blockNumber}`);
    });

    const finalizedLogs = await publicClient.getContractEvents({
      address: PLATFORM_ADDRESS,
      abi: platformAbi,
      eventName: 'RequestFinalized',
      fromBlock,
      toBlock
    });
    console.log(`\nFound ${finalizedLogs.length} RequestFinalized events in range:`);
    finalizedLogs.forEach(log => {
      console.log(`- Request ID: ${log.args.requestId}, Status: ${log.args.status}, Block: ${log.blockNumber}`);
    });

  } catch (error) {
    console.error('Error fetching logs:', error);
  }
}

check();
