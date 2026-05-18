import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <div className="home-header">
        <div className="logo">
          <span className="logo-icon">🎨</span>
        </div>
        <h1 className="app-title">动物乐园</h1>
        <p className="app-subtitle">和小动物们做朋友吧～</p>
      </div>

      <div className="features-grid">
        <button
          className="feature-card active"
          onClick={() => navigate('/animals')}
        >
          <span className="feature-icon">🐾</span>
          <span className="feature-title">认识动物</span>
          <span className="feature-desc">去认识各种小动物吧！</span>
        </button>

        <div className="feature-card coming-soon">
          <span className="feature-icon">🚀</span>
          <span className="feature-title">更多功能</span>
          <span className="feature-desc">即将推出...</span>
        </div>
      </div>

      <style jsx>{`
        .home-container {
          min-height: 100vh;
          min-height: 100dvh;
          background: linear-gradient(135deg, #FFF8F0 0%, #FFECD2 100%);
          padding: clamp(20px, 5vw, 40px) clamp(16px, 4vw, 32px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .home-header {
          text-align: center;
          margin-bottom: clamp(28px, 6vw, 60px);
        }

        .logo {
          font-size: clamp(72px, 14vw, 120px);
          margin-bottom: clamp(10px, 2vw, 20px);
          animation: bounce 2s infinite;
          line-height: 1;
        }

        .logo-icon {
          display: inline-block;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }

        .app-title {
          font-size: clamp(36px, 7vw, 64px);
          font-weight: 800;
          color: #FF6B6B;
          text-shadow: 3px 3px 0px #FFE66D;
          margin: 0 0 10px;
          line-height: 1.1;
        }

        .app-subtitle {
          font-size: clamp(16px, 3vw, 28px);
          color: #FF9A8B;
          margin: 0;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: clamp(16px, 3vw, 30px);
          max-width: 900px;
          width: 100%;
        }

        .feature-card {
          background: white;
          border: none;
          border-radius: clamp(20px, 3vw, 30px);
          padding: clamp(28px, 6vw, 60px) clamp(20px, 4vw, 40px);
          text-align: center;
          cursor: pointer;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
        }

        .feature-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }

        .feature-card:active {
          transform: translateY(-2px);
        }

        .feature-card.active {
          background: linear-gradient(135deg, #FF9A8B 0%, #FF6B6B 100%);
        }

        .feature-card.active:hover {
          background: linear-gradient(135deg, #FF6B6B 0%, #FF5252 100%);
        }

        .feature-card.coming-soon {
          background: linear-gradient(135deg, #E0E0E0 0%, #BDBDBD 100%);
          cursor: not-allowed;
        }

        .feature-icon {
          display: block;
          font-size: clamp(48px, 9vw, 80px);
          margin-bottom: clamp(10px, 2vw, 20px);
          line-height: 1;
        }

        .feature-title {
          display: block;
          font-size: clamp(20px, 4vw, 32px);
          font-weight: 700;
          color: white;
          margin-bottom: 8px;
        }

        .feature-card.coming-soon .feature-title,
        .feature-card.coming-soon .feature-desc {
          color: #757575;
        }

        .feature-desc {
          display: block;
          font-size: clamp(13px, 2.4vw, 20px);
          color: rgba(255,255,255,0.9);
        }

        /* 平板竖屏：两列保留，但收紧间距 */
        @media (max-width: 1024px) and (min-width: 601px) {
          .features-grid {
            max-width: 720px;
          }
        }

        /* 手机：单列堆叠 */
        @media (max-width: 600px) {
          .features-grid {
            grid-template-columns: 1fr;
          }
        }

        /* 横屏手机：压缩高度，避免溢出 */
        @media (max-height: 500px) and (orientation: landscape) {
          .home-container {
            justify-content: flex-start;
            padding-top: 16px;
          }
          .home-header {
            margin-bottom: 16px;
          }
          .logo {
            font-size: 56px;
            margin-bottom: 4px;
          }
          .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .feature-card {
            padding: 18px 16px;
          }
          .feature-icon {
            font-size: 40px;
            margin-bottom: 6px;
          }
        }
      `}</style>
    </div>
  );
}
