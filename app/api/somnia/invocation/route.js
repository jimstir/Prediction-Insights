import { NextResponse } from "next/server";
import { getPrisma } from "../../../lib/prisma";
import { updateMarketSimilarities } from "../../../lib/somnia/similarity";

/**
 * POST /api/somnia/invocation
 * Saves Somnia LLM invocation data to database
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { address, requestId, transactionHash, response, receipts, recommendationCount } = body;

    if (!address || !requestId || !transactionHash) {
      return NextResponse.json(
        { error: "Missing required fields: address, requestId, transactionHash" },
        { status: 400 }
      );
    }

    const prisma = getPrisma();
    const normalizedAddress = address.toLowerCase();

    // Find or create Wallet by address first
    let wallet = await prisma.wallet.findUnique({
      where: { address: normalizedAddress },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { address: normalizedAddress },
      });
    }

    // Check if preference exists using the Wallet's UUID
    let preference = await prisma.preference.findUnique({
      where: { walletId: wallet.id },
    });

    // Create preference if it doesn't exist
    if (!preference) {
      preference = await prisma.preference.create({
        data: {
          walletId: wallet.id,
        },
      });
    }

    // Parse recommended markets from LLM response
    let parsedRecommendations = [];
    if (typeof response === "string") {
      try {
        const parsed = JSON.parse(response);
        parsedRecommendations = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.warn("Could not parse LLM response as JSON in invocation API", e.message);
      }
    } else if (Array.isArray(response)) {
      parsedRecommendations = response;
    }

    // Seed recommended markets in the Market database table and calculate similarities
    const seededMarkets = [];
    for (const rec of parsedRecommendations) {
      const kalshiId = rec.eventTicker || rec.kalshiId;
      if (!kalshiId) continue;
      
      try {
        const market = await prisma.market.upsert({
          where: { kalshiId },
          update: {
            title: rec.title || kalshiId,
            category: rec.category || "uncategorized",
          },
          create: {
            kalshiId,
            title: rec.title || kalshiId,
            category: rec.category || "uncategorized",
            marketType: rec.marketType || "binary",
            timeHorizonDays: rec.timeHorizonDays || 30,
            resolutionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: rec.status || "open",
          },
        });
        
        seededMarkets.push(market);
      } catch (err) {
        console.error(`Failed to upsert recommended market ${kalshiId}:`, err.message);
      }
    }

    // Run similarity matching in the background
    if (seededMarkets.length > 0) {
      Promise.all(
        seededMarkets.map((m) => updateMarketSimilarities(m))
      ).catch((err) => console.error("Failed to run similar market updates in background:", err));
    }

    // Create or update Somnia invocation record using the Wallet's UUID
    const invocation = await prisma.somniaInvocation.upsert({
      where: { requestId },
      update: {
        transactionHash,
        response,
        receipts,
        recommendationCount,
        status: "completed",
        updatedAt: new Date(),
      },
      create: {
        walletId: wallet.id,
        requestId,
        transactionHash,
        response,
        receipts,
        recommendationCount,
        status: "completed",
      },
    });

    return NextResponse.json({
      success: true,
      invocationId: invocation.id,
      requestId: invocation.requestId,
    });
  } catch (error) {
    console.error("Error saving Somnia invocation:", error);
    return NextResponse.json(
      { error: "Failed to save invocation", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/somnia/invocation
 * Retrieves Somnia invocations for a wallet
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Missing required parameter: address" },
        { status: 400 }
      );
    }

    const prisma = getPrisma();

    const wallet = await prisma.wallet.findUnique({
      where: { address: address.toLowerCase() },
    });

    if (!wallet) {
      return NextResponse.json({
        success: true,
        invocations: [],
        count: 0,
      });
    }

    const invocations = await prisma.somniaInvocation.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: 50, // Limit to last 50 invocations
    });

    return NextResponse.json({
      success: true,
      invocations,
      count: invocations.length,
    });
  } catch (error) {
    console.error("Error retrieving Somnia invocations:", error);
    return NextResponse.json(
      { error: "Failed to retrieve invocations", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/somnia/invocation
 * Deletes all Somnia invocations for a wallet
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Missing required parameter: address" },
        { status: 400 }
      );
    }

    const prisma = getPrisma();

    const wallet = await prisma.wallet.findUnique({
      where: { address: address.toLowerCase() },
    });

    if (!wallet) {
      return NextResponse.json({
        success: true,
        count: 0,
      });
    }

    const deleteResult = await prisma.somniaInvocation.deleteMany({
      where: { walletId: wallet.id },
    });

    return NextResponse.json({
      success: true,
      count: deleteResult.count,
    });
  } catch (error) {
    console.error("Error deleting Somnia invocations:", error);
    return NextResponse.json(
      { error: "Failed to delete invocations", message: error.message },
      { status: 500 }
    );
  }
}
