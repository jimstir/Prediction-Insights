/**
 * Reputation Attestation API
 * POST /api/agent/reputation
 * Creates and submits reputation attestations after LLM inference
 */

import {
  createReputationAttestation,
  saveReputationAttestation,
  logReputationEvent,
} from "../../../lib/erc8004/reputationRegistry";
import { getOrCreateAgentId } from "../../../lib/erc8004/agentIdentity";

export async function POST(request) {
  try {
    const body = await request.json();
    const { address, recommendationCount, inferenceTime } = body;

    if (!address) {
      return new Response(
        JSON.stringify({ error: "Wallet address required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const normalizedAddress = address.toLowerCase();

    // Get or create agentId for the wallet
    let agentId;
    try {
      agentId = await getOrCreateAgentId(normalizedAddress);
    } catch (error) {
      console.error("Failed to get/create agentId:", error);
      return new Response(
        JSON.stringify({ error: "Failed to get/create agentId" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create reputation attestation
    let attestation;
    try {
      const attestationId = `att-${Date.now()}-${agentId}`;
      attestation = await createReputationAttestation(normalizedAddress, attestationId);
      attestation.metadata = {
        recommendationCount: recommendationCount || 0,
        inferenceTime: inferenceTime || 0,
        submittedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Failed to create attestation:", error);
      return new Response(
        JSON.stringify({ error: "Failed to create attestation", details: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Save attestation locally
    let savedAttestation;
    try {
      savedAttestation = await saveReputationAttestation(normalizedAddress, attestation);
    } catch (error) {
      console.error("Failed to save attestation:", error);
      // Don't fail the whole request if saving fails
      console.warn("Attestation created but failed to save locally");
    }

    // Log the event
    await logReputationEvent(normalizedAddress, "attestation-created", {
      agentId,
      attestationId: attestation.id,
      recommendationCount,
      inferenceTime,
    });

    return new Response(
      JSON.stringify({
        success: true,
        agentId,
        attestationId: attestation.id,
        engagementSummary: attestation.engagementSummary,
        status: attestation.status,
        message: "Reputation attestation created and queued for submission",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Reputation attestation error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to create attestation" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * GET /api/agent/reputation?address=0x...
 * Retrieve reputation attestation for a wallet
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return new Response(
        JSON.stringify({ error: "Wallet address required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // In a real implementation, fetch from database/storage
    const agentId = await getOrCreateAgentId(address);

    return new Response(
      JSON.stringify({
        address: address.toLowerCase(),
        agentId,
        message: "Use POST endpoint to create new attestation",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error retrieving attestation:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to retrieve attestation" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
