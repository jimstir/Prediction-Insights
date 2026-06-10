"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

export default function SimilarMarketsModal({ isOpen, onClose, market, similarMarkets = [] }) {
  const [mounted, setMounted] = useState(false);

  // Mount component for portal rendering
  if (typeof window !== "undefined" && !mounted) {
    setMounted(true);
  }

  if (!isOpen || !mounted) return null;

  const modal = (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Similar Markets</h3>
          <p className="modal-subtitle">{market?.title || "Market"}</p>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="modal-body similar-markets-list">
          {similarMarkets.length === 0 ? (
            <div className="empty-state">
              <p>No similar markets found</p>
            </div>
          ) : (
            <div className="markets-scroll">
              {similarMarkets.map((item) => (
                <div key={item.market.id} className="similar-market-item">
                  <div className="item-header">
                    <h4 className="item-title">{item.market.title}</h4>
                    <div className="confidence-badge">
                      {Math.round(item.relation.confidence * 100)}% match
                    </div>
                  </div>

                  {item.relation.rationale && (
                    <p className="item-rationale">{item.relation.rationale}</p>
                  )}

                  <div className="item-meta">
                    <span className="meta-tag">{item.market.category}</span>
                    {item.relation.isSameOutcome && (
                      <span className="meta-tag same-outcome">Same outcome</span>
                    )}
                  </div>

                  {(() => {
                    const ticker = (item.market.kalshiId || "").toLowerCase();
                    const seriesTicker = ticker.split("-")[0];
                    
                    let slug = "event";
                    if (item.market.title) {
                      let cleanTitle = item.market.title;
                      cleanTitle = cleanTitle.replace(/^(will\s+someone\s+be\s+the|will\s+there\s+be\s+a|will\s+the|will\s+a|will)/i, "");
                      cleanTitle = cleanTitle.replace(/\?+$/, "");
                      slug = cleanTitle
                        .toLowerCase()
                        .trim()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-+|-+$/g, "");
                      if (!slug) slug = "event";
                    }
                    
                    const url = item.market.kalshiUrl || `https://kalshi.com/markets/${seriesTicker}/${slug}/${ticker}?op_market_ticker=${ticker.toUpperCase()}-FSHA`;
                    return (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-view-market"
                      >
                        View Market →
                      </a>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          position: relative;
          width: 90%;
          max-width: 600px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: modal-enter 0.3s ease-out;
        }

        @keyframes modal-enter {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .modal-header {
          position: relative;
          padding: 24px;
          border-bottom: 1px solid var(--border-color);
          flex-shrink: 0;
        }

        .modal-header h3 {
          font-size: 20px;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0 0 8px 0;
        }

        .modal-subtitle {
          font-size: 13px;
          color: var(--text-muted);
          margin: 0;
          font-weight: 600;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          font-size: 24px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .modal-close:hover {
          color: var(--accent-cyan);
          transform: scale(1.2);
        }

        .modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 0;
        }

        .similar-markets-list {
          display: flex;
          flex-direction: column;
        }

        .markets-scroll {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 16px;
        }

        .similar-market-item {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: var(--transition-smooth);
        }

        .similar-market-item:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(0, 242, 254, 0.2);
        }

        .item-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          justify-content: space-between;
        }

        .item-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
          flex: 1;
          line-height: 1.4;
        }

        .confidence-badge {
          font-size: 11px;
          font-weight: 700;
          background: rgba(0, 242, 254, 0.1);
          color: var(--accent-cyan);
          border: 1px solid rgba(0, 242, 254, 0.3);
          padding: 4px 8px;
          border-radius: 6px;
          white-space: nowrap;
        }

        .item-rationale {
          font-size: 12px;
          color: var(--text-muted);
          margin: 0;
          line-height: 1.4;
          font-style: italic;
        }

        .item-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .meta-tag {
          font-size: 10px;
          font-weight: 700;
          background: rgba(157, 78, 221, 0.15);
          color: #c084fc;
          border: 1px solid rgba(157, 78, 221, 0.3);
          padding: 2px 8px;
          border-radius: 4px;
          text-transform: capitalize;
        }

        .meta-tag.same-outcome {
          background: rgba(0, 255, 135, 0.15);
          color: var(--color-success);
          border-color: rgba(0, 255, 135, 0.3);
        }

        .btn-view-market {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: rgba(0, 242, 254, 0.15);
          color: var(--accent-cyan);
          border: 1px solid rgba(0, 242, 254, 0.3);
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          transition: var(--transition-smooth);
          align-self: flex-start;
        }

        .btn-view-market:hover {
          background: rgba(0, 242, 254, 0.25);
          border-color: var(--accent-cyan);
          box-shadow: 0 0 12px rgba(0, 242, 254, 0.15);
        }

        .empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          color: var(--text-muted);
          text-align: center;
        }

        .empty-state p {
          margin: 0;
          font-size: 14px;
        }

        @media (max-width: 600px) {
          .modal-content {
            width: 95%;
            max-height: 90vh;
          }
        }
      `}</style>
    </div>
  );

  return createPortal(modal, document.body);
}
