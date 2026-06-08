"use client";

import { useState } from "react";

export default function MarketItem({
  market,
  isFavorited = false,
  onToggleFavorite,
  onViewSimilar,
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleFavoriteClick = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onToggleFavorite?.(market.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimilarClick = (e) => {
    e.preventDefault();
    onViewSimilar?.(market);
  };

  const kalshiUrl = market.kalshiUrl || `https://kalshi.com/markets/${market.kalshiId}`;

  return (
    <div className="market-item">
      <div className="item-content">
        <div className="item-header">
          <h5 className="item-title">{market.title}</h5>
          {market.subtitle && <p className="item-subtitle">{market.subtitle}</p>}
        </div>

        <div className="item-meta">
          {market.category && (
            <span className="meta-badge category">{market.category}</span>
          )}
          {market.marketType && (
            <span className="meta-badge type">{market.marketType}</span>
          )}
          {market.timeHorizonDays && (
            <span className="meta-badge timeframe">
              {market.timeHorizonDays}d
            </span>
          )}
        </div>

        {market.status && (
          <div className="item-status">
            <span className={`status-badge status-${market.status.toLowerCase()}`}>
              {market.status}
            </span>
          </div>
        )}
      </div>

      <div className="item-actions">
        <a
          href={kalshiUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-action btn-view"
          title="View market on Kalshi"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          View
        </a>

        <button
          className="btn-action btn-similar"
          onClick={handleSimilarClick}
          title="Show similar markets"
          type="button"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          Similar
        </button>

        <button
          className={`btn-action btn-favorite ${isFavorited ? "favorited" : ""}`}
          onClick={handleFavoriteClick}
          disabled={isLoading}
          title={isFavorited ? "Remove from favorites" : "Add to favorites"}
          type="button"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={isFavorited ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      </div>

      <style jsx>{`
        .market-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 16px;
          transition: var(--transition-smooth);
        }

        .market-item:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(0, 242, 254, 0.2);
        }

        .item-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .item-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .item-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .item-subtitle {
          font-size: 12px;
          color: var(--text-muted);
          margin: 0;
          line-height: 1.3;
        }

        .item-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .meta-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
          text-transform: capitalize;
          white-space: nowrap;
        }

        .meta-badge.category {
          background: rgba(157, 78, 221, 0.15);
          color: #c084fc;
          border: 1px solid rgba(157, 78, 221, 0.3);
        }

        .meta-badge.type {
          background: rgba(0, 242, 254, 0.1);
          color: var(--accent-cyan);
          border: 1px solid rgba(0, 242, 254, 0.2);
        }

        .meta-badge.timeframe {
          background: rgba(255, 183, 3, 0.1);
          color: var(--color-warning);
          border: 1px solid rgba(255, 183, 3, 0.2);
        }

        .item-status {
          display: flex;
          gap: 8px;
        }

        .status-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-open {
          background: rgba(0, 255, 135, 0.15);
          color: var(--color-success);
        }

        .status-closed {
          background: rgba(255, 183, 3, 0.15);
          color: var(--color-warning);
        }

        .status-resolved {
          background: rgba(0, 242, 254, 0.15);
          color: var(--accent-cyan);
        }

        .item-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .btn-action {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.04);
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: var(--transition-smooth);
          text-decoration: none;
          white-space: nowrap;
        }

        .btn-action:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
          color: var(--text-primary);
        }

        .btn-view {
          color: var(--accent-cyan);
          border-color: rgba(0, 242, 254, 0.2);
          background: rgba(0, 242, 254, 0.08);
        }

        .btn-view:hover {
          background: rgba(0, 242, 254, 0.15);
          border-color: rgba(0, 242, 254, 0.4);
        }

        .btn-similar {
          color: #c084fc;
          border-color: rgba(157, 78, 221, 0.3);
          background: rgba(157, 78, 221, 0.08);
        }

        .btn-similar:hover {
          background: rgba(157, 78, 221, 0.15);
          border-color: rgba(157, 78, 221, 0.5);
        }

        .btn-favorite {
          color: var(--text-secondary);
        }

        .btn-favorite.favorited {
          color: #ff3366;
          border-color: rgba(255, 51, 102, 0.3);
          background: rgba(255, 51, 102, 0.08);
        }

        .btn-favorite:hover {
          color: #ff3366;
          background: rgba(255, 51, 102, 0.08);
          border-color: rgba(255, 51, 102, 0.3);
        }

        .btn-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        svg {
          width: 16px;
          height: 16px;
        }

        @media (max-width: 640px) {
          .market-item {
            flex-direction: column;
            gap: 12px;
          }

          .item-actions {
            width: 100%;
            justify-content: flex-start;
          }

          .btn-action {
            flex: 1;
            justify-content: center;
            font-size: 10px;
            padding: 6px 10px;
          }
        }
      `}</style>
    </div>
  );
}
