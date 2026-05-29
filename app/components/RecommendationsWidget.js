"use client";

import { useState } from "react";
import { runSomniaRecommendationsInference } from "../lib/somnia/runLlmInference";

export default function RecommendationsWidget({
  walletAddress,
  onConnectClick,
  preferences,
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const [lastResponse, setLastResponse] = useState(null);

  const handleUpdate = async () => {
    setUpdateError("");
    setLastResponse(null);

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
      setLastResponse(result);
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

      <div className="widget-content placeholder-container">
        {updateError && <div className="inference-banner error">{updateError}</div>}
        {lastResponse && (
          <div className="inference-banner success">
            <span className="inference-label">Somnia LLM response</span>
            <pre className="inference-result">
              {typeof lastResponse === "string"
                ? lastResponse
                : JSON.stringify(lastResponse, null, 2)}
            </pre>
          </div>
        )}

        <div className="recommendations-placeholder">
          <div className="glow-circle"></div>
          <p className="placeholder-title">Tailored Insights Coming Soon</p>
          <p className="placeholder-subtitle">
            Connect your wallet and use Update to request on-chain LLM recommendations
            powered by Somnia. Saved preferences will be wired into the prompt soon.
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

        .inference-banner.success {
          color: var(--text-secondary);
          background: rgba(0, 242, 254, 0.06);
          border: 1px solid rgba(0, 242, 254, 0.2);
        }

        .inference-label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--accent-cyan);
          margin-bottom: 8px;
        }

        .inference-result {
          margin: 0;
          max-height: 120px;
          overflow: auto;
          font-size: 12px;
          font-family: monospace;
          white-space: pre-wrap;
          word-break: break-word;
          color: var(--text-primary);
        }

        .placeholder-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 280px;
        }

        .recommendations-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 16px;
          width: 100%;
          max-width: 320px;
        }

        .glow-circle {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(157, 78, 221, 0.15) 0%, rgba(0,0,0,0) 70%);
          border: 1px solid rgba(157, 78, 221, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .glow-circle::after {
          content: '★';
          color: #c084fc;
          font-size: 20px;
          animation: float-star 2s infinite ease-in-out;
        }

        .placeholder-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .placeholder-subtitle {
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.5;
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
          content: '';
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

        @keyframes float-star {
          0% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-4px) scale(1.1); }
          100% { transform: translateY(0) scale(1); }
        }

        @keyframes skeleton-sweep {
          to { left: 100%; }
        }
      `}</style>
    </div>
  );
}
