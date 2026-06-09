import { NextResponse } from "next/server";
import { fetchKalshiCandidateEvents } from "../../../lib/kalshi";

export const runtime = "nodejs";

/**
 * GET /api/insights/candidates
 *
 * Fetches candidate events from Kalshi API for recommendation processing.
 * Returns normalized events ready to be sent to LLM along with user preferences.
 *
 * Query Parameters:
 *   - limit (optional): Number of events to fetch (1-200, default: 200)
 */
export async function GET(request) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get("limit");

    // Validate limit if provided
    const options = {};
    if (limit !== null) {
      const parsedLimit = parseInt(limit, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 200) {
        return NextResponse.json(
          {
            error: "Invalid limit parameter. Must be a number between 1 and 200.",
          },
          { status: 400 }
        );
      }
      options.limit = parsedLimit;
    }

    // Fetch candidate events from Kalshi
    const candidateResponse = await fetchKalshiCandidateEvents(options);

    // Return normalized candidate events
    return NextResponse.json(candidateResponse, { status: 200 });
  } catch (error) {
    // Log error for debugging
    console.error("GET /api/insights/candidates error:", error);

    // Return appropriate error response
    const statusCode = error.message.includes("Rate limit")
      ? 429
      : error.message.includes("Network error")
      ? 503
      : error.message.includes("timeout")
      ? 504
      : 500;

    return NextResponse.json(
      {
        error: error.message || "Failed to fetch candidate events from Kalshi",
        timestamp: new Date().toISOString(),
      },
      { status: statusCode }
    );
  }
}
