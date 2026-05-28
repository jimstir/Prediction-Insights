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

- 


### 4. LLM / Agent Module

- 


## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

## References

- [Polymarket Gamma API Metadata Spec](https://gamma-api.polymarket.com)
- [Polymarket Data API Spec](https://data-api.polymarket.com)
