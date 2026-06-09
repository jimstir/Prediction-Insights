/**
 * Kalshi Portfolio Positions API Proxy
 * Handles authentication and proxies requests to Kalshi external API
 * GET /api/kalshi/positions?limit=100
 */

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 200);

  if (limit < 1 || limit > 200) {
    return new Response(
      JSON.stringify({ error: "Limit must be between 1 and 200" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Get Kalshi credentials from environment variables
    const apiKey = process.env.KALSHI_ACCESS_KEY;
    const apiSignature = process.env.KALSHI_ACCESS_SIGNATURE;
    const apiTimestamp = process.env.KALSHI_ACCESS_TIMESTAMP;

    if (!apiKey || !apiSignature) {
      console.error("Kalshi API credentials not configured");
      return new Response(
        JSON.stringify({
          error: "API credentials not configured",
          positions: []
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();

    // Call Kalshi API
    const response = await fetch(
      `https://external-api.kalshi.com/trade-api/v2/portfolio/positions?limit=${limit}`,
      {
        method: "GET",
        headers: {
          "KALSHI-ACCESS-KEY": apiKey,
          "KALSHI-ACCESS-SIGNATURE": apiSignature,
          "KALSHI-ACCESS-TIMESTAMP": timestamp,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Kalshi API error:", response.status, errorText);

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After") || "60";
        return new Response(
          JSON.stringify({
            error: "Rate limited. Try again later.",
            positions: [],
            retryAfter: parseInt(retryAfter),
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": retryAfter,
            },
          }
        );
      }

      throw new Error(`Kalshi API returned ${response.status}`);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({
        positions: data.positions || [],
        totalCount: data.positions?.length || 0,
        limit,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching Kalshi positions:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to fetch positions",
        positions: [],
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
