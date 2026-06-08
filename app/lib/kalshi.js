/**
 * Kalshi Events Retrieval Module
 *
 * This module fetches candidate events from the Kalshi Events API
 * and normalizes them for LLM processing. It performs NO filtering,
 * ranking, or recommendation logic - only retrieval and normalization.
 */

const KALSHI_API_BASE = "https://external-api.kalshi.com/trade-api/v2";
const KALSHI_EVENTS_ENDPOINT = "/events";
const DEFAULT_LIMIT = 200;

// Request timeout in milliseconds
const REQUEST_TIMEOUT_MS = 15000;

/**
 * @typedef {Object} CandidateEvent
 * @property {string} eventTicker - Unique ticker for the event
 * @property {string} title - Event title/question
 * @property {string} [subtitle] - Optional event subtitle
 * @property {string} [category] - Event category (e.g., "politics", "tech")
 * @property {string} [seriesTicker] - Optional series identifier
 * @property {string} [openTime] - When event opens for trading (ISO format)
 * @property {string} [closeTime] - When event closes for trading (ISO format)
 * @property {string} [status] - Event status (e.g., "open", "closed", "resolved")
 */

/**
 * @typedef {Object} CandidateEventResponse
 * @property {string} retrievedAt - ISO timestamp of retrieval
 * @property {number} totalEvents - Total events returned
 * @property {CandidateEvent[]} events - Normalized candidate events
 */

/**
 * Fetch and normalize events from the Kalshi API
 *
 * @param {Object} options - Fetch options
 * @param {number} [options.limit=200] - Maximum events to retrieve
 * @returns {Promise<CandidateEventResponse>} Normalized events response
 * @throws {Error} On network, timeout, or parsing errors (never swallows errors)
 */
export async function fetchKalshiCandidateEvents(options = {}) {
  const { limit = DEFAULT_LIMIT } = options;

  // Validate inputs
  if (typeof limit !== "number" || limit < 1 || limit > 200) {
    throw new Error(
      `Invalid limit: ${limit}. Must be a number between 1 and 200.`
    );
  }

  const url = new URL(KALSHI_EVENTS_ENDPOINT, KALSHI_API_BASE);
  url.searchParams.append("limit", limit.toString());

  let response;
  let rawData;

  try {
    // Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "PolePredict/1.0",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After") || "60";
      throw new Error(
        `Rate limit exceeded. Retry after ${retryAfter} seconds.`
      );
    }

    // Handle network-level HTTP errors
    if (!response.ok) {
      throw new Error(
        `Kalshi API error: ${response.status} ${response.statusText}`
      );
    }

    // Parse JSON
    try {
      rawData = await response.json();
    } catch (parseErr) {
      throw new Error(
        `Invalid JSON response from Kalshi API: ${parseErr.message}`
      );
    }

    // Validate response structure
    if (!rawData || typeof rawData !== "object") {
      throw new Error("Kalshi API returned invalid response structure");
    }

    // Handle empty response
    const events = Array.isArray(rawData.events)
      ? rawData.events
      : Array.isArray(rawData)
      ? rawData
      : [];

    if (events.length === 0) {
      return {
        retrievedAt: new Date().toISOString(),
        totalEvents: 0,
        events: [],
      };
    }

    // Normalize events
    const normalizedEvents = events
      .map((event) => normalizeEvent(event))
      .filter((event) => event !== null);

    return {
      retrievedAt: new Date().toISOString(),
      totalEvents: normalizedEvents.length,
      events: normalizedEvents,
    };
  } catch (error) {
    // Handle abort (timeout)
    if (error.name === "AbortError") {
      throw new Error(
        `Kalshi API request timeout after ${REQUEST_TIMEOUT_MS}ms`
      );
    }

    // Network errors
    if (error instanceof TypeError) {
      throw new Error(
        `Network error fetching Kalshi API: ${error.message}`
      );
    }

    // Re-throw known errors
    throw error;
  }
}

/**
 * Normalize a raw Kalshi event into CandidateEvent structure
 * Returns null if event is invalid (which will be filtered out).
 *
 * @param {Object} rawEvent - Raw event from Kalshi API
 * @returns {CandidateEvent|null} Normalized event or null if invalid
 * @private
 */
function normalizeEvent(rawEvent) {
  // Validate that event is an object
  if (!rawEvent || typeof rawEvent !== "object") {
    console.warn("Skipping invalid event (not an object):", rawEvent);
    return null;
  }

  // Require at least ticker and title
  if (!rawEvent.ticker || !rawEvent.title) {
    console.warn("Skipping event missing ticker or title:", rawEvent);
    return null;
  }

  // Build normalized event with only needed fields
  const normalized = {
    eventTicker: String(rawEvent.ticker).trim(),
    title: String(rawEvent.title).trim(),
  };

  // Add optional fields if present and non-empty
  if (rawEvent.subtitle && typeof rawEvent.subtitle === "string") {
    const subtitle = rawEvent.subtitle.trim();
    if (subtitle) normalized.subtitle = subtitle;
  }

  if (rawEvent.category && typeof rawEvent.category === "string") {
    const category = rawEvent.category.trim();
    if (category) normalized.category = category;
  }

  if (rawEvent.series_ticker && typeof rawEvent.series_ticker === "string") {
    const seriesTicker = rawEvent.series_ticker.trim();
    if (seriesTicker) normalized.seriesTicker = seriesTicker;
  }

  // Normalize timestamp fields (keep as-is if already ISO format)
  if (rawEvent.open_time) {
    normalized.openTime = String(rawEvent.open_time);
  }

  if (rawEvent.close_time) {
    normalized.closeTime = String(rawEvent.close_time);
  }

  // Add status if present
  if (rawEvent.status && typeof rawEvent.status === "string") {
    const status = rawEvent.status.trim();
    if (status) normalized.status = status;
  }

  return normalized;
}

/**
 * Wrapper for server-side usage to fetch candidates with error logging
 *
 * @param {Object} options - Fetch options
 * @returns {Promise<CandidateEventResponse|null>} Response or null on error
 */
export async function fetchKalshiCandidateEventsWithFallback(options = {}) {
  try {
    return await fetchKalshiCandidateEvents(options);
  } catch (error) {
    console.error("Failed to fetch Kalshi candidate events:", {
      message: error.message,
      timestamp: new Date().toISOString(),
    });
    return null;
  }
}
