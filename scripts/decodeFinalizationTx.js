import { createPublicClient, http } from 'viem';

const RPC_MAINNET = 'https://api.infra.mainnet.somnia.network/';
const PLATFORM_ADDRESS = '0x5E5205CF39E766118C01636bED000A54D93163E6';
const TARGET_ID = 88651n;

const platformAbi = [
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
    const fromBlock = 329358680n;
    const toBlock = 329358700n;
    
    console.log(`Searching for RequestFinalized event logs to get transaction hash...`);
    const logs = await publicClient.getContractEvents({
      address: PLATFORM_ADDRESS,
      abi: platformAbi,
      eventName: 'RequestFinalized',
      args: { requestId: TARGET_ID },
      fromBlock,
      toBlock
    });

    if (logs.length === 0) {
      console.log('No finalization log found in this range.');
      return;
    }

    const txHash = logs[0].transactionHash;
    console.log(`FOUND RequestFinalized log! Transaction Hash: ${txHash}`);

    // Fetch the transaction details
    console.log('Fetching transaction details...');
    const tx = await publicClient.getTransaction({ hash: txHash });
    console.log(`Transaction Sender: ${tx.from}`);
    console.log(`Transaction Destination: ${tx.to}`);
    console.log(`Transaction Input Data: ${tx.input.slice(0, 130)}...`);

    // Let's decode the transaction input
    // The platform ABI should have the function validators call, e.g. submitResponse or fulfillRequest
    // Let's print out what function selector was called (first 4 bytes of input)
    const selector = tx.input.slice(0, 10);
    console.log(`Function selector called: ${selector}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

check();
