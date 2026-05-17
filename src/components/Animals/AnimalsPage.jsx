import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimalCard from './AnimalCard';
import AnimalModal from './AnimalModal';
import { CATEGORIES, getAnimalsByCategory } from '../../data/animals';

export default function AnimalsPage() {
  const navigate = useNavigate();
  const [currentCategory, setCurrentCategory] = useState('farm');
  const [selectedAnimal, setSelectedAnimal] = useState(null);

  const animals = getAnimalsByCategory(currentCategory);
  const categoryInfo = CATEGORIES[currentCategory];

  return (
    <div className="animals-container">
      <div className="animals-header">
        <button className="back-button" onClick={() => navigate('/')}>
          ← 返回首页
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
            onClick={() => setSelectedAnimal(animal)}
          />
        ))}
      </div>

      {selectedAnimal && (
        <AnimalModal
          animal={selectedAnimal}
          color={categoryInfo.color}
          onClose={() => setSelectedAnimal(null)}
        />
      )}

      <style jsx>{`
        .animals-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #FFF8F0 0%, #FFECD2 100%);
          padding: 30px 40px;
        }

        .animals-header {
          display: flex;
          align-items: center;
          gap: 30px;
          margin-bottom: 30px;
        }

        .back-button {
          background: white;
          border: none;
          border-radius: 20px;
          padding: 12px 25px;
          font-size: 18px;
          font-weight: 600;
          color: #666;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
        }

        .back-button:hover {
          transform: translateX(-5px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.15);
        }

        .page-title {
          font-size: 48px;
          font-weight: 800;
          color: #FF6B6B;
          margin: 0;
        }

        .category-tabs {
          display: flex;
          gap: 20px;
          margin-bottom: 40px;
        }

        .category-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 20px 30px;
          border: none;
          border-radius: 24px;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
        }

        .category-tab:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        }

        .category-tab.active {
          transform: scale(1.02);
        }

        .tab-icon {
          font-size: 40px;
        }

        .tab-label {
          font-size: 24px;
          font-weight: 700;
          color: white;
        }

        .category-tab:not(.active) .tab-label {
          color: #666;
        }

        .animals-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 25px;
        }

        @media (max-width: 1200px) {
          .animals-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 768px) {
          .animals-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .category-tabs {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
