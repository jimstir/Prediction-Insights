"use client";

import { useState } from "react";
import ProfileWidget from "./components/ProfileWidget";
import RecommendationsWidget from "./components/RecommendationsWidget";
import PositionsWidget from "./components/PositionsWidget";
import InsightsWidget from "./components/InsightsWidget";
import ConnectWalletModal from "./components/ConnectWalletModal";

export default function Home() {
  const [walletAddress, setWalletAddress] = useState("");
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const handleConnectWallet = (address) => {
    setWalletAddress(address);
  };

  const handleDisconnectWallet = () => {
    setWalletAddress("");
  };

  const shortenedAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "";

  return (
    <div className="dashboard-container">
      {/* Dashboard Top Header */}
      <header className="dashboard-header">
        <div className="brand">
          <div className="brand-logo-container">
            <span className="brand-logo">PolePredict</span>
            <span className="brand-tagline font-glow-cyan">Market Intel App</span>
          </div>
        </div>

        <div className="header-actions">
          {walletAddress ? (
            <div className="wallet-connected-pill">
              <span className="indicator-dot"></span>
              <span className="connected-address" title={walletAddress}>
                {shortenedAddress}
              </span>
              <button 
                className="btn-disconnect-header" 
                onClick={handleDisconnectWallet}
                title="Disconnect Wallet"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" />
                </svg>
              </button>
            </div>
          ) : (
            <button 
              className="btn-primary" 
              onClick={() => setIsWalletModalOpen(true)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* Grid Layout: 2 Rows */}
      <main className="dashboard-grid">
        {/* Row 1, Column 1: Polymarket Profile Widget */}
        <section className="widget-wrapper glass-card">
          <ProfileWidget 
            walletAddress={walletAddress} 
            onDisconnect={handleDisconnectWallet}
            onConnectClick={() => setIsWalletModalOpen(true)}
          />
        </section>

        {/* Row 1, Column 2: Recommendations Widget */}
        <section className="widget-wrapper glass-card">
          <RecommendationsWidget />
        </section>

        {/* Row 2, Column 1: Open Positions Widget */}
        <section className="widget-wrapper glass-card">
          <PositionsWidget 
            walletAddress={walletAddress}
            onConnectClick={() => setIsWalletModalOpen(true)}
          />
        </section>

        {/* Row 2, Column 2: AI Insights & Explorer Widget */}
        <section className="widget-wrapper glass-card">
          <InsightsWidget />
        </section>
      </main>

      {/* Modal Overlay for connecting wallets */}
      <ConnectWalletModal 
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onConnect={handleConnectWallet}
      />

      <style jsx>{`
        .brand-logo-container {
          display: flex;
          flex-direction: column;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .wallet-connected-pill {
          display: flex;
          align-items: center;
          background: rgba(0, 242, 254, 0.08);
          border: 1px solid rgba(0, 242, 254, 0.25);
          border-radius: 30px;
          padding: 6px 6px 6px 14px;
          gap: 10px;
          box-shadow: 0 0 15px rgba(0, 242, 254, 0.05);
        }

        .indicator-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-success);
          box-shadow: 0 0 8px var(--color-success);
        }

        .connected-address {
          font-size: 13px;
          font-weight: 700;
          color: var(--accent-cyan);
          font-family: monospace;
          letter-spacing: 0.5px;
        }

        .btn-disconnect-header {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .btn-disconnect-header:hover {
          background: rgba(255, 51, 102, 0.15);
          border-color: rgba(255, 51, 102, 0.4);
          color: var(--color-danger);
          box-shadow: 0 0 8px rgba(255, 51, 102, 0.2);
        }

        .font-glow-cyan {
          text-shadow: 0 0 8px rgba(0, 242, 254, 0.2);
        }
      `}</style>
    </div>
  );
}
