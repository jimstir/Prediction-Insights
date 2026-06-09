"use client";

import { useState } from "react";
import {
  connectMetaMask,
  formatWalletError,
  isMetaMaskAvailable,
  WALLET_MODES,
} from "../lib/wallet/ethereum";

export default function ConnectWalletModal({ isOpen, onClose, onConnect }) {
  const [addressInput, setAddressInput] = useState("");
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);

  if (!isOpen) return null;

  const demoAccounts = [
    {
      name: "Vitalik Buterin (vitalik.eth)",
      address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
      type: "Ethereum Creator",
    },
    {
      name: "Polymarket Whale 1",
      address: "0xe4e42ad1d167727142d76550f75727042079f05d",
      type: "Top Trader",
    },
    {
      name: "Polymarket Whale 2",
      address: "0x8c6d48D7C0212eEad5E15f9b45B98BEA3c604FE3",
      type: "Macro Speculator",
    },
  ];

  const handleConnectCustom = (e) => {
    e.preventDefault();
    if (!addressInput.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError("Please enter a valid Ethereum wallet address (0x...)");
      return;
    }
    setError("");
    onConnect(addressInput.toLowerCase(), { mode: WALLET_MODES.READ_ONLY });
    onClose();
  };

  const handleMetaMaskConnect = async () => {
    setError("");
    setConnecting(true);

    try {
      if (!isMetaMaskAvailable()) {
        setError(
          "MetaMask not detected. Install the extension or use a read-only address below."
        );
        return;
      }

      const address = await connectMetaMask();
      onConnect(address, { mode: WALLET_MODES.METAMASK });
      onClose();
    } catch (err) {
      setError(formatWalletError(err));
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Connect Wallet</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <p className="modal-desc">
            Connect with MetaMask to sign Somnia LLM transactions. Read-only addresses
            can browse profile data but cannot run on-chain recommendations.
          </p>

          <button
            className="btn-primary w-full connect-option"
            onClick={handleMetaMaskConnect}
            disabled={connecting}
          >
            <svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor">
              <path d="M29.62 14.18l-3.32-6.52a1.85 1.85 0 00-2.31-.96L16 9.87l-7.99-3.17a1.85 1.85 0 00-2.31.96l-3.32 6.52c-.75 1.48-.48 3.26.68 4.41l9.31 9.31c1.95 1.95 5.12 1.95 7.07 0l9.31-9.31a3.86 3.86 0 00.87-4.41z"/>
            </svg>
            {connecting ? "Connecting…" : "Connect MetaMask"}
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(5, 5, 10, 0.85);
          backdrop-filter: blur(10px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-content {
          width: 100%;
          max-width: 480px;
          animation: modal-enter 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h3 {
          font-size: 20px;
          font-weight: 700;
          background: linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-purple) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .modal-close {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 28px;
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .modal-close:hover {
          color: var(--color-danger);
        }

        .modal-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .modal-desc {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .w-full {
          width: 100%;
          justify-content: center;
        }

        .connect-option {
          padding: 14px;
          font-size: 15px;
        }

        .connect-option:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .divider {
          display: flex;
          align-items: center;
          text-align: center;
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          margin: 8px 0;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid var(--border-color);
        }

        .divider:not(:empty)::before {
          margin-right: 12px;
        }

        .divider:not(:empty)::after {
          margin-left: 12px;
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .form-hint {
          font-size: 12px;
          color: var(--text-muted);
        }

        .input-group {
          display: flex;
          gap: 10px;
        }

        .form-error {
          font-size: 12px;
          color: var(--color-danger);
          margin-top: 4px;
        }

        .demo-accounts-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 200px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .demo-account-item {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 12px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: var(--transition-smooth);
        }

        .demo-account-item:hover {
          background: rgba(0, 242, 254, 0.05);
          border-color: var(--accent-cyan);
          transform: translateX(4px);
        }

        .demo-acc-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .demo-acc-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .demo-acc-addr {
          font-size: 12px;
          color: var(--text-muted);
          font-family: monospace;
        }

        .demo-acc-tag {
          font-size: 11px;
          background: rgba(157, 78, 221, 0.15);
          color: #c084fc;
          padding: 4px 8px;
          border-radius: 12px;
          font-weight: 600;
        }

        @keyframes modal-enter {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
