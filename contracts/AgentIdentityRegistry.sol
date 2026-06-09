// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgentIdentityRegistry
 * @notice ERC-8004 compliant Identity Registry for Prediction Market Recommendation Agents
 * @dev Manages agent registration, metadata, and on-chain identity
 */

interface IAgentIdentityRegistry {
    // Events
    event AgentRegistered(uint256 indexed agentId, address indexed owner, string metadataURI);
    event AgentUpdated(uint256 indexed agentId, string metadataURI);
    event AgentDeactivated(uint256 indexed agentId);

    // Structs
    struct AgentMetadata {
        uint256 agentId;
        address owner;
        string name;
        string description;
        string metadataURI; // Points to off-chain metadata (IPFS/local file)
        bool active;
        uint256 registeredAt;
        uint256 updatedAt;
    }

    // Functions
    function registerAgent(
        string calldata name,
        string calldata description,
        string calldata metadataURI
    ) external returns (uint256);

    function updateAgentMetadata(uint256 agentId, string calldata metadataURI) external;

    function getAgent(uint256 agentId) external view returns (AgentMetadata memory);

    function getAgentByOwner(address owner) external view returns (uint256);

    function isAgentRegistered(uint256 agentId) external view returns (bool);

    function getAgentCount() external view returns (uint256);
}

contract AgentIdentityRegistry is IAgentIdentityRegistry {
    // State variables
    uint256 private nextAgentId = 1;
    mapping(uint256 => AgentMetadata) public agents;
    mapping(address => uint256) public ownerToAgentId;

    // Constructor
    constructor() {}

    /**
     * @notice Register a new recommendation agent
     * @param name Agent name
     * @param description Agent description
     * @param metadataURI IPFS or local reference to ERC-8004 registration metadata
     * @return agentId The ID assigned to the new agent
     */
    function registerAgent(
        string calldata name,
        string calldata description,
        string calldata metadataURI
    ) external returns (uint256) {
        require(bytes(name).length > 0, "Name required");
        require(bytes(metadataURI).length > 0, "Metadata URI required");
        require(ownerToAgentId[msg.sender] == 0, "Agent already registered");

        uint256 agentId = nextAgentId++;

        agents[agentId] = AgentMetadata({
            agentId: agentId,
            owner: msg.sender,
            name: name,
            description: description,
            metadataURI: metadataURI,
            active: true,
            registeredAt: block.timestamp,
            updatedAt: block.timestamp
        });

        ownerToAgentId[msg.sender] = agentId;

        emit AgentRegistered(agentId, msg.sender, metadataURI);
        return agentId;
    }

    /**
     * @notice Update agent metadata
     * @param agentId Agent ID to update
     * @param metadataURI New metadata URI
     */
    function updateAgentMetadata(uint256 agentId, string calldata metadataURI) external {
        require(agents[agentId].owner == msg.sender, "Not authorized");
        require(agents[agentId].active, "Agent inactive");
        require(bytes(metadataURI).length > 0, "Metadata URI required");

        agents[agentId].metadataURI = metadataURI;
        agents[agentId].updatedAt = block.timestamp;

        emit AgentUpdated(agentId, metadataURI);
    }

    /**
     * @notice Deactivate an agent
     * @param agentId Agent ID to deactivate
     */
    function deactivateAgent(uint256 agentId) external {
        require(agents[agentId].owner == msg.sender, "Not authorized");
        require(agents[agentId].active, "Agent already inactive");

        agents[agentId].active = false;

        emit AgentDeactivated(agentId);
    }

    /**
     * @notice Get agent metadata
     * @param agentId Agent ID
     * @return AgentMetadata structure
     */
    function getAgent(uint256 agentId) external view returns (AgentMetadata memory) {
        require(agents[agentId].owner != address(0), "Agent not found");
        return agents[agentId];
    }

    /**
     * @notice Get agent ID by owner address
     * @param owner Owner address
     * @return agentId The agent ID owned by address
     */
    function getAgentByOwner(address owner) external view returns (uint256) {
        return ownerToAgentId[owner];
    }

    /**
     * @notice Check if agent is registered and active
     * @param agentId Agent ID
     * @return bool True if registered and active
     */
    function isAgentRegistered(uint256 agentId) external view returns (bool) {
        return agents[agentId].active;
    }

    /**
     * @notice Get total number of agents registered
     * @return uint256 Agent count
     */
    function getAgentCount() external view returns (uint256) {
        return nextAgentId - 1;
    }
}
