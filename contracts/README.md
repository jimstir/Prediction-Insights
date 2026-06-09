# ERC-8004 Smart Contracts

This directory contains the ERC-8004 compliant smart contracts for managing agent identity and reputation in the Prediction Market Recommendation system.

## Contracts

### AgentIdentityRegistry.sol

ERC-8004 compliant contract for managing agent registration and metadata.

**Key Features:**
- Register new recommendation agents
- Maintain agent metadata (name, description, metadata URI)
- Check agent registration status
- Support for on-chain identity verification

**Functions:**
```solidity
registerAgent(name, description, metadataURI) -> agentId
updateAgentMetadata(agentId, metadataURI)
getAgent(agentId) -> AgentMetadata
getAgentByOwner(owner) -> agentId
isAgentRegistered(agentId) -> bool
getAgentCount() -> uint256
```

**Events:**
- `AgentRegistered(agentId, owner, metadataURI)`
- `AgentUpdated(agentId, metadataURI)`
- `AgentDeactivated(agentId)`

### ReputationRegistry.sol

Smart contract for managing agent reputation attestations and scoring.

**Key Features:**
- Submit engagement attestations for agents
- Track reputation scores based on engagement
- Calculate average reputation across all attestations
- Query agent reputation and attestation history

**Functions:**
```solidity
submitAttestation(agentId, wallet, attestationURI, engagementScore, recommendationCount)
getAttestation(attestationId) -> Attestation
getAgentReputation(agentId) -> ReputationScore
getAttestaionCount(agentId) -> uint256
getAgentAttestations(agentId) -> uint256[]
getAttestationByIndex(agentId, index) -> Attestation
```

**Events:**
- `AttestationCreated(agentId, wallet, attestationURI, engagementScore)`
- `ReputationUpdated(agentId, newScore)`

## Setup

### 1. Install Dependencies

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @nomicfoundation/hardhat-ethers ethers
npm install dotenv
```

### 2. Initialize Hardhat

Already configured in `hardhat.config.js`. No additional setup needed.

### 3. Compile Contracts

```bash
npx hardhat compile
```

Output:
```
Compiling 2 Solidity files
Compiling ./contracts/AgentIdentityRegistry.sol
Compiling ./contracts/ReputationRegistry.sol
✓ Compiled successfully
```

## Deployment

### Local Development

```bash
# Terminal 1: Start local blockchain
npx hardhat node

# Terminal 2: Deploy contracts
npx hardhat run scripts/deploy.js --network localhost
```

### Somnia Testnet

```bash
npx hardhat run scripts/deploy.js --network somiaTestnet
```

### Somnia Mainnet

```bash
npx hardhat run scripts/deploy.js --network somnia
```

See [SMART_CONTRACT_DEPLOYMENT.md](./SMART_CONTRACT_DEPLOYMENT.md) for detailed instructions.

## Testing

### Run Tests

```bash
npx hardhat test
```

### Create Test Files

Create `test/AgentIdentityRegistry.test.js`:

```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgentIdentityRegistry", function () {
  let identityRegistry;
  let owner, other;

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();
    const AgentIdentityRegistry = await ethers.getContractFactory(
      "AgentIdentityRegistry"
    );
    identityRegistry = await AgentIdentityRegistry.deploy();
  });

  it("Should register an agent", async function () {
    const tx = await identityRegistry.registerAgent(
      "Test Agent",
      "Test Description",
      "ipfs://test"
    );

    const agent = await identityRegistry.getAgent(1);
    expect(agent.name).to.equal("Test Agent");
    expect(agent.owner).to.equal(owner.address);
    expect(agent.active).to.be.true;
  });

  it("Should prevent duplicate registration", async function () {
    await identityRegistry.registerAgent(
      "Agent 1",
      "Description 1",
      "ipfs://test1"
    );

    await expect(
      identityRegistry.registerAgent(
        "Agent 2",
        "Description 2",
        "ipfs://test2"
      )
    ).to.be.revertedWith("Agent already registered");
  });

  it("Should update agent metadata", async function () {
    await identityRegistry.registerAgent(
      "Agent",
      "Description",
      "ipfs://old"
    );

    await identityRegistry.updateAgentMetadata(1, "ipfs://new");

    const agent = await identityRegistry.getAgent(1);
    expect(agent.metadataURI).to.equal("ipfs://new");
  });
});
```

## Integration with App

### Backend Integration

**app/lib/erc8004/config.js** - Contract addresses and ABIs

**app/lib/erc8004/agentIdentity.js** - Agent registration utilities

**app/lib/erc8004/reputationRegistry.js** - Reputation submission utilities

### Frontend Integration

**app/api/agent/reputation/route.js** - API endpoint for attestations

**app/components/RecommendationsWidget.js** - Calls reputation endpoint after LLM inference

## Configuration

### Network Configuration (hardhat.config.js)

```javascript
networks: {
  localhost: { url: "http://127.0.0.1:8545" },
  somnia: {
    url: process.env.SOMNIA_RPC_URL,
    accounts: [process.env.PRIVATE_KEY],
    chainId: 55,
  },
  somniaTestnet: {
    url: process.env.SOMNIA_TESTNET_RPC_URL,
    accounts: [process.env.PRIVATE_KEY],
    chainId: 57,
  },
}
```

### Environment Variables (.env)

```bash
SOMNIA_RPC_URL=https://somnia-mainnet.xyz/rpc
SOMNIA_TESTNET_RPC_URL=https://testnet-rpc.somnia.xyz
PRIVATE_KEY=your_private_key
AGENT_IDENTITY_REGISTRY=0x...
REPUTATION_REGISTRY=0x...
```

## Interaction Examples

### Hardhat Console

```bash
npx hardhat console --network localhost
```

```javascript
// Connect to deployed contracts
const identityRegistry = await ethers.getContractAt(
  "AgentIdentityRegistry",
  "0x5FbDB2315678afccb333f8a9c45b65d30C0C5eE0"
);

