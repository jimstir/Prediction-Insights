// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ReputationRegistry
 * @notice ERC-8004 compliant Reputation Registry for Agent Performance Attestations
 * @dev Records and manages reputation scores for agents based on engagement and performance
 */

interface IReputationRegistry {
    // Events
    event AttestationCreated(
        uint256 indexed agentId,
        address indexed wallet,
        string attestationURI,
        uint256 engagementScore
    );
    event ReputationUpdated(uint256 indexed agentId, uint256 newScore);

    // Structs
    struct Attestation {
        uint256 id;
        uint256 agentId;
        address wallet;
        string attestationURI; // IPFS/local reference to full attestation data
        uint256 engagementScore; // 0-100
        uint256 recommendationCount;
        uint256 createdAt;
    }

    struct ReputationScore {
        uint256 agentId;
        uint256 totalAttestation;
        uint256 averageScore;
        uint256 lastUpdated;
    }

    // Functions
    function submitAttestation(
        uint256 agentId,
        address wallet,
        string calldata attestationURI,
        uint256 engagementScore,
        uint256 recommendationCount
    ) external;

    function getAttestation(uint256 attestationId) external view returns (Attestation memory);

    function getAgentReputation(uint256 agentId) external view returns (ReputationScore memory);

    function getAttestaionCount(uint256 agentId) external view returns (uint256);
}

contract ReputationRegistry is IReputationRegistry {
    // State variables
    uint256 private nextAttestationId = 1;

    mapping(uint256 => Attestation) public attestations;
    mapping(uint256 => ReputationScore) public reputationScores;
    mapping(uint256 => uint256[]) public agentAttestations; // agentId => attestation IDs

    // Constructor
    constructor() {}

    /**
     * @notice Submit a new reputation attestation for an agent
     * @param agentId Agent ID being attested
     * @param wallet User wallet address
     * @param attestationURI Reference to full attestation data (IPFS/local)
     * @param engagementScore Engagement score (0-100)
     * @param recommendationCount Number of recommendations
     */
    function submitAttestation(
        uint256 agentId,
        address wallet,
        string calldata attestationURI,
        uint256 engagementScore,
        uint256 recommendationCount
    ) external {
        require(agentId > 0, "Invalid agent ID");
        require(wallet != address(0), "Invalid wallet");
        require(bytes(attestationURI).length > 0, "Attestation URI required");
        require(engagementScore <= 100, "Score must be 0-100");

        uint256 attestationId = nextAttestationId++;

        attestations[attestationId] = Attestation({
            id: attestationId,
            agentId: agentId,
            wallet: wallet,
            attestationURI: attestationURI,
            engagementScore: engagementScore,
            recommendationCount: recommendationCount,
            createdAt: block.timestamp
        });

        agentAttestations[agentId].push(attestationId);

        // Update reputation score
        _updateReputationScore(agentId, engagementScore);

        emit AttestationCreated(agentId, wallet, attestationURI, engagementScore);
    }

    /**
     * @notice Update agent reputation score based on new attestation
     * @dev Recalculates average score from all attestations
     * @param agentId Agent ID
     * @param newScore New engagement score
     */
    function _updateReputationScore(uint256 agentId, uint256 newScore) internal {
        ReputationScore storage score = reputationScores[agentId];

        // Initialize if first attestation
        if (score.totalAttestation == 0) {
            score.agentId = agentId;
            score.averageScore = newScore;
            score.totalAttestation = 1;
        } else {
            // Calculate new average
            uint256 totalScore = (score.averageScore * score.totalAttestation) + newScore;
            score.totalAttestation++;
            score.averageScore = totalScore / score.totalAttestation;
        }

        score.lastUpdated = block.timestamp;

        emit ReputationUpdated(agentId, score.averageScore);
    }

    /**
     * @notice Get a specific attestation
     * @param attestationId Attestation ID
     * @return Attestation data
     */
    function getAttestation(uint256 attestationId)
        external
        view
        returns (Attestation memory)
    {
        require(attestations[attestationId].createdAt > 0, "Attestation not found");
        return attestations[attestationId];
    }

    /**
     * @notice Get reputation score for an agent
     * @param agentId Agent ID
     * @return ReputationScore data
     */
    function getAgentReputation(uint256 agentId)
        external
        view
        returns (ReputationScore memory)
    {
        return reputationScores[agentId];
    }

    /**
     * @notice Get count of attestations for an agent
     * @param agentId Agent ID
     * @return uint256 Number of attestations
     */
    function getAttestaionCount(uint256 agentId) external view returns (uint256) {
        return agentAttestations[agentId].length;
    }

    /**
     * @notice Get all attestations for an agent
     * @param agentId Agent ID
     * @return Array of attestation IDs
     */
    function getAgentAttestations(uint256 agentId)
        external
        view
        returns (uint256[] memory)
    {
        return agentAttestations[agentId];
    }

    /**
     * @notice Get attestation by index
     * @param agentId Agent ID
     * @param index Index in agent's attestation array
     * @return Attestation data
     */
    function getAttestationByIndex(uint256 agentId, uint256 index)
        external
        view
        returns (Attestation memory)
    {
        require(index < agentAttestations[agentId].length, "Index out of bounds");
        uint256 attestationId = agentAttestations[agentId][index];
        return attestations[attestationId];
    }
}
