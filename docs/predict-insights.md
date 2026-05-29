---
title: PREDICTION-MARKET-INSIGHTS
name: Prediction Market Insights
status: raw
category: Best Current Practice
contributors: Jimmy Debe <@jimstir>

---

## Abstract

This document describes the architecture and API integration standards for a prediction market insights application. The application serves as a comprehensive dashboard that introduces users to relevant prediction markets, tracks their open portfolios, and delivers AI-driven market intelligence.

## Background/Motivation

With the exponential growth of decentralized prediction markets, users face hurdles in tracking complex portfolios, identifying relevant events across thousands of active listings, and analyzing volatile market movements.

The prediction market insights application acts as a unified hub. It provides an intuitive user interface where users can connect their wallets, analyze their open positions, discover trending events, and consult an AI assistant for real-time market analysis.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](http://tools.ietf.org/html/rfc2119).

### 1. Connection & Session Management

The dashboard MUST support dynamic wallet address states. 
* The system SHALL allow users to establish session addresses via three entry points:
  1. Simulated Web3 browser extensions (`window.ethereum`).
  2. Direct user input of public Ethereum/Polygon wallet addresses.
  3. Pre-configured demo profiles representing top prediction market traders.
* Once established, the wallet address session state MUST propagate as a read-only variable to downstream widgets.

### 2. Polymarket API Connections

The application integrates with the official public Polymarket endpoint surfaces: the **Gamma API** (for social profile data and event discovery) and the **Data API** (for portfolio analytics).

#### 2.1 User Profile Module

To populate the user's profile card, the application MUST query the Polymarket Gamma API.

* **Endpoint**: `GET https://gamma-api.polymarket.com/public-profile`
* **Query Parameter**: `address=<wallet_address>` (REQUIRED)
* **Response Details**: The schema typically includes the user's name, pseudonym, and custom profile image URL.
* **Fallback**: If the endpoint fails or returns no metadata, the system SHALL default to a placeholder avatar (e.g., Identicon) and a generic username derived from the wallet address.

#### 2.2 Positions Module

To construct the user's portfolio table, the application MUST query the Polymarket Data API.
* **Endpoint**: `GET https://data-api.polymarket.com/positions`

* **Query Parameter**: `user=<wallet_address>` (REQUIRED)
* **Response Details**: The schema returns an array of active holdings containing:
  * `title`: The market question or outcome statement.
  * `size` / `amount`: The total shares held.
  * `avgPrice`: The average entry cost of the position.
  * `currentPrice`: The current trading cost of the position.
  * `cashPnl` / `percentPnl`: Realized/unrealized profit indicators.
* **Total Markets Traded**: The application MUST compute the total number of unique markets traded by aggregating distinct `marketId` or `conditionId` values returned in the positions payload.

#### 2.3 Portfolio Valuation Module

To display the net asset value of the portfolio, the application MUST query the Polymarket Data API.

* **Endpoint**: `GET https://data-api.polymarket.com/value`

* **Query Parameter**: `user=<wallet_address>` (REQUIRED)
* **Response Details**: Returns the total dollar value of the user's open positions.
* **Fallback**: If this endpoint is unavailable, the application SHALL compute the total valuation client-side by calculating `sum(size * currentPrice)` for each position returned in the positions payload.

### 3. Recommendation Module
The Recommendation Module discovers active, unresolved Polymarket events and produces a personalized, ranked feed for each user.

The application SHALL fetch active markets from the Polymarket APIs and convert each market into a compact JSON shape that the Somnia LLM inference engine can consume. Example market payload sent to the LLM:

```json
{
  "market_id": "poly_123",
  "title": "Will the Fed cut rates before September 2026?",
  "categories": [
    "macro",
    "economics",
    "interest_rates",
    "federal_reserve"
  ],
  "market_type": "binary",
  "time_horizon_days": 120,
  "resolution_type": "event",
  "difficulty": 0.71,
  "volatility": 0.43,
  "liquidity": 0.89,
  "news_density": 0.92,
  "sentiment_polarization": 0.55,
  "requires_domain_knowledge": true,
  "entities": [
    "Federal Reserve",
    "Jerome Powell"
  ]
}
```

Recommendation LLM request shape (high level): the inference call SHALL include an array of market payloads, the requesting user's preference profile, and recent behavioral signals. The Somnia LLM analyzes relevance, engagement likelihood, and potential trade success, then returns a ranked list of recommended market IDs with a short rationale and a relevance score.

Inputs the Recommendation LLM WILL receive:
- `markets`: array of market objects using the format above (REQUIRED)
- `user_profile`: user preferences, followed categories, and topic weights (REQUIRED)
- `behavioral_data`: recent interactions, watchlist, past trades, and engagement metrics (OPTIONAL)

Recommendation LLM output (example):
- `ranked_markets`: ordered list of `{market_id, score, rationale_snippet}`
- `explainers`: optional contextual notes to seed the UI card

This approach produces a personalized market feed tailored to each user rather than a generic listing.

### 4. LLM / Agent Module

The LLM / Agent Module (Somnia) is responsible for two primary inference types used by the UI widgets:

1. Recommendation inference — used by the Recommendation Module to rank and sort markets for a user (see section 3).
2. Insight inference — invoked when a user selects a specific market and requests deeper analysis.

Insight request behavior:

- When a user selects a market from the recommendations or the market list, the client SHALL call the Somnia LLM with the selected market object (the same JSON shape described in section 3), the user's profile, and the desired insight types (for example: `summary`, `drivers`, `sentiment`, `timeline`, `risks`).
- The LLM SHALL return structured insight blocks such as:
  - `summary`: concise plain-language explanation of the market question and current state
  - `context`: relevant historical or domain context (entities, recent news signals)
  - `sentiment_analysis`: explanation of prevailing market sentiment and polarization
  - `trend_explanation`: how price / volume / news trends may affect outcome probabilities
  - `key_factors`: bullet list of the most important variables likely to affect resolution

Example Insight LLM request (high level):

```json
{
  "request_type": "insight",
  "market": { /* market object as in section 3 */ },
  "user_profile": { /* preference + behavior */ },
  "insight_types": ["summary","sentiment","key_factors"]
}
```

The LLM's insight response SHALL be structured to allow direct rendering in the UI widgets (cards, modals, or expandable sections) and include short, human-readable rationale snippets plus optional citation pointers to source signals (e.g., news items, on-chain events, or tweet clusters).

Security & privacy note: user-sensitive behavioral signals SHALL be minimized in requests and obey user privacy preferences; the system MUST avoid sending any private keys, secrets, or personally identifiable information to external inference endpoints.
- 

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

## References

- [Polymarket Gamma API Metadata Spec](https://gamma-api.polymarket.com)
- [Polymarket Data API Spec](https://data-api.polymarket.com)

