"use client";

import { useCallback, useEffect, useState } from "react";
import ProfileWidget from "./components/ProfileWidget";
import RecommendationsWidget from "./components/RecommendationsWidget";
import PositionsWidget from "./components/PositionsWidget";
import ConnectWalletModal from "./components/ConnectWalletModal";
import SettingsModal, { EMPTY_PREFERENCES } from "./components/SettingsModal";

export default function Home() {
  const [walletAddress, setWalletAddress] = useState("");
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState(EMPTY_PREFERENCES);
  const [preferencesLoading, setPreferencesLoading] = useState(false);

  const fetchPreferences = useCallback(async (address) => {
    if (!address) {
      setPreferences(EMPTY_PREFERENCES);
      return;
    }

    setPreferencesLoading(true);
    try {
      const response = await fetch(
        `/api/preferences?address=${encodeURIComponent(address)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load preferences");
      }

      setPreferences(data.preferences ?? EMPTY_PREFERENCES);
    } catch (error) {
      console.error("Failed to load preferences:", error);
      setPreferences(EMPTY_PREFERENCES);
    } finally {
      setPreferencesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences(walletAddress);
  }, [walletAddress, fetchPreferences]);

  const handleConnectWallet = (address) => {
    setWalletAddress(address);
  };

  const handleDisconnectWallet = () => {
    setWalletAddress("");
    setPreferences(EMPTY_PREFERENCES);
  };

  const shortenedAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "";

  const handleSavePreferences = async (prefs) => {
    if (!walletAddress) {
      throw new Error("Connect your wallet to save preferences.");
    }

    const response = await fetch("/api/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: walletAddress,
        ...prefs,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to save preferences");
    }

    setPreferences(data.preferences ?? prefs);
  };

  const handleOpenSettings = () => {
    if (walletAddress) {
      fetchPreferences(walletAddress);
    }
    setIsSettingsOpen(true);
  };

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
          <button 
            className="btn-settings-header" 
            onClick={handleOpenSettings}
            title="Preferences"
            aria-label="Open Preferences"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00f2fe" strokeWidth="2.2" style={{filter: 'drop-shadow(0 0 4px #00f2fe)'}}> 
              <circle cx="12" cy="12" r="3.2" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 16 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 8c.14.31.22.65.22 1s-.08.69-.22 1a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
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
        {/* Top row: Profile (left) and Open Positions (right) */}
        <section className="widget-wrapper glass-card">
          <ProfileWidget 
            walletAddress={walletAddress} 
            onDisconnect={handleDisconnectWallet}
            onConnectClick={() => setIsWalletModalOpen(true)}
          />
        </section>

        <section className="widget-wrapper glass-card">
          <PositionsWidget 
            walletAddress={walletAddress}
            onConnectClick={() => setIsWalletModalOpen(true)}
          />
        </section>

        {/* Recommendations spanning full width below */}
        <section className="widget-wrapper glass-card" style={{ gridColumn: '1 / -1' }}>
          <RecommendationsWidget
            walletAddress={walletAddress}
            preferences={preferences}
            onConnectClick={() => setIsWalletModalOpen(true)}
          />
        </section>
      </main>


      {/* Modal Overlay for connecting wallets */}
      <ConnectWalletModal 
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onConnect={handleConnectWallet}
      />
      {/* Settings Modal for preferences */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        preferences={preferences}
        onSave={handleSavePreferences}
        walletAddress={walletAddress}
        isLoading={preferencesLoading && Boolean(walletAddress)}
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

        .btn-settings-header {
          background: rgba(0, 242, 254, 0.12);
          border: 1.5px solid #00f2fe;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #00f2fe;
          box-shadow: 0 0 8px #00f2fe44;
          cursor: pointer;
          margin-right: 8px;
          transition: var(--transition-smooth);
        }
        .btn-settings-header:hover {
          background: #00f2fe;
          color: #181a20;
          border-color: #00f2fe;
          box-shadow: 0 0 16px #00f2fe;
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
