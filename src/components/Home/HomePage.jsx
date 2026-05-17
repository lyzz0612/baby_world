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
          background: linear-gradient(135deg, #FFF8F0 0%, #FFECD2 100%);
          padding: 40px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .home-header {
          text-align: center;
          margin-bottom: 60px;
        }

        .logo {
          font-size: 120px;
          margin-bottom: 20px;
          animation: bounce 2s infinite;
        }

        .logo-icon {
          display: inline-block;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }

        .app-title {
          font-size: 64px;
          font-weight: 800;
          color: #FF6B6B;
          text-shadow: 3px 3px 0px #FFE66D;
          margin: 0 0 10px;
        }

        .app-subtitle {
          font-size: 28px;
          color: #FF9A8B;
          margin: 0;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 30px;
          max-width: 900px;
          width: 100%;
        }

        .feature-card {
          background: white;
          border: none;
          border-radius: 30px;
          padding: 60px 40px;
          text-align: center;
          cursor: pointer;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
        }

        .feature-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.15);
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
          font-size: 80px;
          margin-bottom: 20px;
        }

        .feature-title {
          display: block;
          font-size: 32px;
          font-weight: 700;
          color: white;
          margin-bottom: 10px;
        }

        .feature-card.coming-soon .feature-title,
        .feature-card.coming-soon .feature-desc {
          color: #757575;
        }

        .feature-desc {
          display: block;
          font-size: 20px;
          color: rgba(255,255,255,0.9);
        }

        @media (max-width: 768px) {
          .features-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
