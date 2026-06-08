/**
 * Profile Scoring Module
 *
 * Calculates three profile scores based on user engagement:
 * - interest_score: User's interest level in a market/topic
 * - engagement_score: How engaged the user is with markets
 * - skill_score: User's trading performance and timing quality
 */

/**
 * Calculate interest score based on user interactions
 *
 * interest_score = 0.1 * click_rate + 0.4 * watchlist_rate + 0.5 * trade_rate
 *
 * @param {Object} engagement - User engagement metrics
 * @param {number} engagement.clickCount - Number of clicks/views
 * @param {boolean} engagement.isWatchlisted - Whether market is watchlisted
 * @param {number} engagement.tradeExposure - Amount of money/shares at stake
 * @param {Object} context - Context for normalization
 * @param {number} [context.maxClicks=100] - Max clicks for normalization
 * @param {number} [context.maxExposure=10000] - Max trade exposure for normalization
 * @returns {number} Interest score (0-1)
 */
export function calculateInterestScore(engagement, context = {}) {
  const { maxClicks = 100, maxExposure = 10000 } = context;

  // Normalize metrics to 0-1 range
  const clickRate = Math.min(engagement.clickCount / maxClicks, 1.0);
  const watchlistRate = engagement.isWatchlisted ? 1.0 : 0.0;
  const tradeRate = Math.min(engagement.tradeExposure / maxExposure, 1.0);

  // Weighted calculation
  const interestScore =
    0.1 * clickRate +
    0.4 * watchlistRate +
    0.5 * tradeRate;

  return Math.min(interestScore, 1.0);
}

/**
 * Calculate engagement score based on time and interaction patterns
 *
 * engagement_score = 0.3 * avg_time_spent + 0.3 * repeat_visits + 0.2 * watchlist_additions
 *
 * @param {Object} engagement - User engagement metrics
 * @param {number} engagement.timeSpentMs - Total time spent viewing (milliseconds)
 * @param {number} engagement.clickCount - Number of repeat visits
 * @param {boolean} engagement.isWatchlisted - Whether market is in watchlist
 * @param {Object} context - Context for normalization
 * @param {number} [context.avgTimeSpentMs=60000] - Expected avg time (60s)
 * @param {number} [context.expectedRepeatVisits=5] - Expected repeat visits
 * @returns {number} Engagement score (0-1)
 */
export function calculateEngagementScore(engagement, context = {}) {
  const { avgTimeSpentMs = 60000, expectedRepeatVisits = 5 } = context;

  // Average time spent (spread over clicks, if any)
  const totalClicks = Math.max(engagement.clickCount, 1);
  const avgTimePerClick = engagement.timeSpentMs / totalClicks;
  const avgTimeSpentNorm = Math.min(avgTimePerClick / avgTimeSpentMs, 1.0);

  // Repeat visits (normalized)
  const repeatVisitsNorm = Math.min(totalClicks / expectedRepeatVisits, 1.0);

  // Watchlist addition (binary)
  const watchlistNorm = engagement.isWatchlisted ? 1.0 : 0.0;

  // Weighted calculation
  const engagementScore =
    0.3 * avgTimeSpentNorm +
    0.3 * repeatVisitsNorm +
    0.2 * watchlistNorm;

  return Math.min(engagementScore, 1.0);
}

/**
 * Calculate skill score based on trading performance
 *
 * skill_score = 0.4 * calibration + 0.3 * roi + 0.2 * timing_quality + 0.1 * consistency
 *
 * @param {Object} performance - User trading performance
 * @param {number} performance.wins - Number of winning trades
 * @param {number} performance.losses - Number of losing trades
 * @param {number} performance.roi - Return on investment (as decimal, e.g., 0.15 = 15%)
 * @param {number} performance.timingQuality - 0-1 score for entry/exit timing
 * @param {number} performance.consistency - 0-1 score for win-rate consistency
 * @returns {number} Skill score (0-1)
 */
