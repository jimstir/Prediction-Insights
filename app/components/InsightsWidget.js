"use client";

import { useState, useEffect, useRef } from "react";

export default function InsightsWidget() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const chatEndRef = useRef(null);

  // Pre-populated popular/trending markets for instant exploration
  const featuredMarkets = [
    {
      title: "Will the Fed lower interest rates in June 2026?",
      description: "Resolves based on the Federal Reserve interest rate announcement in June 2026.",
      yesPrice: 0.58,
      noPrice: 0.42,
    },
    {
      title: "Will SpaceX launch Starship Flight 6 this quarter?",
      description: "Resolves based on public tower launch verification of flight 6.",
      yesPrice: 0.65,
      noPrice: 0.35,
    },
    {
      title: "Will any country adopt Bitcoin as legal tender in 2026?",
      description: "Resolves if any sovereign country declares BTC legal tender.",
      yesPrice: 0.35,
      noPrice: 0.65,
    }
  ];

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const handleSearch = async (val) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      // Fetch from Polymarket Gamma search API
      const res = await fetch(
        `https://gamma-api.polymarket.com/public-search?q=${encodeURIComponent(val)}&events_status=active&limit_per_type=6`
      );
      if (res.ok) {
        const data = await res.json();
        // The API returns { events: [...], tags: [...], profiles: [...] }
        if (data && Array.isArray(data.events)) {
          // Map to match our simplified format
          const mapped = data.events.map(ev => {
            // Find outcome prices from nested markets if available
            let yesPrice = 0.5;
            let noPrice = 0.5;
            if (Array.isArray(ev.markets) && ev.markets[0]) {
              const mkt = ev.markets[0];
              if (Array.isArray(mkt.outcomePrices)) {
                yesPrice = parseFloat(mkt.outcomePrices[0] || 0.5);
                noPrice = parseFloat(mkt.outcomePrices[1] || 0.5);
              }
            }
            return {
              title: ev.title,
              description: ev.description || "Active prediction market on Polymarket.",
              yesPrice,
              noPrice,
            };
          });
          setSearchResults(mapped);
        }
      }
    } catch (err) {
      console.error("Error searching Polymarket events:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectMarket = (mkt) => {
    setSelectedMarket(mkt);
    setSearchQuery("");
    setSearchResults([]);
    
    // Set initial welcome assistant message
    setChatMessages([
      {
        sender: "assistant",
        text: `Hello! I am your AI Market Analyst. I can provide insights for the market: **"${mkt.title}"**. 

Ask me about:
- Key catalysts driving this event.
- Underlying risks or resolution rules.
- Historical context or macro events.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    ]);
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedMarket || loading) return;

    const userMsgText = chatInput;
    setChatInput("");

    // Append User Message
    const userMsg = {
      sender: "user",
      text: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          marketTitle: selectedMarket.title,
          userQuery: userMsgText,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Append Assistant Message
        setChatMessages(prev => [
          ...prev,
          {
            sender: "assistant",
            text: data.text,
            provider: data.provider,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
        ]);
      } else {
        throw new Error("Failed to retrieve insights");
      }
    } catch (err) {
      console.error("AI chat error:", err);
      setChatMessages(prev => [
        ...prev,
        {
          sender: "assistant",
          text: "I'm sorry, I encountered an issue generating insights for this market. Please verify your internet connection or check API keys in the `.env` file.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Simplistic custom Markdown-like parser for bold text, list items, and code block warnings
  const formatMessageText = (text) => {
    if (!text) return "";
    
    // Split into paragraphs/lines
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      let trimmed = line.trim();
      
      // Headers
      if (trimmed.startsWith("###")) {
        return <h5 key={idx} className="msg-header-3">{trimmed.replace("###", "").trim()}</h5>;
      }
      if (trimmed.startsWith("##")) {
        return <h4 key={idx} className="msg-header-2">{trimmed.replace("##", "").trim()}</h4>;
      }
      if (trimmed.startsWith("#")) {
        return <h3 key={idx} className="msg-header-1">{trimmed.replace("#", "").trim()}</h3>;
      }

      // Horizontal rules
      if (trimmed === "---") {
        return <hr key={idx} className="msg-divider" />;
      }

      // Warning Callout Block
      if (trimmed.startsWith("> [!WARNING]")) {
        return null; // Handle start of callout
      }

      // Bold formatting
      let formattedLine = line;
      const boldRegex = /\*\*(.*?)\*\*/g;
      const italicRegex = /\*(.*?)\*/g;
      
      // Convert list items
      const isBullet = trimmed.startsWith("*") || trimmed.startsWith("-");
      if (isBullet) {
        const listText = trimmed.substring(1).trim();
        return (
          <li key={idx} className="msg-list-item">
            <span dangerouslySetInnerHTML={{ 
              __html: listText
                .replace(boldRegex, "<strong>$1</strong>")
                .replace(italicRegex, "<em>$1</em>") 
            }} />
          </li>
        );
      }

      return (
        <p key={idx} className="msg-paragraph" dangerouslySetInnerHTML={{
          __html: formattedLine
            .replace(boldRegex, "<strong>$1</strong>")
            .replace(italicRegex, "<em>$1</em>")
        }} />
      );
    });
  };

  return (
    <div className="widget-wrapper">
      <div className="widget-header">
        <div className="widget-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Market Insights & AI
        </div>
        {selectedMarket && (
          <button className="btn-back" onClick={() => setSelectedMarket(null)}>
            Reset Market
          </button>
        )}
      </div>

      <div className="widget-content">
        {!selectedMarket ? (
          <div className="search-state">
            <p className="search-label">Find a prediction market or select a featured one:</p>
            
            <div className="search-box">
              <input
                type="text"
                className="form-input search-input"
                placeholder="Search Polymarket events (e.g. Fed, SpaceX...)"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
              {searching && <span className="search-loader"></span>}
            </div>

            {searchQuery.trim() !== "" ? (
              <div className="results-list">
                {searchResults.length === 0 && !searching ? (
                  <p className="no-results">No active markets match your search.</p>
                ) : (
                  searchResults.map((mkt, idx) => (
                    <div key={idx} className="result-item" onClick={() => handleSelectMarket(mkt)}>
                      <div className="result-info">
                        <span className="result-title">{mkt.title}</span>
                        <span className="result-desc">{mkt.description}</span>
                      </div>
                      <div className="result-prices">
                        <span className="price-tag yes-tag">Yes {Math.round(mkt.yesPrice * 100)}¢</span>
                        <span className="price-tag no-tag">No {Math.round(mkt.noPrice * 100)}¢</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="featured-section">
                <span className="section-label">Trending Markets</span>
                <div className="featured-grid">
                  {featuredMarkets.map((mkt, idx) => (
                    <div key={idx} className="featured-card" onClick={() => handleSelectMarket(mkt)}>
                      <div className="feat-info">
                        <span className="feat-title">{mkt.title}</span>
                        <span className="feat-desc">{mkt.description}</span>
                      </div>
                      <div className="feat-prices">
                        <span className="price-sub yes-sub">YES {Math.round(mkt.yesPrice * 100)}¢</span>
                        <span className="price-sub no-sub">NO {Math.round(mkt.noPrice * 100)}¢</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="chat-state">
            <div className="selected-market-banner">
              <div className="banner-details">
                <h6>Active Analysis</h6>
                <h4>{selectedMarket.title}</h4>
              </div>
              <div className="banner-stats">
                <div className="stat-pill yes-pill">YES: {Math.round(selectedMarket.yesPrice * 100)}%</div>
                <div className="stat-pill no-pill">NO: {Math.round(selectedMarket.noPrice * 100)}%</div>
              </div>
            </div>

            <div className="chat-messages-container">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`message-bubble ${msg.sender === "user" ? "user-bubble" : "assistant-bubble"}`}>
                  <div className="message-header">
                    <span className="message-sender">
                      {msg.sender === "user" ? "You" : "AI Market Analyst"}
                    </span>
                    {msg.provider && (
                      <span className="provider-tag">{msg.provider}</span>
                    )}
                  </div>
                  <div className="message-text">
                    {formatMessageText(msg.text)}
                  </div>
                  <span className="message-time">{msg.timestamp}</span>
                </div>
              ))}
              {loading && (
                <div className="message-bubble assistant-bubble loading-bubble">
                  <span className="loading-dot"></span>
                  <span className="loading-dot"></span>
                  <span className="loading-dot"></span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendChat} className="chat-input-bar">
              <input
                type="text"
                className="form-input chat-input-field"
                placeholder="Ask about catalysts, oracle rules, or market volatility..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={loading}
              />
              <button type="submit" className="btn-primary send-btn" disabled={loading || !chatInput.trim()}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </div>
        )}
      </div>

      <style jsx>{`
        .btn-back {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .btn-back:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--accent-cyan);
          border-color: var(--accent-cyan);
        }
        .search-state {
          display: flex;
          flex-direction: column;
          gap: 16px;
          height: 100%;
        }
        .search-label {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .search-box {
          position: relative;
          width: 100%;
        }
        .search-input {
          padding-right: 40px;
        }
        .search-loader {
          position: absolute;
          right: 14px;
          top: 14px;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(0, 242, 254, 0.1);
          border-top-color: var(--accent-cyan);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        .results-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 240px;
          overflow-y: auto;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 6px;
        }
        .result-item {
          padding: 10px 12px;
          border-radius: 6px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .result-item:hover {
          background: rgba(0, 242, 254, 0.05);
          transform: translateX(4px);
        }
        .result-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-width: 70%;
        }
        .result-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .result-desc {
          font-size: 11px;
          color: var(--text-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .result-prices {
          display: flex;
          gap: 6px;
        }
        .price-tag {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 4px;
        }
        .yes-tag {
          background: rgba(0, 255, 135, 0.1);
          color: var(--color-success);
        }
        .no-tag {
          background: rgba(255, 51, 102, 0.1);
          color: var(--color-danger);
        }
        .featured-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .section-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-muted);
          letter-spacing: 1px;
        }
        .featured-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }
        .featured-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .featured-card:hover {
          background: rgba(157, 78, 221, 0.05);
          border-color: var(--accent-purple);
          transform: translateY(-2px);
        }
        .feat-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-width: 75%;
        }
        .feat-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .feat-desc {
          font-size: 11px;
          color: var(--text-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .feat-prices {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }
        .price-sub {
          font-size: 10px;
          font-weight: 700;
        }
        .yes-sub { color: var(--color-success); }
        .no-sub { color: var(--color-danger); }

        /* Chat State Styles */
        .chat-state {
          display: flex;
          flex-direction: column;
          height: 100%;
          gap: 16px;
        }
        .selected-market-banner {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }
        .banner-details h6 {
          font-size: 10px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .banner-details h4 {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
          margin-top: 2px;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .banner-stats {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }
        .stat-pill {
          font-size: 10px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 12px;
        }
        .yes-pill {
          background: rgba(0, 255, 135, 0.1);
          color: var(--color-success);
          border: 1px solid rgba(0, 255, 135, 0.2);
        }
        .no-pill {
          background: rgba(255, 51, 102, 0.1);
          color: var(--color-danger);
          border: 1px solid rgba(255, 51, 102, 0.2);
        }
        .chat-messages-container {
          flex: 1;
          background: rgba(0, 0, 0, 0.15);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 16px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-height: 280px;
        }
        .message-bubble {
          max-width: 85%;
          padding: 12px 14px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          animation: fade-in 0.25s ease-out;
        }
        .user-bubble {
          background: rgba(157, 78, 221, 0.1);
          border: 1px solid rgba(157, 78, 221, 0.2);
          align-self: flex-end;
          border-bottom-right-radius: 2px;
        }
        .assistant-bubble {
          background: rgba(0, 242, 254, 0.03);
          border: 1px solid var(--border-color);
          align-self: flex-start;
          border-bottom-left-radius: 2px;
        }
        .message-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          font-weight: 700;
          margin-bottom: 2px;
        }
        .user-bubble .message-header {
          color: #c084fc;
        }
        .assistant-bubble .message-header {
          color: var(--accent-cyan);
        }
        .provider-tag {
          font-size: 9px;
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-muted);
          padding: 2px 6px;
          border-radius: 8px;
          text-transform: uppercase;
        }
        .message-text {
          font-size: 13px;
          color: var(--text-primary);
          line-height: 1.5;
        }
        :global(.msg-paragraph) {
          margin-bottom: 8px;
        }
        :global(.msg-paragraph:last-child) {
          margin-bottom: 0;
        }
        :global(.msg-list-item) {
          margin-left: 16px;
          margin-bottom: 4px;
        }
        :global(.msg-header-3) {
          font-size: 14px;
          font-weight: 700;
          color: var(--accent-cyan);
          margin-top: 10px;
          margin-bottom: 6px;
        }
        :global(.msg-divider) {
          border: none;
          border-top: 1px solid var(--border-color);
          margin: 8px 0;
        }
        .message-time {
          font-size: 9px;
          color: var(--text-muted);
          align-self: flex-end;
        }
        .chat-input-bar {
          display: flex;
          gap: 10px;
        }
        .chat-input-field {
          flex: 1;
        }
        .send-btn {
          width: 48px;
          height: 48px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          flex-shrink: 0;
        }
        .loading-bubble {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 6px;
          padding: 16px;
        }
        .loading-dot {
          width: 8px;
          height: 8px;
          background-color: var(--accent-cyan);
          border-radius: 50%;
          animation: dot-wave 1.2s infinite ease-in-out;
        }
        .loading-dot:nth-child(2) { animation-delay: 0.2s; }
        .loading-dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dot-wave {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
