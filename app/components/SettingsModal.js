"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const EMPTY_PREFERENCES = {
  categories: "",
  subCategories: "",
  tags: "",
  liquidityScale: "",
  timeframes: "",
};

export default function SettingsModal({
  isOpen,
  onClose,
  preferences,
  onSave,
  walletAddress,
  isLoading = false,
}) {
  const [mounted, setMounted] = useState(false);
  const [categories, setCategories] = useState("");
  const [subCategories, setSubCategories] = useState("");
  const [tags, setTags] = useState("");
  const [liquidityScale, setLiquidityScale] = useState("");
  const [timeframes, setTimeframes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    setCategories(preferences?.categories ?? "");
    setSubCategories(preferences?.subCategories ?? "");
    setTags(preferences?.tags ?? "");
    setLiquidityScale(preferences?.liquidityScale ?? "");
    setTimeframes(preferences?.timeframes ?? "");
    setSaveError("");
  }, [isOpen, preferences]);

  if (!isOpen || !mounted) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError("");

    if (!walletAddress) {
      setSaveError("Connect your wallet to save preferences.");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        categories,
        subCategories,
        tags,
        liquidityScale,
        timeframes,
      });
      onClose();
    } catch (err) {
      setSaveError(err.message || "Failed to save preferences.");
    } finally {
      setIsSaving(false);
    }
  };

  const modal = (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Preferences</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <p className="modal-instruction">
          Enter multiple values in each field, separated by commas (for example:{" "}
          <span className="instruction-example">Tech, Politics, Finance</span>).
          Saved values will appear here so you can edit or add more anytime.
        </p>

        {!walletAddress && (
          <p className="modal-notice">Connect your wallet to load and save your preferences.</p>
        )}

        {isLoading ? (
          <div className="modal-body loading-state">Loading your saved preferences…</div>
        ) : (
          <form className="modal-body" onSubmit={handleSave}>
            <label className="form-label" htmlFor="pref-categories">
              Categories
            </label>
            <textarea
              id="pref-categories"
              className="form-input form-input-resizable"
              placeholder="e.g. Tech, Politics, Finance"
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
              rows={2}
              disabled={isSaving}
            />

            <label className="form-label" htmlFor="pref-subcategories">
              Sub-Categories
            </label>
            <textarea
              id="pref-subcategories"
              className="form-input form-input-resizable"
              placeholder="e.g. Crypto, Elections, Stocks"
              value={subCategories}
              onChange={(e) => setSubCategories(e.target.value)}
              rows={2}
              disabled={isSaving}
            />

            <label className="form-label" htmlFor="pref-tags">
              Tags
            </label>
            <textarea
              id="pref-tags"
              className="form-input form-input-resizable"
              placeholder="e.g. Ethereum, USDT, Trump"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              rows={2}
              disabled={isSaving}
            />

            <label className="form-label" htmlFor="pref-liquidity">
              Preferred Liquidity Scale
            </label>
            <textarea
              id="pref-liquidity"
              className="form-input form-input-resizable"
              placeholder="e.g. High, Medium, Low"
              value={liquidityScale}
              onChange={(e) => setLiquidityScale(e.target.value)}
              rows={2}
              disabled={isSaving}
            />

            <label className="form-label" htmlFor="pref-timeframes">
              Timeframe Preferences
            </label>
            <textarea
              id="pref-timeframes"
              className="form-input form-input-resizable"
              placeholder="e.g. Short-term, Long-term"
              value={timeframes}
              onChange={(e) => setTimeframes(e.target.value)}
              rows={2}
              disabled={isSaving}
            />

            {saveError && <p className="form-error">{saveError}</p>}

            <button
              type="button"
              className="w-full"
              onClick={() => window.location.href = "/test-connection"}
              style={{
                marginTop: "12px",
                background: "rgba(157, 78, 221, 0.15)",
                color: "#c084fc",
                border: "1px solid rgba(157, 78, 221, 0.45)",
                padding: "12px",
                borderRadius: "8px",
                fontWeight: "700",
                cursor: "pointer",
                fontSize: "14px",
                textAlign: "center"
              }}
            >
              Test Somnia Connection
            </button>

            <button
              type="submit"
              className="btn-primary w-full save-btn"
              disabled={isSaving || !walletAddress}
            >
              {isSaving ? "Saving…" : "Save Preferences"}
            </button>
          </form>
        )}
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
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-content {
          width: 100%;
          max-width: 480px;
          max-height: 90vh;
          overflow-y: auto;
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
          line-height: 1;
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .modal-close:hover {
          color: var(--color-danger);
        }

        .modal-instruction {
          margin: 0;
          padding: 16px 24px 0;
          font-size: 13px;
          line-height: 1.55;
          color: var(--text-secondary);
        }

        .instruction-example {
          color: var(--accent-cyan);
          font-family: monospace;
        }

        .modal-notice {
          margin: 12px 24px 0;
          padding: 10px 12px;
          font-size: 13px;
          line-height: 1.45;
          color: var(--color-warning);
          background: rgba(255, 183, 3, 0.08);
          border: 1px solid rgba(255, 183, 3, 0.25);
          border-radius: 8px;
        }

        .modal-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .loading-state {
          color: var(--text-secondary);
          font-size: 14px;
        }

        .form-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 8px;
        }

        .form-label:first-of-type {
          margin-top: 0;
        }

        .form-input-resizable {
          resize: both;
          min-height: 44px;
          min-width: 100%;
          max-width: 100%;
          overflow: auto;
          line-height: 1.5;
        }

        .form-error {
          font-size: 12px;
          color: var(--color-danger);
          margin-top: 4px;
        }

        .w-full {
          width: 100%;
          justify-content: center;
        }

        .save-btn {
          margin-top: 16px;
          padding: 14px;
          font-size: 15px;
        }

        .save-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
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

  return createPortal(modal, document.body);
}

export { EMPTY_PREFERENCES };
