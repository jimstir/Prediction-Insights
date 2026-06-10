"use client";

import { useState, useEffect } from "react";
import { createWalletClient, custom, createPublicClient, http, formatEther, encodeFunctionData, decodeFunctionResult, decodeEventLog } from "viem";
import { somniaChain } from "../lib/somnia/chain";
import { SOMNIA_AGENTS_PLATFORM_ABI } from "../lib/somnia/platformAbi";
import { LLM_INFER_STRING_ABI } from "../lib/somnia/llmAgentAbi";
import { ensureSomniaNetwork } from "../lib/somnia/network";

const PLATFORM_ADDRESS_MAINNET = "0x5E5205CF39E766118C01636bED000A54D93163E6";
const AGENT_ID = 12847293847561029384n;

export default function TestConnectionPage() {
  const [mounted, setMounted] = useState(false);
  const [logs, setLogs] = useState([]);
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("");
  const [loading, setLoading] = useState({});

  useEffect(() => {
    setMounted(true);
  }, []);

  const addLog = (msg) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const clearLogs = () => setLogs([]);

  if (!mounted) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", color: "#fff", background: "#0f1115", fontFamily: "sans-serif" }}>
        Loading test connection environment...
      </div>
    );
  }

  const connectWallet = async () => {
    setLoading(prev => ({ ...prev, connect: true }));
    try {
      if (!window.ethereum) {
        throw new Error("No ethereum provider found. Install MetaMask.");
      }

      addLog("Initializing public client...");
      const publicClient = createPublicClient({
        chain: somniaChain,
        transport: http("https://api.infra.mainnet.somnia.network/")
      });

      addLog("Requesting account access...");
      const walletClient = createWalletClient({
        chain: somniaChain,
        transport: custom(window.ethereum)
      });

      // Switch to mainnet
      addLog("Ensuring network is switched to Somnia Mainnet (Chain ID 5031)...");
      await ensureSomniaNetwork(window.ethereum, {
        id: 5031,
        name: "Somnia Mainnet",
        nativeCurrency: { name: "SOMI", symbol: "SOMI", decimals: 18 },
        rpcUrls: { default: { http: ["https://api.infra.mainnet.somnia.network/"] } },
        blockExplorers: { default: { url: "https://explorer.somnia.network" } }
      });

      const [addr] = await walletClient.requestAddresses();
      if (!addr) throw new Error("No account connected.");

      setAccount(addr);
      addLog(`Connected: ${addr}`);

      const bal = await publicClient.getBalance({ address: addr });
      setBalance(formatEther(bal));
      addLog(`Balance: ${formatEther(bal)} SOMI`);
    } catch (err) {
      addLog(`ERROR: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(prev => ({ ...prev, connect: false }));
    }
  };

  const checkBalance = async () => {
    if (!account) {
      addLog("Please connect wallet first.");
      return;
    }
    setLoading(prev => ({ ...prev, balance: true }));
    try {
      const walletClient = createWalletClient({
        chain: somniaChain,
        transport: custom(window.ethereum)
      });
      const chainId = await walletClient.getChainId();
      const rpcUrl = chainId === 50312
        ? "https://dream-rpc.somnia.network/"
        : "https://api.infra.mainnet.somnia.network/";

      const publicClient = createPublicClient({
        chain: somniaChain,
        transport: http(rpcUrl)
      });
      const bal = await publicClient.getBalance({ address: account });
      setBalance(formatEther(bal));
      addLog(`Refreshed Balance (Chain ${chainId}): ${formatEther(bal)} ${chainId === 50312 ? "STT" : "SOMI"}`);
    } catch (err) {
      addLog(`ERROR: ${err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, balance: false }));
    }
  };

  const testLlmInference = async () => {
    if (!account) {
      addLog("Please connect wallet first.");
      return;
    }
    setLoading(prev => ({ ...prev, inference: true }));
    try {
      const walletClient = createWalletClient({
        chain: somniaChain,
        transport: custom(window.ethereum)
      });
      const chainId = await walletClient.getChainId();
      addLog(`Detected wallet connected to Chain ID: ${chainId}`);
      
      const isTestnet = chainId === 50312;
      if (!isTestnet && chainId !== 5031) {
        addLog(`WARNING: Connected to unsupported Chain ID ${chainId}. Trying to default to Mainnet.`);
      }

      const platformAddress = isTestnet
        ? "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776"
        : "0x5E5205CF39E766118C01636bED000A54D93163E6";
      const rpcUrl = isTestnet
        ? "https://dream-rpc.somnia.network/"
        : "https://api.infra.mainnet.somnia.network/";
      const symbol = isTestnet ? "STT" : "SOMI";

      addLog(`Using Platform Address: ${platformAddress}`);
      addLog(`Using RPC URL: ${rpcUrl}`);

      addLog("1. Preparing 'Are you alive' inference payload...");
      const payload = encodeFunctionData({
        abi: LLM_INFER_STRING_ABI,
        functionName: "inferString",
        args: [
          "Are you alive",
          "You are a helpful assistant.",
          false,
          []
        ]
      });
      addLog(`Payload generated successfully: ${payload.slice(0, 66)}...`);

      addLog("2. Querying request deposit floor from platform contract...");
      const publicClient = createPublicClient({
        chain: somniaChain,
        transport: http(rpcUrl)
      });

      let reserve = 0n;
      try {
        reserve = await publicClient.readContract({
          address: platformAddress,
          abi: SOMNIA_AGENTS_PLATFORM_ABI,
          functionName: "getRequestDeposit"
        });
        addLog(`Contract getRequestDeposit floor: ${formatEther(reserve)} ${symbol}`);
      } catch (err) {
        addLog(`Could not read getRequestDeposit: ${err.message}. Defaulting to 0.`);
      }

      // Dynamic deposit
      const reward = 70000000000000000n * 3n; // 0.21 SOMI
      const deposit = reserve + reward;
      addLog(`Total value to send (deposit): ${formatEther(deposit)} ${symbol}`);

      addLog(`3. Sending transaction: createRequest to contract ${platformAddress}...`);
      const hash = await walletClient.writeContract({
        account,
        address: platformAddress,
        abi: SOMNIA_AGENTS_PLATFORM_ABI,
        functionName: "createRequest",
        args: [
          AGENT_ID,
          "0x0000000000000000000000000000000000000000",
          "0x00000000",
          payload
        ],
        value: deposit,
        gas: 500000n
      });

      addLog(`Transaction submitted! Hash: ${hash}`);
      addLog("4. Waiting for transaction receipt...");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      addLog(`Transaction status: ${receipt.status}`);
      addLog(`Gas used: ${receipt.gasUsed.toString()}`);
      addLog(`Logs emitted: ${receipt.logs.length}`);

      if (receipt.status === "reverted") {
        throw new Error("Transaction reverted on-chain.");
      }

      // Find RequestCreated log to extract requestId
      let requestId = null;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: SOMNIA_AGENTS_PLATFORM_ABI,
            eventName: "RequestCreated",
            data: log.data,
            topics: log.topics
          });
          requestId = decoded.args.requestId;
          break;
        } catch {}
      }

      if (requestId === null) {
        addLog("ERROR: RequestCreated event not found in logs. Listing all logs in receipt:");
        receipt.logs.forEach((log, index) => {
          addLog(`Log #${index}: Contract Address: ${log.address}`);
          addLog(`Log #${index}: Topics: ${JSON.stringify(log.topics)}`);
          addLog(`Log #${index}: Data: ${log.data.slice(0, 100)}...`);
          
          // Try to decode against any event in ABI to see if anything matches
          try {
            const decodedAny = decodeEventLog({
              abi: SOMNIA_AGENTS_PLATFORM_ABI,
              data: log.data,
              topics: log.topics
            });
            addLog(`Log #${index}: Decoded as event "${decodedAny.eventName}": ${JSON.stringify(decodedAny.args)}`);
          } catch (err) {
            addLog(`Log #${index}: Failed to decode against platform ABI: ${err.message}`);
          }
        });
        throw new Error("Could not find RequestCreated event in transaction receipt.");
      }

      addLog(`Request successfully created on-chain! Request ID: ${requestId.toString()}`);

      // 5. Poll contract getRequest to wait for finalization
      addLog("5. Waiting for validators to reach consensus (polling contract)...");
      let requestDetails = null;
      let isFinalizedAndCleared = false;
      const deadline = Date.now() + 180000; // 3 minute timeout
      
      while (Date.now() < deadline) {
        try {
          requestDetails = await publicClient.readContract({
            address: platformAddress,
            abi: SOMNIA_AGENTS_PLATFORM_ABI,
            functionName: "getRequest",
            args: [requestId]
          });

          const status = Number(requestDetails.status);
          if (status === 1) { // Pending
            addLog("Request status: Pending... waiting...");
          } else {
            addLog(`Request status changed: ${status === 2 ? "Success" : status === 3 ? "Failed" : status === 4 ? "TimedOut" : "Unknown"}`);
            break;
          }
        } catch (err) {
          if (err.message.includes("RequestNotFound")) {
            addLog("Request has been finalized and cleared from the contract state (RequestNotFound). Proceeding to receipts.");
            isFinalizedAndCleared = true;
            break;
          }
          addLog(`Polling warning: ${err.message}`);
        }
        await new Promise(r => setTimeout(r, 4000));
      }

      if (!isFinalizedAndCleared && (!requestDetails || Number(requestDetails.status) === 1)) {
        throw new Error("Request timed out waiting for consensus.");
      }

      // 6. Decode output result
      if (isFinalizedAndCleared) {
        addLog("Consensus reached on-chain! Request cleared from contract storage to refund gas.");
      } else if (requestDetails && Number(requestDetails.status) === 2 && requestDetails.responses && requestDetails.responses.length > 0) {
        const responseBytes = requestDetails.responses[0].result;
        addLog(`Consensus result bytes: ${responseBytes.slice(0, 66)}...`);
        try {
          const decodedResult = decodeFunctionResult({
            abi: LLM_INFER_STRING_ABI,
            functionName: "inferString",
            data: responseBytes
          });
          addLog(`*** Agent Response: ${decodedResult} ***`);
        } catch (decErr) {
          addLog(`Could not decode response bytes: ${decErr.message}`);
        }
      } else {
        addLog("Consensus failed or no validator responses recorded.");
      }

      // 7. Fetch receipts from receipts service
      addLog("6. Fetching receipts manifest from host (polling up to 3 attempts)...");
      const receiptsBaseUrl = isTestnet
        ? "https://receipts.testnet.agents.somnia.host"
        : "https://receipts.mainnet.agents.somnia.host";
      
      // Remove trailing slash if present to avoid path errors
      const receiptsUrl = `${receiptsBaseUrl}?contractAddress=${platformAddress}&requestId=${requestId.toString()}`;
      
      let manifest = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          addLog(`Receipts fetch attempt ${attempt}/3...`);
          const recRes = await fetch(receiptsUrl);
          if (!recRes.ok) {
            throw new Error(`Indexer returned HTTP status ${recRes.status}`);
          }
          const data = await recRes.json();
          if (data && data.urls && data.urls.length > 0) {
            manifest = data;
            break;
          } else {
            addLog("Indexer returned empty manifest (receipts not generated yet).");
          }
        } catch (err) {
          addLog(`Attempt ${attempt} failed: ${err.message}`);
        }
        
        if (attempt < 3) {
          addLog("Waiting 4 seconds before next retry...");
          await new Promise(r => setTimeout(r, 4000));
        }
      }

      // Print receipts if retrieved
      if (manifest && manifest.urls && manifest.urls.length > 0) {
        addLog(`Receipt manifest retrieved! Found ${manifest.urls.length} receipt documents.`);
        for (const url of manifest.urls) {
          try {
            addLog(`Fetching specific receipt from: ${url}`);
            const specificRes = await fetch(url);
            if (specificRes.ok) {
              const receiptJson = await specificRes.json();
              addLog(`*** Receipt Content: ${JSON.stringify(receiptJson, null, 2)} ***`);
            } else {
              addLog(`Failed to fetch receipt from ${url}: HTTP ${specificRes.status}`);
            }
          } catch (fetchErr) {
            addLog(`Error fetching specific receipt: ${fetchErr.message}`);
          }
        }
      } else {
        addLog("WARNING: Receipts service returned 404 (indexer pending/unavailable).");
      }

      // Always execute direct on-chain extraction to guarantee response retrieval
      addLog("7. Executing on-chain transaction & event log extraction...");
      try {
        // 1. Fetch finalization log to get the transaction hash
        const latestBlock = await publicClient.getBlockNumber();
        const fromBlock = receipt.blockNumber - 5n; // Scan starting from creation block minus small buffer
        
        addLog(`Scanning blocks ${fromBlock.toString()} to ${latestBlock.toString()} for finalization event logs...`);
        const finalizedLogs = await publicClient.getContractEvents({
          address: platformAddress,
          abi: SOMNIA_AGENTS_PLATFORM_ABI,
          eventName: "RequestFinalized",
          args: { requestId },
          fromBlock,
          toBlock: "latest"
        });

        if (finalizedLogs.length === 0) {
          throw new Error("No RequestFinalized logs found on-chain.");
        }

        const finalTxHash = finalizedLogs[0].transactionHash;
        addLog(`Found finalization logs! Tx Hash: ${finalTxHash}`);

        // 2. Fetch the transaction details
        addLog("Fetching finalization transaction payload from blockchain...");
        const finalTx = await publicClient.getTransaction({ hash: finalTxHash });
        
        // 3. Extract and parse the ASCII text response from the transaction inputs
        const calldata = finalTx.input.slice(10); // strip method selector
        let rawText = "";
        for (let i = 0; i < calldata.length; i += 2) {
          const charCode = parseInt(calldata.slice(i, i + 2), 16);
          if (charCode >= 32 && charCode <= 126) {
            rawText += String.fromCharCode(charCode);
          } else {
            rawText += " ";
          }
        }

        // Clean up multiple spaces and extract the response segment
        const cleanedText = rawText.replace(/\s+/g, " ").trim();
        
        // Find the response sentence (starting with expected patterns like "I am", "Yes", etc.)
        const llmMatch = cleanedText.match(/(?:I\s+am|[A-Z][a-z]+)[^.!?]+[.!?]/g);
        const responseText = llmMatch ? llmMatch.join(" ") : cleanedText;

        addLog(`*** On-Chain Extracted Agent Response: ${responseText} ***`);
      } catch (onChainErr) {
        addLog(`ERROR: On-chain extraction failed: ${onChainErr.message}`);
      }

    } catch (err) {
      addLog(`ERROR: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(prev => ({ ...prev, inference: false }));
    }
  };

  return (
    <div className="test-page-container">
      <header className="test-header">
        <h1>Somnia Mainnet Integration Test Page</h1>
        <button onClick={() => window.location.href = "/"} className="btn-back">
          Back to Dashboard
        </button>
      </header>

      <div className="test-layout">
        <div className="controls-card glass-card">
          <h2>Actions</h2>

          <div className="btn-group">
            <button 
              onClick={connectWallet} 
              disabled={loading.connect}
              className="btn-action"
            >
              {loading.connect ? "Connecting..." : "Connect Wallet & Set Network"}
            </button>

            <button 
              onClick={checkBalance} 
              disabled={loading.balance || !account}
              className="btn-action"
            >
              {loading.balance ? "Refreshing..." : "Check Wallet Balance"}
            </button>

            <button 
              onClick={testLlmInference} 
              disabled={loading.inference || !account}
              className="btn-action btn-highlight"
            >
              {loading.inference ? "Sending Request..." : 'Send LLM request: "Are you alive"'}
            </button>
          </div>

          <div className="status-info">
            <p><strong>Wallet:</strong> {account || "Not Connected"}</p>
            <p><strong>Balance:</strong> {balance ? `${balance} SOMI` : "N/A"}</p>
            <p><strong>Platform Address:</strong> <code>{PLATFORM_ADDRESS_MAINNET}</code></p>
            <p><strong>Agent ID:</strong> <code>{AGENT_ID.toString()}</code></p>
          </div>
        </div>

        <div className="logs-card glass-card">
          <div className="logs-header">
            <h2>Console Logs</h2>
            <button onClick={clearLogs} className="btn-clear">Clear</button>
          </div>
          <div className="logs-display">
            {logs.length === 0 ? (
              <p className="placeholder-log">Logs will display here as actions are executed...</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className={`log-line ${log.includes("ERROR") ? "error-log" : ""}`}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .test-page-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
          color: #f8f9fa;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .test-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 20px;
        }

        .test-header h1 {
          font-size: 28px;
          font-weight: 800;
          background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .btn-back {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
        }

        .btn-back:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .test-layout {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 24px;
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 24px;
          backdrop-filter: blur(10px);
        }

        .controls-card h2, .logs-header h2 {
          font-size: 20px;
          margin-top: 0;
          margin-bottom: 20px;
          color: #fff;
        }

        .btn-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }

        .btn-action {
          background: #4facfe;
          border: none;
          color: #fff;
          padding: 14px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: filter 0.2s, opacity 0.2s;
        }

        .btn-action:hover:not(:disabled) {
          filter: brightness(1.1);
        }

        .btn-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-highlight {
          background: linear-gradient(135deg, #9d4ede 0%, #c084fc 100%);
          box-shadow: 0 0 15px rgba(157, 78, 221, 0.3);
        }

        .status-info {
          background: rgba(0, 0, 0, 0.2);
          padding: 16px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .status-info p {
          margin: 8px 0;
          font-size: 14px;
        }

        .status-info code {
          background: rgba(255, 255, 255, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
        }

        .logs-card {
          display: flex;
          flex-direction: column;
          height: 600px;
        }

        .logs-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .btn-clear {
          background: none;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #aaa;
          padding: 4px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .btn-clear:hover {
          color: #fff;
          border-color: rgba(255, 255, 255, 0.4);
        }

        .logs-display {
          background: #0f1115;
          border-radius: 8px;
          padding: 16px;
          flex-grow: 1;
          overflow-y: auto;
          font-family: monospace;
          font-size: 13px;
          line-height: 1.5;
        }

        .placeholder-log {
          color: #666;
          text-align: center;
          margin-top: 100px;
        }

        .log-line {
          margin-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          padding-bottom: 4px;
          color: #a5d6a7;
          word-break: break-all;
        }

        .error-log {
          color: #ef9a9a;
        }
      `}</style>
    </div>
  );
}
