<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Implementation Checklist & Deployment Guide

## 🚀 Deployment Steps

### Step 1: Database Migration
```bash
# Create new Prisma migration
npx prisma migrate dev --name add_market_schema

# This will:
# - Create Market table
# - Create SimilarMarket table
# - Create MarketFavorite table
# - Create UserEngagement table
# - Update Preference table with new columns
```

### Step 2: Verify Schema
```bash
# Check schema is valid
npx prisma validate

# Generate Prisma client
npx prisma generate
```

### Step 3: Test Endpoints (Local)
```bash
# Start dev server
npm run dev

# Test favorite endpoint
curl -X POST http://localhost:3000/api/markets/favorite \
  -H "Content-Type: application/json" \
  -d '{"address":"0x...","marketId":"market-uuid","action":"add"}'

# Test profile scores
curl -X PUT http://localhost:3000/api/profile/scores \
  -H "Content-Type: application/json" \
  -d '{"address":"0x...","scoreUpdates":[...]}'

# Test engagement tracking
curl -X POST http://localhost:3000/api/engagement/track \
  -H "Content-Type: application/json" \
  -d '{"address":"0x...","marketId":"market-uuid",...}'

# Test similar markets
curl http://localhost:3000/api/markets/market-uuid/similar?limit=10
```

### Step 4: Seed Initial Market Data (Optional)
```javascript
// Create script: scripts/seedMarkets.js
import { getPrisma } from './app/lib/prisma.js';
import { fetchKalshiCandidateEvents } from './app/lib/kalshi.js';

async function seedMarkets() {
  const prisma = getPrisma();
  const candidates = await fetchKalshiCandidateEvents({ limit: 200 });
  
  for (const event of candidates.events) {
    await prisma.market.upsert({
      where: { kalshiId: event.eventTicker },
      create: {
        kalshiId: event.eventTicker,
        title: event.title,
        category: event.category || 'uncategorized',
        marketType: 'binary',
        timeHorizonDays: 30,
        resolutionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'open'
      },
      update: {}
    });
  }
}

seedMarkets().catch(console.error);
```

Run with:
```bash
node scripts/seedMarkets.js
```

### Step 5: Production Deployment
```bash
# Build application
npm run build

# Run linting
npm run lint

# Start production server
npm start
```

---

## 🔄 Integration Flow

### User Journey: Get Recommendations
```
1. User clicks "Update" button
   ↓
2. RecommendationsWidget calls runSomniaRecommendationsInference()
   ↓
3. LLM fetches Kalshi candidates + user preferences
   ↓
4. LLM returns ranked recommendation list
   ↓
5. Widget displays recommendations as MarketItem list
   ↓
6. Fetches user's favorites and displays heart icons
   ↓
7. Fetches profile scores and displays by topic
   ↓
8. User sees scrollable list with all data loaded
```

### User Journey: View Similar Markets
```
1. User clicks "Similar" button on market item
   ↓
2. Component fetches /api/markets/:id/similar
   ↓
3. Modal opens with related markets
   ↓
4. User clicks "View Market" → opens Kalshi in new tab
```

### User Journey: Mark as Favorite
```
1. User clicks heart button
   ↓
2. Component calls POST /api/markets/favorite
   ↓
3. Favorite saved to database
   ↓
4. Heart icon fills (visual feedback)
   ↓
5. Favorite persists across sessions
```

### User Journey: Track Engagement
```
1. User interacts with market (click, view, etc.)
   ↓
2. Component calls POST /api/engagement/track
   ↓
3. Interaction recorded in UserEngagement table
   ↓
4. Time spent tracked automatically
   ↓
5. Engagement data used for profile scoring
```

---

## 📊 Data Model Relationships

```
Wallet (user)
├─ Preference (user preferences + scores)
│  ├─ MarketFavorite[] (favorites)
│  │  └─ Market (favorited market)
│  └─ UserEngagement[] (interactions)
│     └─ Market (interacted market)
│
Market
├─ MarketFavorite[] (who favorited)
├─ UserEngagement[] (user interactions)
├─ SimilarMarket[] (as market_i - first in pair)
└─ SimilarMarket[] (as market_j - second in pair)
```

---


## 📋 Database Verification Queries

```sql
-- Check Market count
SELECT COUNT(*) FROM "Market";

-- Check user favorites
SELECT * FROM "MarketFavorite" WHERE "walletId" = '...';

-- Check engagement history
SELECT * FROM "UserEngagement" WHERE "walletId" = '...';

-- Check similar markets
SELECT * FROM "SimilarMarket" WHERE "marketIId" = '...';

-- Check profile scores
SELECT "inferredInterests" FROM "Preference" WHERE "walletId" = '...';

-- Verify relationships
SELECT p."walletId", COUNT(mf."id") as favorites
FROM "Preference" p
LEFT JOIN "MarketFavorite" mf ON p."walletId" = mf."walletId"
GROUP BY p."walletId";
```

---

## 🔍 Monitoring & Metrics

### Key Metrics to Track
- User engagement rate (clicks per recommendation)
- Favorite rate (% of recommendations favorited)
- Similar markets discovery (% using modal)
- Profile score distribution (by topic)
- Average time spent per market
- Market revisit rate

### Recommended Monitoring
```javascript
// Track user engagement
setInterval(() => {
  const engagementTime = Date.now() - lastInteraction;
  
  if (engagementTime > 60000) { // 1 minute
    trackEngagement({ timeSpentMs: engagementTime });
    lastInteraction = Date.now();
  }
}, 5000);
```

---

## 🐛 Troubleshooting

### Issue: Favorites not persisting
**Solution:** Verify database connection and cascade delete configuration

### Issue: Profile scores not updating
**Solution:** Check score calculation inputs, verify engagement data is being tracked

### Issue: Similar markets modal empty
**Solution:** Verify SimilarMarket relationships exist in database, check embedding similarity

### Issue: Scrollable list not scrolling
**Solution:** Check CSS max-height, verify overflow-y: auto applied

### Issue: API 500 errors
**Solution:** Check database connection, verify wallet address normalization

---

## ✨ Future Enhancements

1. **Real-time Updates**
   - WebSocket for market updates
   - Live engagement tracking
   - Real-time score recalculation

2. **Advanced Analytics**
   - Market performance dashboard
   - User skill assessment
   - Recommendation accuracy metrics

3. **AI Improvements**
   - Fine-tune embedding model
   - Implement market clustering
   - Add seasonal patterns

4. **UI Enhancements**
   - Market comparison view
   - Advanced filtering/sorting
   - Profile visualization

5. **Performance**
   - Add caching layer (Redis)
   - Optimize queries with indexes
   - Batch API calls

---

## 📞 Support

For issues or questions:
1. Check `MARKET_SCHEMA_AND_SCORING.md` for detailed API docs
2. Review `IMPLEMENTATION_SUMMARY.md` for architecture overview
3. Check error logs for specific error codes
4. Verify database migrations were applied
5. Ensure Kalshi API is accessible

---

**Status:** ✅ Ready for Deployment
**Last Updated:** 2026-06-07
**Version:** 1.0.0