const reputationRegistry = await ethers.getContractAt(
  "ReputationRegistry",
  "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
);

// Register agent
const tx1 = await identityRegistry.registerAgent(
  "My Agent",
  "Does recommendations",
  "ipfs://metadata"
);
await tx1.wait();

// Submit attestation
const tx2 = await reputationRegistry.submitAttestation(
  1, // agentId
  "0x742d35Cc6634C0532925a3b844Bc2e7595f61f0E", // wallet
  "ipfs://attestation", // attestationURI
  85, // engagementScore
  5 // recommendationCount
);
await tx2.wait();

// Query reputation
const reputation = await reputationRegistry.getAgentReputation(1);
console.log("Agent Reputation:", reputation);
```

## Deployment Checklist

- [ ] Install dependencies: `npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox`
- [ ] Configure environment variables in `.env`
- [ ] Compile contracts: `npx hardhat compile`
- [ ] Run tests: `npx hardhat test`
- [ ] Deploy to local: `npx hardhat run scripts/deploy.js --network localhost`
- [ ] Deploy to testnet: `npx hardhat run scripts/deploy.js --network somiaTestnet`
- [ ] Update `.env` with contract addresses
- [ ] Update `app/lib/erc8004/config.js` if needed
- [ ] Run database migration: `npx prisma migrate deploy`
- [ ] Start app: `npm run dev`
- [ ] Test agent registration flow
- [ ] Test reputation submission

## Security Notes

1. **Never commit private keys** - Use `.gitignore` to exclude `.env`
2. **Test thoroughly** - Always test on local/testnet before mainnet
3. **Audit before production** - Have contracts audited before mainnet deployment
4. **Monitor events** - Listen for contract events to track agent activities
5. **Rate limiting** - Consider rate limiting for API endpoints

## Troubleshooting

### "Compilation errors"
```bash
npx hardhat clean
npx hardhat compile
```

### "Contract deployment fails"
- Check network configuration
- Verify RPC URL is correct
- Ensure account has sufficient balance

### "Transaction reverted"
- Check contract state
- Verify function parameters
- Review contract events

## Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [ERC-8004 Specification](https://eips.ethereum.org/EIPS/eip-8004)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [Somnia Network Docs](https://docs.somnia.network)

## Support

For issues or questions:
1. Check Hardhat docs
2. Review contract code and comments
3. Test on local network first
4. Consult deployment guide

---

**Status:** ✅ Ready for deployment
**Last Updated:** 2026-06-08
**Network Support:** Local (Hardhat), Somnia Testnet, Somnia Mainnet
