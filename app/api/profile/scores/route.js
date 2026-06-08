import { NextResponse } from "next/server";
import { getPrisma } from "../../../lib/prisma";
import { normalizeWalletAddress } from "../../../lib/preferences";
import { calculateProfileScores, aggregateInferredInterests } from "../../../lib/profileScoring";

export const runtime = "nodejs";

/**
 * PUT /api/profile/scores
 *
 * Update user's inferred interest scores based on their interactions
 *
 * Request body:
 * {
 *   "address": "0x...",
 *   "scoreUpdates": [
 *     {
 *       "topic": "tech",
 *       "engagement": { "clickCount": 5, "isWatchlisted": true, "tradeExposure": 100 },
 *       "performance": { "wins": 3, "losses": 1, "roi": 0.15, "timingQuality": 0.7, "consistency": 0.8 }
 *     }
 *   ]
 * }
 */
export async function PUT(request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    const prisma = getPrisma();
    const body = await request.json();
    const { address, scoreUpdates = [] } = body;

    // Validate inputs
    const normalizedAddress = normalizeWalletAddress(address);
    if (!normalizedAddress) {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    if (!Array.isArray(scoreUpdates)) {
      return NextResponse.json(
        { error: "scoreUpdates must be an array" },
        { status: 400 }
      );
    }

    // Get user preference
    const preference = await prisma.preference.findUnique({
      where: { wallet: { address: normalizedAddress } },
    });

    if (!preference) {
      return NextResponse.json(
        { error: "User preferences not found" },
        { status: 404 }
      );
    }

    // Parse current inferred interests
    let currentInferred = {};
    try {
      currentInferred = typeof preference.inferredInterests === "string"
        ? JSON.parse(preference.inferredInterests)
        : preference.inferredInterests || {};
    } catch (e) {
      currentInferred = {};
    }

    // Calculate new scores for each topic
    const updatedScores = [];
    scoreUpdates.forEach((update) => {
      const { topic, engagement = {}, performance = {} } = update;

      if (!topic || typeof topic !== "string") {
        return; // Skip invalid entries
      }

      // Get historical scores for this topic
      const historical = currentInferred[topic] || {};

      // Calculate new profile scores
      const newScores = calculateProfileScores(
        engagement,
        performance,
        historical
      );

      updatedScores.push({
        topic,
        ...newScores,
      });
    });

    // Aggregate all topic scores
    const aggregatedInferred = aggregateInferredInterests(updatedScores);

    // Update preference with new scores
    const updatedPreference = await prisma.preference.update({
      where: { id: preference.id },
      data: {
        inferredInterests: aggregatedInferred,
        lastScoringUpdate: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        inferred_interests: aggregatedInferred,
        updated_topics: updatedScores.map((s) => s.topic),
        lastScoringUpdate: updatedPreference.lastScoringUpdate,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("PUT /api/profile/scores error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update profile scores" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/profile/scores
 *
 * Get user's current inferred interest scores
 *
 * Query params:
 * - address: wallet address
 */
export async function GET(request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    const prisma = getPrisma();
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get("address");

    const normalizedAddress = normalizeWalletAddress(address);
    if (!normalizedAddress) {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    const preference = await prisma.preference.findUnique({
      where: { wallet: { address: normalizedAddress } },
      select: {
        inferredInterests: true,
        lastScoringUpdate: true,
        wins: true,
        losses: true,
      },
    });

    if (!preference) {
      return NextResponse.json(
        { error: "User preferences not found" },
        { status: 404 }
      );
    }

    let inferredInterests = {};
    try {
      inferredInterests = typeof preference.inferredInterests === "string"
        ? JSON.parse(preference.inferredInterests)
        : preference.inferredInterests || {};
    } catch (e) {
      inferredInterests = {};
    }

    return NextResponse.json(
      {
        inferred_interests: inferredInterests,
        performance: {
          wins: preference.wins,
          losses: preference.losses,
        },
        lastScoringUpdate: preference.lastScoringUpdate,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/profile/scores error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch profile scores" },
      { status: 500 }
    );
  }
}
