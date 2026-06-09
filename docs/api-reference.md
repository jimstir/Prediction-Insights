# Market Schema and Profile Scoring Implementation

## Overview

This document describes the implementation of:

1. **Market Schema** - Structured data for prediction markets with similarity matching
2. **Profile Scoring** - User profiling based on interest, engagement, and skill metrics
3. **Similar Markets Modal** - UI for discovering related markets
4. **Market Interactions** - Favorites, engagement tracking, and viewing

## Database Schema Updates

### New Models

#### Market

Stores prediction market data from Kalshi API:

```javascript
{
  id: String,                    // UUID
  kalshiId: String,             // Kalshi ticker (e.g., "BTCUSD-250630")
  title: String,                 // Market question
  subtitle: String,              // Optional market description
  category: String,              // Category (Tech, Politics, Finance, etc.)
  subCategories: String,         // Comma-separated subcategories
  marketType: String,            // binary, scalar, sports, multi-outcome
  timeHorizonDays: Int,          // Days until resolution
  resolutionDate: DateTime,      // When market resolves
  resolutionType: String,        // event-based or time-based
  difficulty: Float,             // 0-1 complexity score
  volatility: Float,             // 0-1 volatility score
  liquidity: Float,              // 0-1 liquidity score
  embedding: Json,               // Vector embedding [0.028, -0.194, ...]
  status: String,                // open, closed, resolved
  kalshiUrl: String,             // Direct link to market
}
```

#### SimilarMarket

Links markets with similar outcomes:

```javascript
{
  marketIId: String,             // First market ID
  marketJId: String,             // Second market ID (linked to first)
  isSameOutcome: Boolean,        // Whether they have identical outcomes
  confidence: Float,             // 0-1 confidence score
  rationale: String,             // Why they're similar
}
```

#### MarketFavorite

Tracks user's favorite markets:

```javascript
{
  walletId: String,
  marketId: String,
  addedAt: DateTime,
}
```

#### UserEngagement

Tracks user interactions with markets:

```javascript
{
  walletId: String,
  marketId: String,
  clickCount: Int,               // Number of times viewed
  timeSpentMs: Int,              // Total time viewing (milliseconds)
  isWatchlisted: Boolean,        // Added to watchlist
  tradeExposure: Float,          // Amount at stake
  interactionType: String,       // view, click, watchlist, trade
  firstInteraction: DateTime,
  lastInteraction: DateTime,
}
```

### Updated Preference Model

Enhanced with profile scoring:

```javascript
{
  // ... existing fields ...
  inferredInterests: Json,       // { "tech": { interest_score, engagement_score, skill_score } }
  marketSettings: Json,          // User's market preferences
  wins: Int,                     // Markets won
  losses: Int,                   // Markets lost
  popularMarkets: String,        // Comma-separated popular categories
  lastScoringUpdate: DateTime,
}
```

## Profile Scoring System

### Three Core Scores

#### 1. Interest Score

Measures user's assumed interest in a market based on interactions.

**Formula:**

```txt
interest_score = 0.1 * click_rate + 0.4 * watchlist_rate + 0.5 * trade_rate
```

**Components:**

- `click_rate` (10%): How many times user viewed the market
- `watchlist_rate` (40%): Whether market is bookmarked
- `trade_rate` (50%): Amount of exposure if user placed a bet

**Range:** 0-1 (0 = no interest, 1 = high interest)

#### 2. Engagement Score

Measures how engaged the user is with markets.

**Formula:**

```txt
engagement_score = 0.3 * avg_time_spent + 0.3 * repeat_visits + 0.2 * watchlist_additions
```

**Components:**

- `avg_time_spent` (30%): Average time spent per view session
- `repeat_visits` (30%): Number of times user revisited the market
- `watchlist_additions` (20%): Whether market was watchlisted

**Range:** 0-1 (0 = no engagement, 1 = high engagement)

#### 3. Skill Score

Measures user's trading performance and calibration.

**Formula:**

```txt
skill_score = 0.4 * calibration + 0.3 * roi + 0.2 * timing_quality + 0.1 * consistency
```

