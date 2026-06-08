import { NextResponse } from "next/server";
import { getPrisma } from "../../../lib/prisma";
import { normalizeWalletAddress } from "../../../lib/preferences";

export const runtime = "nodejs";

/**
 * POST /api/engagement/track
 *
 * Track user engagement with a market (clicks, time spent, watchlist, trades)
 *
 * Request body:
 * {
 *   "address": "0x...",
 *   "marketId": "market-uuid",
 *   "interactionType": "view" | "click" | "watchlist" | "trade",
 *   "clickCount": 1,
 *   "timeSpentMs": 5000,
 *   "isWatchlisted": false,
 *   "tradeExposure": 0
 * }
 */
export async function POST(request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    const prisma = getPrisma();
    const body = await request.json();
    const {
      address,
      marketId,
      interactionType = "view",
      clickCount = 1,
      timeSpentMs = 0,
      isWatchlisted = false,
      tradeExposure = 0,
    } = body;

    // Validate inputs
    const normalizedAddress = normalizeWalletAddress(address);
    if (!normalizedAddress) {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    if (!marketId || typeof marketId !== "string") {
      return NextResponse.json(
        { error: "Market ID is required" },
        { status: 400 }
      );
    }

    // Get or create preference for this wallet
    let preference = await prisma.preference.findUnique({
      where: { wallet: { address: normalizedAddress } },
    });

    if (!preference) {
      const wallet = await prisma.wallet.upsert({
        where: { address: normalizedAddress },
        create: { address: normalizedAddress },
        update: {},
      });

      preference = await prisma.preference.create({
        data: { walletId: wallet.id },
      });
    }

    // Verify market exists
    const market = await prisma.market.findUnique({
      where: { id: marketId },
    });

    if (!market) {
      return NextResponse.json(
        { error: "Market not found" },
        { status: 404 }
      );
    }

    // Update or create engagement record
    const engagement = await prisma.userEngagement.upsert({
      where: {
        walletId_marketId: {
          walletId: preference.walletId,
          marketId,
        },
      },
      create: {
        walletId: preference.walletId,
        marketId,
        interactionType,
        clickCount,
        timeSpentMs,
        isWatchlisted,
        tradeExposure,
      },
      update: {
        clickCount: { increment: clickCount },
        timeSpentMs: { increment: timeSpentMs },
        isWatchlisted,
        tradeExposure:
          tradeExposure > 0
            ? { increment: tradeExposure }
            : undefined,
        interactionType,
        lastInteraction: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        engagement: {
          id: engagement.id,
          marketId: engagement.marketId,
          clickCount: engagement.clickCount,
          timeSpentMs: engagement.timeSpentMs,
          isWatchlisted: engagement.isWatchlisted,
          tradeExposure: engagement.tradeExposure,
          lastInteraction: engagement.lastInteraction,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/engagement/track error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to track engagement" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/engagement/summary
 *
 * Get user's engagement summary
 *
 * Query params:
 * - address: wallet address
 * - marketId: (optional) specific market ID
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
    const marketId = searchParams.get("marketId");

    const normalizedAddress = normalizeWalletAddress(address);
    if (!normalizedAddress) {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    // Get preference
    const preference = await prisma.preference.findUnique({
      where: { wallet: { address: normalizedAddress } },
    });

    if (!preference) {
      return NextResponse.json(
        { error: "User preferences not found" },
        { status: 404 }
      );
    }

    // Build query filter
    const whereClause = {
      walletId: preference.walletId,
    };

    if (marketId && typeof marketId === "string") {
      whereClause.marketId = marketId;
    }

    // Get engagement records
    const engagements = await prisma.userEngagement.findMany({
      where: whereClause,
      include: { market: true },
      orderBy: { lastInteraction: "desc" },
    });

    // Aggregate stats
    const totalClicks = engagements.reduce((sum, e) => sum + e.clickCount, 0);
    const totalTimeSpentMs = engagements.reduce((sum, e) => sum + e.timeSpentMs, 0);
    const watchlistedCount = engagements.filter((e) => e.isWatchlisted).length;
    const totalExposure = engagements.reduce((sum, e) => sum + e.tradeExposure, 0);

    return NextResponse.json(
      {
        summary: {
          totalEngagements: engagements.length,
          totalClicks,
          totalTimeSpentMs,
          totalTimeSpentSeconds: Math.round(totalTimeSpentMs / 1000),
          watchlistedCount,
          totalExposure,
          averageTimePerEngagement:
            engagements.length > 0
              ? Math.round(totalTimeSpentMs / engagements.length)
              : 0,
        },
        engagements: engagements.map((e) => ({
          id: e.id,
          market: {
            id: e.market.id,
            title: e.market.title,
            kalshiId: e.market.kalshiId,
          },
          clickCount: e.clickCount,
          timeSpentMs: e.timeSpentMs,
          isWatchlisted: e.isWatchlisted,
          tradeExposure: e.tradeExposure,
          firstInteraction: e.firstInteraction,
          lastInteraction: e.lastInteraction,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/engagement/summary error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch engagement summary" },
      { status: 500 }
    );
  }
}
