import { NextResponse } from "next/server";
import prisma from "../../lib/prisma";
import {
  normalizeWalletAddress,
  preferenceFieldsFromRecord,
  sanitizePreferencePayload,
} from "../../lib/preferences";

export async function GET(request) {
  try {
    const address = normalizeWalletAddress(
      request.nextUrl.searchParams.get("address")
    );

    if (!address) {
      return NextResponse.json(
        { error: "A valid wallet address is required" },
        { status: 400 }
      );
    }

    const wallet = await prisma.wallet.findUnique({
      where: { address },
      include: { preferences: true },
    });

    return NextResponse.json({
      preferences: preferenceFieldsFromRecord(wallet?.preferences),
    });
  } catch (error) {
    console.error("GET /api/preferences error:", error);
    return NextResponse.json(
      { error: "Failed to load preferences" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const address = normalizeWalletAddress(body?.address);

    if (!address) {
      return NextResponse.json(
        { error: "A valid wallet address is required" },
        { status: 400 }
      );
    }

    const preferenceData = sanitizePreferencePayload(body);

    const wallet = await prisma.wallet.upsert({
      where: { address },
      create: { address },
      update: {},
    });

    const preferences = await prisma.preference.upsert({
      where: { walletId: wallet.id },
      create: {
        walletId: wallet.id,
        ...preferenceData,
      },
      update: preferenceData,
    });

    return NextResponse.json({
      preferences: preferenceFieldsFromRecord(preferences),
    });
  } catch (error) {
    console.error("PUT /api/preferences error:", error);
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 }
    );
  }
}
