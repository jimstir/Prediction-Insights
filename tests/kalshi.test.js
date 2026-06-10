import { describe, expect, it } from "vitest";
import { fetchKalshiCandidateEvents } from "../app/lib/kalshi.js";

describe("Kalshi API connection", () => {
  it("fetches events from Kalshi with a limit of 150", async () => {
    const response = await fetchKalshiCandidateEvents({ limit: 150 });
    
    expect(response).toBeDefined();
    expect(response.events).toBeInstanceOf(Array);
    expect(response.events.length).toBeGreaterThanOrEqual(0);
    expect(response.events.length).toBeLessThanOrEqual(150);
    
    console.log(`Successfully fetched ${response.events.length} events from Kalshi!`);
    if (response.events.length > 0) {
      console.log("Sample event:", response.events[0]);
    }
  });
});
