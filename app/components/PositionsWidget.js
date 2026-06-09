"use client";

import { useState, useEffect } from "react";

export default function PositionsWidget({ walletAddress, onConnectClick }) {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!walletAddress) {
      setPositions([]);
      return;
    }

    const fetchPositions = async () => {
      setLoading(true);
      setError("");
      setNotice("");
      try {
        const res = await fetch("/api/kalshi/positions?limit=100");
        const data = await res.json().catch(() => ({}));

        if (data.configured === false) {
          setPositions([]);
          setNotice(
            data.message ||
              "Kalshi API is not configured. Positions will appear once credentials are added."
          );
          return;
        }

        if (!res.ok) {
          throw new Error(data.error || `Failed to fetch positions: ${res.statusText}`);
        }

        if (data.positions && Array.isArray(data.positions)) {
          // Map Kalshi data to standardize fields
          const mappedPositions = data.positions.map(pos => {
            const quantity = parseFloat(pos.quantity || pos.size || 0);
            const avgPrice = parseFloat(pos.avgPrice || pos.avgEntryPrice || 0);
            const currentPrice = parseFloat(pos.currentPrice || pos.lastTradePrice || avgPrice || 0);
            const currentValue = quantity * currentPrice;
            
            const cashPnl = (currentPrice - avgPrice) * quantity;
            const percentPnl = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;

            return {
              id: pos.id || pos.positionId || Math.random().toString(),
              title: pos.eventTitle || pos.title || "Unknown Market",
              assetName: pos.eventTicker || pos.tickerName || "Kalshi Market",
              outcome: pos.side || (pos.title?.includes("Yes") ? "YES" : "NO"),
              eventTicker: pos.eventTicker,
              quantity,
              avgPrice,
              currentPrice,
              currentValue,
              cashPnl,
              percentPnl,
              createdAt: pos.createdAt,
              priceLimit: pos.priceLimit,
              status: pos.status || "open",
            };
          });
          
          setPositions(mappedPositions);
        } else {
          setPositions([]);
        }
      } catch (err) {
        console.warn("Error fetching positions:", err.message);
        setError("Failed to fetch current positions. Try again later.");
        setPositions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();
  }, [walletAddress]);

  if (!walletAddress) {
    return (
      <div className="widget-wrapper">
        <div className="widget-header">
          <div className="widget-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            Open Positions
          </div>
        </div>
        <div className="widget-content empty-state">
          <div className="empty-icon-wrap">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <p className="empty-text">Connect your wallet to view your active Polymarket positions.</p>
          <button className="btn-primary" onClick={onConnectClick}>
            Connect Wallet
          </button>
        </div>

        <style jsx>{`
          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            gap: 20px;
            min-height: 280px;
          }
          .empty-icon-wrap {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: rgba(0, 242, 254, 0.05);
            border: 1px dashed rgba(0, 242, 254, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--accent-cyan);
            margin-bottom: 8px;
            animation: pulse-glow 2s infinite ease-in-out;
          }
          .empty-text {
            color: var(--text-secondary);
            font-size: 14px;
            max-width: 280px;
            line-height: 1.6;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="widget-wrapper">
      <div className="widget-header">
        <div className="widget-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          Open Positions
        </div>
        <span className="positions-count">
          {positions.length} Active
        </span>
      </div>

      <div className="widget-content">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading positions...</p>
          </div>
        ) : (
          <div className="positions-container">
            {notice && <div className="notice-banner">{notice}</div>}
            {error && <div className="error-banner">{error}</div>}

            {positions.length === 0 ? (
              <div className="no-positions">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                <p>
                  {notice
                    ? "Kalshi positions are unavailable until API credentials are configured."
                    : "No active positions found for this address."}
                </p>
              </div>
            ) : (
              <div className="positions-list">
                {positions.map((pos) => {
                  const isProfit = pos.cashPnl >= 0;
                  return (
                    <div key={pos.id} className="position-item">
                      <div className="pos-market-info">
                        <h5 className="pos-title">{pos.title}</h5>
                        <div className="pos-meta">
                          <span className={`outcome-badge ${pos.outcome === "YES" ? "badge-yes" : "badge-no"}`}>
                            {pos.outcome}
                          </span>
                          <span className="pos-size">{pos.quantity.toLocaleString()} shares</span>
                        </div>
                      </div>

                      <div className="pos-financials">
                        <div className="financial-column align-right">
                          <span className="fin-val">${pos.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span className="fin-label">Value</span>
                        </div>

                        <div className="financial-column align-right">
                          <span className="fin-val font-mono">
                            ${pos.avgPrice.toFixed(2)} → ${pos.currentPrice.toFixed(2)}
                          </span>
                          <span className="fin-label">Price Path</span>
                        </div>

                        <div className="financial-column align-right">
                          <span className={`fin-val font-mono ${isProfit ? "profit-text" : "loss-text"}`}>
                            {isProfit ? "+" : ""}{pos.cashPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className={`pnl-percent ${isProfit ? "profit-bg" : "loss-bg"}`}>
                            {isProfit ? "+" : ""}{pos.percentPnl.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .positions-count {
          font-size: 11px;
          background: rgba(0, 242, 254, 0.1);
          color: var(--accent-cyan);
          border: 1px solid rgba(0, 242, 254, 0.2);
          padding: 4px 10px;
          border-radius: 20px;
          font-weight: 700;
        }
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          min-height: 200px;
          color: var(--text-secondary);
        }
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(0, 242, 254, 0.1);
          border-top-color: var(--accent-cyan);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        .positions-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .notice-banner {
          background: rgba(0, 242, 254, 0.06);
          border: 1px solid rgba(0, 242, 254, 0.2);
          color: var(--text-secondary);
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 12px;
          line-height: 1.4;
        }

        .error-banner {
          background: rgba(255, 51, 102, 0.08);
          border: 1px solid rgba(255, 51, 102, 0.25);
          color: var(--color-danger);
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 12px;
          line-height: 1.4;
        }
        .no-positions {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 40px 20px;
          color: var(--text-secondary);
          text-align: center;
        }
        .no-positions p {
          font-size: 14px;
        }
        .positions-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .position-item {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 16px;
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 16px;
          align-items: center;
          transition: var(--transition-smooth);
        }
        .position-item:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(0, 242, 254, 0.2);
          transform: translateY(-2px);
        }
        .pos-market-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .pos-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .pos-meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .outcome-badge {
          font-size: 10px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 4px;
          letter-spacing: 0.5px;
        }
        .badge-yes {
          background: rgba(0, 255, 135, 0.15);
          color: var(--color-success);
          border: 1px solid rgba(0, 255, 135, 0.3);
        }
        .badge-no {
          background: rgba(255, 51, 102, 0.15);
          color: var(--color-danger);
          border: 1px solid rgba(255, 51, 102, 0.3);
        }
        .pos-size {
          font-size: 12px;
          color: var(--text-secondary);
        }
        .pos-financials {
          display: grid;
          grid-template-columns: 1fr 1fr 1.2fr;
          gap: 8px;
        }
        .financial-column {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .align-right {
          align-items: flex-end;
          text-align: right;
        }
        .fin-val {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .font-mono {
          font-family: monospace;
          font-size: 12px;
        }
        .fin-label {
          font-size: 10px;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .profit-text {
          color: var(--color-success) !important;
        }
        .loss-text {
          color: var(--color-danger) !important;
        }
        .pnl-percent {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
        }
        .profit-bg {
          background: rgba(0, 255, 135, 0.1);
          color: var(--color-success);
        }
        .loss-bg {
          background: rgba(255, 51, 102, 0.1);
          color: var(--color-danger);
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 580px) {
          .position-item {
            grid-template-columns: 1fr;
          }
          .pos-financials {
            border-top: 1px solid var(--border-color);
            padding-top: 12px;
          }
        }
      `}</style>
    </div>
  );
}
