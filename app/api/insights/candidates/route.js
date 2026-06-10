import { NextResponse } from "next/server";
import { fetchKalshiCandidateEvents } from "../../../lib/kalshi";
import { getPrisma } from "../../../lib/prisma";
import { generateOpenAIEmbedding, calculateCosineSimilarity, ensureMarketEmbedding } from "../../../lib/somnia/similarity";

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
    const cursor = searchParams.get("cursor");

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
    if (cursor) {
      options.cursor = cursor;
    }

    // Fetch candidate events from Kalshi
    const candidateResponse = await fetchKalshiCandidateEvents(options);

    // Enrich candidate events with similar markets from the database using OpenAI embeddings
    if (process.env.OPENAI_API_KEY && candidateResponse.events.length > 0) {
      try {
        const prisma = getPrisma();

        // Fetch all markets from database to ensure similarity check is complete
        const dbMarkets = await prisma.market.findMany();

        // Parse and ensure they all have embeddings
        const dbMarketsWithVectors = [];
        for (const m of dbMarkets) {
          const vector = await ensureMarketEmbedding(m, prisma);
          if (vector) {
            dbMarketsWithVectors.push({ ...m, vector });
          }
        }

        if (dbMarketsWithVectors.length > 0) {
          // Enrich each candidate event
          for (const event of candidateResponse.events) {
            try {
              const textToEmbed = `${event.title} ${event.subtitle || ""}`.trim();
              const eventVector = await generateOpenAIEmbedding(textToEmbed);
              
              const matches = [];
              for (const dbMarket of dbMarketsWithVectors) {
                const score = calculateCosineSimilarity(eventVector, dbMarket.vector);
                if (score >= 0.4) {
                  matches.push({
                    id: dbMarket.id,
                    kalshiId: dbMarket.kalshiId,
                    title: dbMarket.title,
                    category: dbMarket.category,
                    confidence: score,
                  });
                }
              }

              // Sort matches by confidence and take top 3
              matches.sort((a, b) => b.confidence - a.confidence);
              event.similar_markets = matches.slice(0, 3);

              // Preemptively save the candidate as a Market and record its similarities
              if (event.similar_markets.length > 0) {
                const targetMarket = await prisma.market.upsert({
                  where: { kalshiId: event.eventTicker },
                  update: {
                    embedding: eventVector,
                  },
                  create: {
                    kalshiId: event.eventTicker,
                    title: event.title,
                    category: event.category || "uncategorized",
                    marketType: "binary",
                    timeHorizonDays: 30,
                    resolutionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    status: event.status || "open",
                    embedding: eventVector,
                  },
                });

                for (const match of event.similar_markets) {
                  const [marketIId, marketJId] = targetMarket.id < match.id
                    ? [targetMarket.id, match.id]
                    : [match.id, targetMarket.id];

                  const isSameOutcome = match.confidence >= 0.75;
                  const rationale = `Strong semantic correlation (${Math.round(match.confidence * 100)}% match) between their trading topics: "${event.title}" and "${match.title}".`;

                  await prisma.similarMarket.upsert({
                    where: {
                      marketIId_marketJId: {
                        marketIId,
                        marketJId,
                      },
                    },
                    update: {
                      confidence: match.confidence,
                      isSameOutcome,
                      rationale,
                      updatedAt: new Date(),
                    },
                    create: {
                      marketIId,
                      marketJId,
                      confidence: match.confidence,
                      isSameOutcome,
                      rationale,
                    },
                  });
                }
              }
            } catch (err) {
              console.warn(`Failed to enrich candidate ${event.eventTicker} with similar markets:`, err.message);
              event.similar_markets = [];
            }
          }
        }
      } catch (dbErr) {
        console.warn("Could not retrieve similar markets from database for candidate enrichment:", dbErr.message);
      }
    }

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
