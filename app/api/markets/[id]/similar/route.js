import { NextResponse } from "next/server";
import { getPrisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/markets/:id/similar
 *
 * Get markets similar to the specified market
 *
 * Query params:
 * - limit: max number of similar markets to return (default: 10)
 */
export async function GET(request, { params }) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    const prisma = getPrisma();
    const marketId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Invalid limit. Must be 1-100." },
        { status: 400 }
      );
    }

    // Verify market exists by database ID or Kalshi ID
    let market = await prisma.market.findUnique({
      where: { id: marketId },
    });

    if (!market) {
      market = await prisma.market.findUnique({
        where: { kalshiId: marketId },
      });
    }

    if (!market) {
      return NextResponse.json(
        { error: "Market not found" },
        { status: 404 }
      );
    }

    const dbMarketId = market.id;

    // Find similar markets (bidirectional) using the database UUID
    const similarRelations = await prisma.similarMarket.findMany({
      where: {
        OR: [
          { marketIId: dbMarketId },
          { marketJId: dbMarketId },
        ],
      },
      include: {
        marketI: true,
        marketJ: true,
      },
      orderBy: { confidence: "desc" },
      take: limit,
    });

    // Extract the actual similar markets (the other side of the relation)
    const similarMarkets = similarRelations.map((rel) => ({
      relation: {
        id: rel.id,
        isSameOutcome: rel.isSameOutcome,
        confidence: rel.confidence,
        rationale: rel.rationale,
      },
      market:
        rel.marketIId === dbMarketId
          ? rel.marketJ
          : rel.marketI,
    }));

    return NextResponse.json(
      {
        baseMarket: market,
        similarMarkets,
        totalCount: similarMarkets.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/markets/:id/similar error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch similar markets" },
      { status: 500 }
    );
  }
}
