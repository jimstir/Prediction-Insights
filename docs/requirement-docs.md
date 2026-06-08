# Recommendation Feature Documentation

## Overview

The recommendation feature generates personalized prediction market recommendations using the Kalshi API to provide a list events and saved user preferences that are sent to LLM processing on Somnia.

## Architecture

### Components

Kalshi Prediction API events connection:

**Returns:**

```javascript
{
  retrievedAt: "2026-06-07T15:30:00.000Z",
  totalEvents: 150,
  events: [
    {
      eventTicker: "BTCUSD-250630",
      title: "Will Bitcoin exceed $100K by June 30?",
      subtitle: "BTC price prediction",
      category: "Crypto",
      seriesTicker: "BTCUSD",
      openTime: "2026-06-01T00:00:00Z",
      closeTime: "2026-06-30T23:59:59Z",
      status: "open"
    },
    // ... up to 200 events
  ]
}
```

## Data Flow Diagram

```txt
┌─────────────────────────────────────────────────────────────┐
│                   User Clicks "Update"                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
        ┌──────────────────────────────┐
        │ RecommendationsWidget.js      │
        │  onConnect → Wallet Modal     │
        └──────────────────┬────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │ runSomniaRecommendationsInference()  │
        │  (Somnia LLM inference runner)       │
        └──────────────────┬───────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │ buildRecommendationsInferenceCalldata│ ← NOW ASYNC
        │  (Builds prompt with candidates)     │
        └──────────────────┬───────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         │                                   │
         ▼                                   ▼
    ┌──────────────┐            ┌──────────────────────┐
    │ Kalshi API   │            │ User Preferences DB  │
    │ (200 events) │            │ (categories, tags)   │
    └──────────────┘            └──────────────────────┘
         │                                   │
         └─────────────────┬─────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ formatCandidatesAndPreferences   │
        │ (Combine + normalize)            │
        └──────────────────┬───────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ buildLLMRecommendationPrompt()   │
        │ (Create structured prompt)       │
        └──────────────────┬───────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ Encode → Sign → Submit to Somnia │
        │ LLM Inference                    │
        └──────────────────┬───────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ LLM Response: Recommended Events │
        │ Added to RecommendationsWidget   │
        │ List expands to show results     │
        └──────────────────────────────────┘
```

## Database Schema

```txt
Market (prediction markets)
├─ id (UUID)
├─ kalshiId (unique ticker)
├─ title, subtitle
├─ category, marketType, timeHorizonDays
├─ difficulty, volatility, liquidity
├─ embedding (JSON vector)
└─ status, kalshiUrl

SimilarMarket (market relationships)
├─ marketIId → Market
├─ marketJId → Market
├─ isSameOutcome (boolean)
├─ confidence (0-1)
└─ rationale (text)

MarketFavorite (user favorites)
├─ walletId → Preference
├─ marketId → Market
└─ addedAt (timestamp)

UserEngagement (interaction tracking)
├─ walletId → Preference
├─ marketId → Market
├─ clickCount, timeSpentMs
├─ isWatchlisted, tradeExposure
├─ interactionType
├─ firstInteraction, lastInteraction

Preference (UPDATED)
├─ inferredInterests (JSON by topic)
├─ marketSettings (JSON)
├─ wins, losses
├─ popularMarkets (comma-separated)
└─ lastScoringUpdate
```

## Future Enhancements

- [ ] Implement pagination for events > 200
- [ ] Add caching layer (Redis) for candidate events
- [ ] Store recommendation history in database
- [ ] Implement preference-based pre-filtering on client-side
- [ ] Add event source polling for real-time updates
- [ ] Performance metrics/analytics for recommendations

## Related Files

- `app/components/RecommendationsWidget.js` - UI component
- `app/components/SettingsModal.js` - User preferences UI
- `app/api/preferences/route.js` - Preferences API
- `app/lib/preferences.js` - Preference helpers
- `app/lib/somnia/runLlmInference.js` - LLM inference runner
- `prisma/schema.prisma` - Database schema
