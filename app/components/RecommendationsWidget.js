"use client";

export default function RecommendationsWidget() {
  return (
    <div className="widget-wrapper">
      <div className="widget-header">
        <div className="widget-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Recommendations
        </div>
      </div>
      
      <div className="widget-content placeholder-container">
        <div className="recommendations-placeholder">
          <div className="glow-circle"></div>
          <p className="placeholder-title">Tailored Insights Coming Soon</p>
          <p className="placeholder-subtitle">
            Once you have active trading history, AI-curated prediction markets matching your interests will be featured here.
          </p>
          
          {/* Skeleton Cards for aesthetic visualization */}
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
        .placeholder-container {
          display: flex;
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