**Components:**

- `calibration` (40%): How well-calibrated predictions are (50% win rate on 50/50 markets = perfect)
- `roi` (30%): Return on investment
- `timing_quality` (20%): Quality of entry/exit timing
- `consistency` (10%): Win-rate consistency over time

**Range:** 0-1 (0 = no skill, 1 = expert level)

### Score Calculation

#### Per-Topic Scoring

Scores are calculated per topic (e.g., "crypto", "politics", "macro"):

```javascript
// From profile scoring utility
const scores = calculateProfileScores(
  engagement,           // User's interactions with a market
  performance,          // Trading results
  historical,           // Previous scores for the topic
  context               // Normalization context
);

// Returns:
{
  interest_score: 0.75,
  engagement_score: 0.62,
  skill_score: 0.58,
  confidence: 0.85,
  timestamp: "2026-06-07T15:30:00Z"
}
```

#### Historical Blending

New scores are blended with historical scores to smooth updates:

```txt
updated_score = 0.2 * new_score + 0.8 * historical_score
```

(20% weight to new data, 80% to history)

#### Confidence Score

Calculated from number of interactions:

```txt
confidence = min(1.0, log(market_count + 1) / 5)
```

- More interactions = higher confidence in the score

## API Endpoints

### 1. Market Favorites

#### POST /api/markets/favorite

Add or remove a market from favorites.

**Request:**

```json
{
  "address": "0x...",
  "marketId": "market-uuid",
  "action": "add" | "remove"
}
```

**Response:**

```json
{
  "success": true,
  "action": "added",
  "marketId": "market-uuid"
}
```

#### GET /api/markets/favorites

Get user's favorite markets.

**Query Params:**

- `address`: Wallet address

**Response:**

```json
{
  "favorites": [
    {
      "id": "fav-uuid",
      "marketId": "market-uuid",
      "market": { ...market object... },
      "addedAt": "2026-06-07T15:30:00Z"
    }
  ],
  "totalCount": 5
}
```

### 2. Profile Scoring

#### PUT /api/profile/scores

Update user's inferred interest scores.

**Request:**

```json
{
  "address": "0x...",
  "scoreUpdates": [
    {
      "topic": "crypto",
      "engagement": {
        "clickCount": 5,
        "isWatchlisted": true,
        "tradeExposure": 100
      },
      "performance": {
        "wins": 3,
        "losses": 1,
        "roi": 0.15,
        "timingQuality": 0.7,
        "consistency": 0.8
      }
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "inferred_interests": {
    "crypto": {
      "interest_score": 0.72,
      "engagement_score": 0.68,
      "skill_score": 0.64,
      "confidence": 0.78
    }
  },
  "updated_topics": ["crypto"],
  "lastScoringUpdate": "2026-06-07T15:30:00Z"
}
```

#### GET /api/profile/scores

Get user's current profile scores.

**Query Params:**

- `address`: Wallet address

**Response:**

```json
{
  "inferred_interests": {
    "tech": { ...scores... },
    "politics": { ...scores... }
  },
  "performance": {
    "wins": 12,
    "losses": 8
  },
  "lastScoringUpdate": "2026-06-07T15:30:00Z"
}
```

### 3. Similar Markets

#### GET /api/markets/:id/similar

Get markets similar to the specified market.

**Query Params:**

- `limit`: Max similar markets to return (1-100, default: 10)

**Response:**

```json
{
  "baseMarket": { ...market object... },
  "similarMarkets": [
    {
      "relation": {
        "id": "similar-id",
        "isSameOutcome": true,
        "confidence": 0.92,
        "rationale": "Both markets track Bitcoin price at same threshold"
      },
      "market": { ...market object... }
    }
  ],
  "totalCount": 3
}
```

### 4. Engagement Tracking

#### POST /api/engagement/track

Track user's engagement with a market.

**Request:**

```json
{
  "address": "0x...",
  "marketId": "market-uuid",
  "interactionType": "view|click|watchlist|trade",
  "clickCount": 1,
  "timeSpentMs": 5000,
  "isWatchlisted": false,
  "tradeExposure": 0
}
```

