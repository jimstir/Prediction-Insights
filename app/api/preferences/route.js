import { NextResponse } from "next/server";
import {
  getPrisma,
  isDatabaseConfigured,
  isDatabaseUnreachable,
} from "../../lib/prisma";
import {
  normalizeWalletAddress,
  preferenceFieldsFromRecord,
  sanitizePreferencePayload,
} from "../../lib/preferences";

export const runtime = "nodejs";

function emptyPreferencesResponse(warning, status = 200) {
  return NextResponse.json(
    {
      preferences: preferenceFieldsFromRecord(null),
      configured: false,
      warning,
    },
    { status }
  );
}

export async function GET(request) {
  if (!isDatabaseConfigured()) {
    return emptyPreferencesResponse(
      "Database is not configured. Preferences will use defaults until DATABASE_URL is set."
    );
  }

  const address = normalizeWalletAddress(
    request.nextUrl.searchParams.get("address")
  );

  if (!address) {
    return NextResponse.json(
      { error: "A valid wallet address is required" },
      { status: 400 }
    );
  }

  try {
    const prisma = getPrisma();

    const wallet = await prisma.wallet.findUnique({
      where: { address },
      include: { preferences: true },
    });

    return NextResponse.json({
      preferences: preferenceFieldsFromRecord(wallet?.preferences),
      configured: true,
    });
  } catch (error) {
    console.error("GET /api/preferences error:", error);

    if (isDatabaseUnreachable(error)) {
      return emptyPreferencesResponse(
        "Database is unreachable. Start Postgres or check DATABASE_URL."
      );
    }

    return NextResponse.json(
      { error: "Failed to load preferences" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  if (!isDatabaseConfigured()) {
    return emptyPreferencesResponse(
      "Database is not configured. Add DATABASE_URL to save preferences.",
      503
    );
  }

  try {
    const prisma = getPrisma();
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
      configured: true,
    });
  } catch (error) {
    console.error("PUT /api/preferences error:", error);

    if (isDatabaseUnreachable(error)) {
      return NextResponse.json(
        {
          error:
            "Database is unreachable. Start Postgres or check DATABASE_URL.",
          configured: false,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 }
    );
  }
}
