import { OpenAI } from "openai";
import { getPrisma } from "../prisma";

// Initialize OpenAI client conditionally
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * Generate vector embedding using OpenAI text-embedding-3-small
 * @param {string} text Input text
 * @returns {Promise<number[]>} Array of floats representing the embedding vector
 */
export async function generateOpenAIEmbedding(text) {
  if (!openai) {
    throw new Error("OpenAI client is not initialized (missing API key)");
  }

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  if (!response.data || response.data.length === 0) {
    throw new Error("Failed to generate embedding from OpenAI");
  }

  return response.data[0].embedding;
}

/**
 * Calculates the cosine similarity between two numeric vectors
 * @param {number[]} vecA First vector
 * @param {number[]} vecB Second vector
 * @returns {number} Cosine similarity score (between -1 and 1)
 */
export function calculateCosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Ensures a market has an embedding in the database.
 * If not present, generates it via OpenAI and saves it.
 * @param {Object} market Prisma Market record
 * @param {Object} prisma Prisma client instance
 * @returns {Promise<number[]|null>} Vector embedding or null if failed
 */
export async function ensureMarketEmbedding(market, prisma) {
  if (market.embedding) {
    try {
      const parsed = typeof market.embedding === "string"
        ? JSON.parse(market.embedding)
        : market.embedding;
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.warn("Failed to parse existing embedding for market:", market.id);
    }
  }

  try {
    const textToEmbed = `${market.title} ${market.subtitle || ""}`.trim();
    console.log(`Generating OpenAI embedding for market: "${market.title}"`);
    const vector = await generateOpenAIEmbedding(textToEmbed);
    
    await prisma.market.update({
      where: { id: market.id },
      data: { embedding: vector },
    });
    
    return vector;
  } catch (err) {
    console.error(`Failed to ensure embedding for market ${market.id}:`, err.message);
    return null;
  }
}

/**
 * Computes semantic similarity between a newly added market and all other markets in the database,
 * and inserts matching relations into the SimilarMarket table.
 * @param {Object} targetMarket The newly saved Market object
 * @param {number} [threshold=0.4] Minimum similarity score to record relationship
 */
export async function updateMarketSimilarities(targetMarket, threshold = 0.4) {
  if (!openai) {
    console.warn("Skipping similarity calculations: OPENAI_API_KEY is not defined");
    return;
  }

  const prisma = getPrisma();
  
  try {
    // 1. Ensure target market has embedding
    const targetVector = await ensureMarketEmbedding(targetMarket, prisma);
    if (!targetVector) {
      console.warn("Skipping similarity calculations: Target market embedding unavailable");
      return;
    }

    // 2. Fetch all other markets
    const otherMarkets = await prisma.market.findMany({
      where: {
        id: { not: targetMarket.id },
      },
    });

    console.log(`Comparing "${targetMarket.title}" with ${otherMarkets.length} other markets...`);

    // 3. Compare with each other market
    for (const other of otherMarkets) {
      const otherVector = await ensureMarketEmbedding(other, prisma);
      if (!otherVector) continue;

      const score = calculateCosineSimilarity(targetVector, otherVector);
      
      if (score >= threshold) {
        console.log(`Match found! "${targetMarket.title}" <=> "${other.title}" (Score: ${score.toFixed(3)})`);
        
        // Ensure consistent ordering to avoid duplicate pairs in opposite directions
        const [marketIId, marketJId] = targetMarket.id < other.id 
          ? [targetMarket.id, other.id] 
          : [other.id, targetMarket.id];

        // Determine if they are likely targeting the same general outcome (high similarity)
        const isSameOutcome = score >= 0.75;
        const rationale = `Strong semantic correlation (${Math.round(score * 100)}% match) between their trading topics: "${targetMarket.title}" and "${other.title}".`;

        await prisma.similarMarket.upsert({
          where: {
            marketIId_marketJId: {
              marketIId,
              marketJId,
            },
          },
          update: {
            confidence: score,
            isSameOutcome,
            rationale,
            updatedAt: new Date(),
          },
          create: {
            marketIId,
            marketJId,
            confidence: score,
            isSameOutcome,
            rationale,
          },
        });
      }
    }
  } catch (error) {
    console.error("Error updating market similarities:", error);
  }
}
