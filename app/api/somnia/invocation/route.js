import { NextResponse } from "next/server";
import { getPrisma } from "../../../lib/prisma";

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

    // Check if preference exists for this wallet
    let preference = await prisma.preference.findUnique({
      where: { walletId: address },
    });

    // Create preference if it doesn't exist
    if (!preference) {
      preference = await prisma.preference.create({
        data: {
          walletId: address,
        },
      });
    }

    // Create or update Somnia invocation record
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
        walletId: address,
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

    const invocations = await prisma.somniaInvocation.findMany({
      where: { walletId: address },
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
