import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimalCard from './AnimalCard';
import { CATEGORIES, getAnimalsByCategory } from '../../data/animals';
import { audioService } from '../../services/audioService';

export default function AnimalsPage() {
  const navigate = useNavigate();
  const [currentCategory, setCurrentCategory] = useState('farm');
  const playTokenRef = useRef(0);

  const animals = getAnimalsByCategory(currentCategory);
  const categoryInfo = CATEGORIES[currentCategory];

  const handleAnimalClick = async (animal) => {
    const token = ++playTokenRef.current;
    await audioService.stop();
    try {
      await audioService.playAnimalSound(animal);
    } catch {
      // 忽略播放错误
    }
  };

  return (
    <div className="animals-container">
      <div className="animals-header">
        <button
          className="back-button"
          onClick={() => navigate('/')}
          aria-label="返回首页"
          title="返回首页"
        >
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
            <path
              d="M15 6 L9 12 L15 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="page-title">认识动物</h1>
      </div>

      <div className="category-tabs">
        {Object.entries(CATEGORIES).map(([key, value]) => (
          <button
            key={key}
            className={`category-tab ${currentCategory === key ? 'active' : ''}`}
            style={{
              background: currentCategory === key ? value.color : 'white'
            }}
            onClick={() => setCurrentCategory(key)}
          >
            <span className="tab-icon">{value.icon}</span>
            <span className="tab-label">{value.label}</span>
          </button>
        ))}
      </div>

      <div className="animals-grid">
        {animals.map((animal) => (
          <AnimalCard
            key={animal.id}
            animal={animal}
            color={categoryInfo.color}
            onClick={() => handleAnimalClick(animal)}
          />
        ))}
      </div>

      <style jsx>{`
        .animals-container {
          min-height: 100vh;
          min-height: 100dvh;
          background: linear-gradient(135deg, #FFF8F0 0%, #FFECD2 100%);
          padding: clamp(16px, 3vw, 30px) clamp(16px, 4vw, 40px);
        }

        .animals-header {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: clamp(12px, 2vw, 30px);
          margin-bottom: clamp(18px, 3vw, 30px);
        }

        .back-button {
          width: clamp(44px, 6vw, 52px);
          height: clamp(44px, 6vw, 52px);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: white;
          border: none;
          border-radius: 50%;
          color: #666;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transition: all 0.25s ease;
          padding: 0;
        }

        .back-button:hover {
          transform: translateX(-4px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.15);
          color: #FF6B6B;
        }

        .back-button:active {
          transform: translateX(-2px) scale(0.96);
        }

        .back-button svg {
          display: block;
          width: clamp(22px, 3vw, 28px);
          height: clamp(22px, 3vw, 28px);
        }

        .page-title {
          font-size: clamp(24px, 5vw, 48px);
          font-weight: 800;
          color: #FF6B6B;
          margin: 0;
          line-height: 1.1;
        }

        .category-tabs {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: clamp(10px, 1.6vw, 20px);
          margin-bottom: clamp(20px, 3vw, 40px);
        }

        .category-tab {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: clamp(6px, 1vw, 10px);
          padding: clamp(12px, 2vw, 20px) clamp(12px, 2.5vw, 30px);
          border: none;
          border-radius: clamp(16px, 2vw, 24px);
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
          min-width: 0;
        }

        .category-tab:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        }

        .category-tab.active {
          transform: scale(1.02);
        }

        .tab-icon {
          font-size: clamp(24px, 4vw, 40px);
          line-height: 1;
        }

        .tab-label {
          font-size: clamp(14px, 2.4vw, 24px);
          font-weight: 700;
          color: white;
          white-space: nowrap;
        }

        .category-tab:not(.active) .tab-label {
          color: #666;
        }

        .animals-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: clamp(12px, 2vw, 25px);
        }

        /* 大屏平板 */
        @media (max-width: 1200px) {
          .animals-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        /* 平板/小平板 */
        @media (max-width: 768px) {
          .animals-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        /* 手机 */
        @media (max-width: 600px) {
          .animals-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .category-tab {
            flex-direction: column;
            gap: 4px;
            padding: 10px 6px;
          }
        }

        /* 超窄屏 */
        @media (max-width: 360px) {
          .animals-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
        }
      `}</style>
    </div>
  );
}
