"use client";

import { useState, useEffect, useRef } from "react";
import { runSomniaRecommendationsInference } from "../lib/somnia/runLlmInference";
import MarketItem from "./MarketItem";
import SimilarMarketsModal from "./SimilarMarketsModal";

export default function RecommendationsWidget({
  walletAddress,
  onConnectClick,
  preferences,
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [favorites, setFavorites] = useState(new Set());
  const [similarMarketsModal, setSimilarMarketsModal] = useState({
    isOpen: false,
    market: null,
    similarMarkets: [],
  });
  const [profileScores, setProfileScores] = useState(null);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const prevCountRef = useRef(0);

  // Fetch user favorites on mount or wallet change
  useEffect(() => {
    if (walletAddress) {
      fetchUserFavorites();
    }
  }, [walletAddress]);

  // Expand when new items are added
  useEffect(() => {
    if (recommendations.length > prevCountRef.current) {
      setExpanded(true);
    }
    prevCountRef.current = recommendations.length;
  }, [recommendations.length]);

  const fetchUserFavorites = async () => {
    try {
      setLoadingFavorites(true);
      const res = await fetch(`/api/markets/favorites?address=${walletAddress}`);
      if (res.ok) {
        const data = await res.json();
        const favSet = new Set(
          data.favorites?.map((f) => f.marketId) || []
        );
        setFavorites(favSet);
      }
    } catch (error) {
      console.error("Failed to fetch favorites:", error);
    } finally {
      setLoadingFavorites(false);
    }
  };

  const handleToggleFavorite = async (marketId) => {
    try {
      const action = favorites.has(marketId) ? "remove" : "add";
      const res = await fetch("/api/markets/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: walletAddress,
          marketId,
          action,
        }),
      });

      if (res.ok) {
        const newFavorites = new Set(favorites);
        if (action === "add") {
          newFavorites.add(marketId);
        } else {
          newFavorites.delete(marketId);
        }
        setFavorites(newFavorites);
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  };

  const handleViewSimilarMarkets = async (market) => {
    try {
      setLoadingSimilar(true);
      const res = await fetch(`/api/markets/${market.id}/similar?limit=10`);
      if (res.ok) {
        const data = await res.json();
        setSimilarMarketsModal({
          isOpen: true,
          market,
          similarMarkets: data.similarMarkets || [],
        });
      }
    } catch (error) {
      console.error("Failed to fetch similar markets:", error);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const handleUpdate = async () => {
    setUpdateError("");
    setRecommendations([]);
    setProfileScores(null);

    if (!walletAddress) {
      onConnectClick?.();
      return;
    }

    if (typeof window === "undefined" || !window.ethereum) {
      setUpdateError(
        "No Web3 wallet detected. Use a browser extension wallet on Somnia."
      );
      return;
    }

    setIsUpdating(true);
    try {
      const result = await runSomniaRecommendationsInference({
        walletAddress,
        preferences,
      });

      // New response format includes: { response, requestId, transactionHash, receipts }
      const llmResponse = result.response;
      const requestId = result.requestId;
      const transactionHash = result.transactionHash;
      const receipts = result.receipts;

      console.log("Somnia inference completed:", {
        requestId,
        transactionHash,
        receiptsCount: receipts?.length,
      });

      // Parse recommendations from LLM response
      let parsedRecommendations = [];
      if (typeof llmResponse === "string") {
        try {
          const parsed = JSON.parse(llmResponse);
          parsedRecommendations = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          // If not JSON, try to extract recommendations from text
          console.warn("Could not parse LLM response as JSON");
        }
      } else if (Array.isArray(llmResponse)) {
        parsedRecommendations = llmResponse;
      }

      // Transform recommendations to market format
      const markets = parsedRecommendations.map((rec, idx) => ({
        id: rec.eventTicker || rec.id || `rec-${idx}`,
        kalshiId: rec.eventTicker || rec.kalshiId,
        title: rec.title || rec.eventTicker,
        subtitle: rec.subtitle,
        category: rec.category,
        marketType: rec.marketType || "binary",
        timeHorizonDays: rec.timeHorizonDays || 30,
        status: rec.status || "open",
        kalshiUrl: rec.kalshiUrl,
        matchReason: rec.matchReason || rec.rationale,
      }));

      setRecommendations(markets);
      setExpanded(true);

      // Save invocation response and receipts to database
      if (walletAddress && requestId) {
        try {
          const saveRes = await fetch("/api/somnia/invocation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address: walletAddress,
              requestId,
              transactionHash,
              response: llmResponse,
              receipts,
              recommendationCount: markets.length,
            }),
          });

          if (saveRes.ok) {
            console.log("Invocation saved to database");
          } else {
            console.warn("Failed to save invocation to database");
          }
        } catch (e) {
          console.warn("Could not save invocation to database:", e);
        }
      }

      // Fetch and set profile scores
      if (walletAddress) {
        try {
          const scoresRes = await fetch(
            `/api/profile/scores?address=${walletAddress}`
          );
          if (scoresRes.ok) {
            const scoresData = await scoresRes.json();
            setProfileScores(scoresData.inferred_interests);
          }
        } catch (e) {
          console.warn("Could not fetch profile scores:", e);
        }
      }

      // Submit reputation attestation with engagement summary
      if (walletAddress && markets.length > 0) {
        try {
          const startTime = Date.now();
          const attestationRes = await fetch("/api/agent/reputation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address: walletAddress,
              recommendationCount: markets.length,
              inferenceTime: Date.now() - startTime,
              requestId,
            }),
          });

          if (attestationRes.ok) {
            const attestationData = await attestationRes.json();
            console.log("Reputation attestation created:", attestationData.attestationId);
          } else {
            console.warn("Failed to create reputation attestation");
          }
        } catch (e) {
          console.warn("Could not submit reputation attestation:", e);
        }
      }
    } catch (err) {
      console.error("Somnia LLM inference failed:", err);
      setUpdateError(
        err?.message || "Failed to run Somnia LLM inference. Try again."
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="widget-wrapper">
      <div className="widget-header">
        <div className="widget-title">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Recommendations
        </div>
        <button
          type="button"
          className="btn-update"
          onClick={handleUpdate}
          disabled={isUpdating}
          title="Sign a Somnia transaction to refresh recommendations via on-chain LLM"
        >
          {isUpdating ? "Signing…" : "Update"}
        </button>
      </div>

      <div className="widget-content recommendations-container">
        {updateError && (
          <div className="inference-banner error">{updateError}</div>
        )}

        {recommendations.length === 0 ? (
          <div className="recommendations-empty">
            <div className="glow-circle"></div>
            <p className="placeholder-title">Tailored Insights Coming Soon</p>
            <p className="placeholder-subtitle">
              Connect your wallet and use Update to request on-chain LLM recommendations
              powered by Somnia.
            </p>

            <div className="skeleton-grid">
              <div className="skeleton-card">
                <div className="skeleton-bar title-bar"></div>
                <div className="skeleton-bar price-bar"></div>
              </div>
              <div className="skeleton-card">
                <div className="skeleton-bar title-bar"></div>
                <div className="skeleton-bar price-bar"></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="recommendations-list-wrap">
            {profileScores && Object.keys(profileScores).length > 0 && (
              <div className="profile-scores-summary">
                <h4 className="scores-title">Profile Scores</h4>
                <div className="scores-grid">
                  {Object.entries(profileScores).map(([topic, scores]) => (
                    <div key={topic} className="score-item">
                      <span className="score-topic">{topic}</span>
                      <div className="score-values">
                        <span className="score-badge interest">
                          Interest: {(scores.interest_score * 100).toFixed(0)}%
                        </span>
                        <span className="score-badge engagement">
                          Engagement: {(scores.engagement_score * 100).toFixed(0)}%
                        </span>
                        <span className="score-badge skill">
                          Skill: {(scores.skill_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div
              className="recommendations-list"
              style={expanded ? { maxHeight: "none", overflow: "visible" } : {}}
            >
              {recommendations.map((market) => (
                <MarketItem
                  key={market.id}
                  market={market}
                  isFavorited={favorites.has(market.id)}
                  onToggleFavorite={handleToggleFavorite}
                  onViewSimilar={handleViewSimilarMarkets}
                />
              ))}
            </div>

            <div className="recommendations-footer">
              <span className="recommendation-count">
                {recommendations.length} Market{recommendations.length !== 1 ? "s" : ""} Recommended
              </span>
            </div>
          </div>
        )}

        <SimilarMarketsModal
          isOpen={similarMarketsModal.isOpen}
          onClose={() =>
            setSimilarMarketsModal({ isOpen: false, market: null, similarMarkets: [] })
          }
          market={similarMarketsModal.market}
          similarMarkets={similarMarketsModal.similarMarkets}
        />
      </div>

      <style jsx>{`
        .btn-update {
          background: rgba(157, 78, 221, 0.15);
          color: #c084fc;
          border: 1px solid rgba(157, 78, 221, 0.45);
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.3px;
          cursor: pointer;
          transition: var(--transition-smooth);
          white-space: nowrap;
        }

        .btn-update:hover:not(:disabled) {
          background: rgba(157, 78, 221, 0.28);
          border-color: #c084fc;
          box-shadow: 0 0 12px rgba(157, 78, 221, 0.25);
        }

        .btn-update:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .inference-banner {
          width: 100%;
          margin-bottom: 16px;
          padding: 12px 14px;
          border-radius: 8px;
          font-size: 13px;
          line-height: 1.45;
        }

        .inference-banner.error {
          color: var(--color-danger);
          background: rgba(255, 51, 102, 0.08);
          border: 1px solid rgba(255, 51, 102, 0.25);
        }

        .recommendations-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .recommendations-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 16px;
          min-height: 280px;
        }

        .glow-circle {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(157, 78, 221, 0.15) 0%, rgba(0, 0, 0, 0) 70%);
          border: 1px solid rgba(157, 78, 221, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .glow-circle::after {
          content: "★";
          color: #c084fc;
          font-size: 20px;
          animation: float-star 2s infinite ease-in-out;
        }

        .placeholder-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .placeholder-subtitle {
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.5;
          margin: 0;
          max-width: 300px;
        }

        .skeleton-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          width: 100%;
          margin-top: 12px;
          opacity: 0.4;
        }

        .skeleton-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          height: 72px;
        }

        .skeleton-bar {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          position: relative;
          overflow: hidden;
        }

        .skeleton-bar::after {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.03), transparent);
          animation: skeleton-sweep 2s infinite;
        }

        .title-bar {
          height: 12px;
          width: 80%;
        }

        .price-bar {
          height: 16px;
          width: 40%;
        }

        .recommendations-list-wrap {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
        }

        .profile-scores-summary {
          background: rgba(157, 78, 221, 0.08);
          border: 1px solid rgba(157, 78, 221, 0.2);
          border-radius: 10px;
          padding: 12px;
        }

        .scores-title {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          color: #c084fc;
          margin: 0 0 10px 0;
          letter-spacing: 0.5px;
        }

        .scores-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 8px;
        }

        .score-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .score-topic {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-primary);
          text-transform: capitalize;
        }

        .score-values {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .score-badge {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 3px;
          color: var(--text-primary);
        }

        .score-badge.interest {
          background: rgba(0, 242, 254, 0.1);
        }

        .score-badge.engagement {
          background: rgba(157, 78, 221, 0.15);
        }

        .score-badge.skill {
          background: rgba(0, 255, 135, 0.1);
        }

        .recommendations-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: max-height 0.4s ease;
          overflow-y: auto;
          max-height: 400px;
          width: 100%;
        }

        .recommendations-footer {
          display: flex;
          justify-content: center;
          padding: 8px 0;
          border-top: 1px solid var(--border-color);
        }

        .recommendation-count {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        @keyframes float-star {
          0% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-4px) scale(1.1);
          }
          100% {
            transform: translateY(0) scale(1);
          }
        }

        @keyframes skeleton-sweep {
          to {
            left: 100%;
          }
        }

        @media (max-width: 768px) {
          .scores-grid {
            grid-template-columns: 1fr;
          }

          .recommendations-list {
            max-height: 300px;
          }
        }
      `}</style>
    </div>
  );
}