**Response:**

```json
{
  "success": true,
  "engagement": {
    "id": "engagement-uuid",
    "marketId": "market-uuid",
    "clickCount": 1,
    "timeSpentMs": 5000,
    "isWatchlisted": false,
    "tradeExposure": 0,
    "lastInteraction": "2026-06-07T15:30:00Z"
  }
}
```

#### GET /api/engagement/summary

Get user's engagement summary.

**Query Params:**

- `address`: Wallet address
- `marketId` (optional): Specific market

**Response:**

```json
{
  "summary": {
    "totalEngagements": 15,
    "totalClicks": 45,
    "totalTimeSpentMs": 180000,
    "totalTimeSpentSeconds": 180,
    "watchlistedCount": 8,
    "totalExposure": 500,
    "averageTimePerEngagement": 4000
  },
  "engagements": [
    {
      "id": "engagement-uuid",
      "market": {
        "id": "market-uuid",
        "title": "Will Bitcoin exceed $100K?",
        "kalshiId": "BTCUSD-250630"
      },
      "clickCount": 5,
      "timeSpentMs": 25000,
      "isWatchlisted": true,
      "tradeExposure": 100,
      "firstInteraction": "2026-06-01T10:00:00Z",
      "lastInteraction": "2026-06-07T15:30:00Z"
    }
  ]
}
```

## Recommendation UI Components

**Features:**

- LLM recommendation fetching
- Profile score display
- Auto-expansion when recommendations loaded
- Scrollable list within widget bounds
- Integrated market item components
- Favorites persistence

### MarketItem Component

Displays individual recommended market with actions.

**Props:**

```javascript
{
  market: Market,              // Market data
  isFavorited: Boolean,        // Whether user has favorited
  onToggleFavorite: Function,  // Callback for favorite button
  onViewSimilar: Function      // Callback for similar markets button
}
```

**Features:**

- Title and subtitle display
- Category, type, and timeframe badges
- Status badge (open/closed/resolved)
- View Market link (opens Kalshi page)
- Similar Markets button (opens modal)
- Favorite heart button (toggles favorite)

### SimilarMarketsModal Component

Modal displaying related markets for a base market.

**Props:**

```javascript
{
  isOpen: Boolean,            // Modal visibility
  onClose: Function,          // Close callback
  market: Market,             // Base market
  similarMarkets: Array       // List of similar markets
}
```

**Features:**

- List of similar markets with confidence scores
- Rationale for each similarity
- "Same outcome" indicator
- Direct links to Kalshi market pages

## Usage Example

### 1. User Views Recommendation List

```javascript
// User clicks "Update" button
// RecommendationsWidget calls runSomniaRecommendationsInference
// LLM returns list of recommended markets
// Component displays MarketItem components
```

### 2. User Interacts with Market

```javascript
// Click View Market → Opens Kalshi page
// Click Similar Markets → Shows SimilarMarketsModal
// Click Heart (Favorite) → Toggles favorite, saves to DB
```

### 3. Track Engagement

```javascript
// When user views market details:
await fetch("/api/engagement/track", {
  method: "POST",
  body: JSON.stringify({
    address: walletAddress,
    marketId: marketId,
    interactionType: "view",
    clickCount: 1,
    timeSpentMs: 5000
  })
});
```

### 4. Update Profile Scores

```javascript
// After user interactions:
await fetch("/api/profile/scores", {
  method: "PUT",
  body: JSON.stringify({
    address: walletAddress,
    scoreUpdates: [{
      topic: "crypto",
      engagement: engagementData,
      performance: performanceData
    }]
  })
});
```

## Notes

- All scores are normalized to 0-1 range
- Historical scores blend new data (80% weight) for smooth updates
- Engagement tracking happens automatically when users interact
- Similar markets discovered via embedding similarity + LLM validation
- Favorites persist across sessions

---

## Kalshi Portfolio API

### Get User Positions

#### GET /api/kalshi/positions

Fetches user's current open positions from Kalshi trading platform. This endpoint proxies requests to the Kalshi external API while handling authentication and rate limiting.