export function calculateSkillScore(performance = {}) {
  const {
    wins = 0,
    losses = 0,
    roi = 0,
    timingQuality = 0.5,
    consistency = 0.5,
  } = performance;

  // Calibration: win rate (perfect calibration = 0.5 for 50/50 predictions)
  const totalTrades = wins + losses;
  let calibration = 0;
  if (totalTrades > 0) {
    const winRate = wins / totalTrades;
    // Score based on how well-calibrated the predictions are
    // 0.5 win rate on 50/50 markets = perfect calibration
    calibration = Math.abs(0.5 - Math.abs(winRate - 0.5));
    // Penalize if no trades
    if (totalTrades < 3) {
      calibration *= totalTrades / 3; // Scale down with fewer trades
    }
  }

  // ROI: normalized to 0-1 (assume -100% to +100% is normal range)
  const roiNorm = Math.min(Math.max((roi + 1.0) / 2.0, 0), 1.0);

  // Timing quality: provided by caller (typically 0.5 = average)
  const timingQualityNorm = Math.min(Math.max(timingQuality, 0), 1.0);

  // Consistency: provided by caller (0-1 scale)
  const consistencyNorm = Math.min(Math.max(consistency, 0), 1.0);

  // Weighted calculation
  const skillScore =
    0.4 * calibration +
    0.3 * roiNorm +
    0.2 * timingQualityNorm +
    0.1 * consistencyNorm;

  return Math.min(skillScore, 1.0);
}

/**
 * Calculate confidence score for a topic
 *
 * confidence = min(1.0, log(total_markets_in_category + 1) / 5)
 *
 * @param {number} marketCount - Number of markets user has interacted with in category
 * @returns {number} Confidence score (0-1)
 */
export function calculateConfidenceScore(marketCount) {
  const confidence = Math.min(1.0, Math.log(marketCount + 1) / 5);
  return confidence;
}

/**
 * Update inferred interests for a topic based on engagement
 *
 * Combines new scores with historical scores (20% new, 80% history)
 *
 * @param {Object} currentScores - Current calculated scores
 * @param {number} currentScores.interestScore - Interest score (0-1)
 * @param {number} currentScores.engagementScore - Engagement score (0-1)
 * @param {number} currentScores.skillScore - Skill score (0-1)
 * @param {Object} historicalScores - Previous inferred interest scores
 * @param {number} [historicalScores.interest_score=0] - Previous interest score
 * @param {number} [historicalScores.engagement_score=0] - Previous engagement score
 * @param {number} [historicalScores.skill_score=0] - Previous skill score
 * @returns {Object} Updated inferred interest scores
 */
export function updateInferredInterestScores(currentScores, historicalScores = {}) {
  const NEW_WEIGHT = 0.2; // 20% weight to new scores
  const HISTORY_WEIGHT = 0.8; // 80% weight to historical scores

  return {
    interest_score:
      NEW_WEIGHT * currentScores.interestScore +
      HISTORY_WEIGHT * (historicalScores.interest_score ?? 0),

    engagement_score:
      NEW_WEIGHT * currentScores.engagementScore +
      HISTORY_WEIGHT * (historicalScores.engagement_score ?? 0),

    skill_score:
      NEW_WEIGHT * currentScores.skillScore +
      HISTORY_WEIGHT * (historicalScores.skill_score ?? 0),
  };
}

/**
 * Calculate all profile scores for a user's interaction with a market
 *
 * @param {Object} engagement - User engagement data
 * @param {Object} performance - User performance data
 * @param {Object} historical - Historical scores for the topic
 * @param {Object} context - Calculation context
 * @returns {Object} Complete profile scores
 */
export function calculateProfileScores(
  engagement = {},
  performance = {},
  historical = {},
  context = {}
) {
  // Calculate individual scores
  const interestScore = calculateInterestScore(engagement, context);
  const engagementScore = calculateEngagementScore(engagement, context);
  const skillScore = calculateSkillScore(performance);

  // Update inferred interests (blend with history)
  const updatedScores = updateInferredInterestScores(
    {
      interestScore,
      engagementScore,
      skillScore,
    },
    historical
  );

  // Calculate confidence
  const confidence = calculateConfidenceScore(performance.totalMarkets ?? 1);

  return {
    interest_score: updatedScores.interest_score,
    engagement_score: updatedScores.engagement_score,
    skill_score: updatedScores.skill_score,
    confidence,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Aggregate topic scores into a single inferred interests object
 *
 * @param {Array} topicScores - Array of topic score objects
 * @returns {Object} Aggregated inferred interests by topic
 */
export function aggregateInferredInterests(topicScores = []) {
  const inferred = {};

  topicScores.forEach((entry) => {
    if (entry.topic) {
      inferred[entry.topic] = {
        interest_score: entry.interest_score ?? 0,
        engagement_score: entry.engagement_score ?? 0,
        skill_score: entry.skill_score ?? 0,
        confidence: entry.confidence ?? 0,
      };
    }
  });

  return inferred;
}
