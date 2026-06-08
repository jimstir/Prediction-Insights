import { NextResponse } from "next/server";
import { getPrisma } from "../../../lib/prisma";
import { normalizeWalletAddress } from "../../../lib/preferences";

export const runtime = "nodejs";

/**
 * POST /api/markets/favorite
 *
 * Add or remove a market from user's favorites
 *
 * Request body:
 * {
 *   "address": "0x...",
 *   "marketId": "market-uuid",
 *   "action": "add" | "remove"
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
    const { address, marketId, action } = body;

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

    if (action !== "add" && action !== "remove") {
      return NextResponse.json(
        { error: "Action must be 'add' or 'remove'" },
        { status: 400 }
      );
    }

    // Ensure wallet exists
    const wallet = await prisma.wallet.upsert({
      where: { address: normalizedAddress },
      create: { address: normalizedAddress },
      update: {},
      include: { preferences: true },
    });

    if (!wallet.preferences) {
      await prisma.preference.create({
        data: { walletId: wallet.id },
      });
    }

    // Ensure market exists
    const market = await prisma.market.findUnique({
      where: { id: marketId },
    });

    if (!market) {
      return NextResponse.json(
        { error: "Market not found" },
        { status: 404 }
      );
    }

    // Handle add/remove
    if (action === "add") {
      // Create favorite (upsert to avoid error if already exists)
      await prisma.marketFavorite.upsert({
        where: {
          walletId_marketId: {
            walletId: wallet.preferences.walletId,
            marketId,
          },
        },
        create: {
          walletId: wallet.preferences.walletId,
          marketId,
        },
        update: {
          addedAt: new Date(),
        },
      });

      return NextResponse.json(
        { success: true, action: "added", marketId },
        { status: 200 }
      );
    } else {
      // Remove favorite
      await prisma.marketFavorite.deleteMany({
        where: {
          walletId: wallet.preferences.walletId,
          marketId,
        },
      });

      return NextResponse.json(
        { success: true, action: "removed", marketId },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("POST /api/markets/favorite error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update favorite" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/markets/favorites
 *
 * Get user's favorite markets
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

    // Get user's favorite markets
    const preference = await prisma.preference.findUnique({
      where: { wallet: { address: normalizedAddress } },
      include: {
        favorites: {
          include: { market: true },
          orderBy: { addedAt: "desc" },
        },
      },
    });

    if (!preference) {
      return NextResponse.json(
        { favorites: [], totalCount: 0 },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        favorites: preference.favorites.map((fav) => ({
          id: fav.id,
          marketId: fav.marketId,
          market: fav.market,
          addedAt: fav.addedAt,
        })),
        totalCount: preference.favorites.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/markets/favorites error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch favorites" },
      { status: 500 }
    );
  }
}