**Query Parameters:**
- `limit` (optional, default: 100): Maximum number of positions to return (1-200)

**Request:**
```bash
curl http://localhost:3000/api/kalshi/positions?limit=100
```

**Response (Success):**
```json
{
  "positions": [
    {
      "id": "pos-123",
      "positionId": "pos-123",
      "eventTicker": "BTCUSD-250630",
      "eventTitle": "Will Bitcoin exceed $100K by June 30, 2026?",
      "quantity": 1500,
      "side": "YES",
      "avgPrice": 0.45,
      "avgEntryPrice": 0.45,
      "currentPrice": 0.58,
      "lastTradePrice": 0.58,
      "priceLimit": 0.60,
      "status": "open",
      "createdAt": "2026-06-01T10:30:00Z"
    },
    {
      "id": "pos-124",
      "positionId": "pos-124",
      "eventTicker": "SPACEX-Q2-2026",
      "eventTitle": "Will SpaceX launch Starship Flight 6 in Q2 2026?",
      "quantity": 500,
      "side": "YES",
      "avgPrice": 0.72,
      "avgEntryPrice": 0.72,
      "currentPrice": 0.65,
      "lastTradePrice": 0.65,
      "priceLimit": 0.70,
      "status": "open",
      "createdAt": "2026-06-02T14:15:00Z"
    }
  ],
  "totalCount": 2,
  "limit": 100
}
```

**Response (Error - Rate Limited):**
```json
{
  "error": "Rate limited. Try again later.",
  "positions": [],
  "retryAfter": 60
}
```

**Status Codes:**
- `200 OK` - Positions fetched successfully
- `400 Bad Request` - Invalid limit parameter (not 1-200)
- `429 Too Many Requests` - Rate limited by Kalshi API
- `500 Internal Server Error` - Failed to fetch positions
- `503 Service Unavailable` - API credentials not configured

**Environment Variables Required:**
```bash
KALSHI_ACCESS_KEY=<your-api-key>
KALSHI_ACCESS_SIGNATURE=<your-api-signature>
KALSHI_ACCESS_TIMESTAMP=<your-api-timestamp>
```

**Position Object Fields:**
- `id` (string): Unique position identifier
- `eventTicker` (string): Kalshi event ticker (e.g., "BTCUSD-250630")
- `eventTitle` (string): Human-readable market question
- `quantity` (number): Number of shares held
- `side` (string): Position side ("YES" or "NO")
- `avgPrice` (number): Average entry price (0-1 for binary markets)
- `currentPrice` (number): Latest market price
- `priceLimit` (number): Price limit order (if applicable)
- `status` (string): Position status ("open", "closed", "expired")
- `createdAt` (string): ISO timestamp when position was created

**Usage in PositionsWidget:**
```javascript
// Frontend automatically calls this endpoint
const res = await fetch("/api/kalshi/positions?limit=100");
const data = await res.json();

// Map response to display format
const positions = data.positions.map(pos => ({
  id: pos.id,
  title: pos.eventTitle,
  outcome: pos.side,
  quantity: pos.quantity,
  avgPrice: pos.avgPrice,
  currentPrice: pos.currentPrice,
  currentValue: pos.quantity * pos.currentPrice,
  cashPnl: (pos.currentPrice - pos.avgPrice) * pos.quantity,
  percentPnl: ((pos.currentPrice - pos.avgPrice) / pos.avgPrice) * 100
}));
```

**Kalshi External API Reference:**
- Endpoint: `https://external-api.kalshi.com/trade-api/v2/portfolio/positions`
- Authentication: KALSHI-ACCESS-KEY, KALSHI-ACCESS-SIGNATURE, KALSHI-ACCESS-TIMESTAMP headers
- Documentation: [Kalshi API Docs](https://kalshi.com/api)

**Error Handling:**
- Network timeouts default to 15 seconds
- Rate limit errors are propagated with Retry-After header
- Invalid credentials return 503 without exposing keys
- All errors include positions array (empty if failed)
- Profile scores improve with more user data over time
