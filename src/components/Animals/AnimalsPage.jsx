import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimalCard from './AnimalCard';
import AnimalModal from './AnimalModal';
import { ANIMALS, getAnimalColor } from '../../data/animals';
import { recordAnimalClick, sortAnimalsByClicks } from '../../services/clickStatsService';

const ITEMS_PER_PAGE = 8;

function chunk(array, size) {
  const pages = [];
  for (let i = 0; i < array.length; i += size) {
    pages.push(array.slice(i, i + size));
  }
  return pages.length ? pages : [[]];
}

export default function AnimalsPage() {
  const navigate = useNavigate();
  const [sortedAnimals, setSortedAnimals] = useState(() => sortAnimalsByClicks(ANIMALS));
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedAnimal, setSelectedAnimal] = useState(null);

  const pages = useMemo(
    () => chunk(sortedAnimals, ITEMS_PER_PAGE),
    [sortedAnimals]
  );

  const totalPages = pages.length;
  const safePageIndex = Math.min(pageIndex, Math.max(0, totalPages - 1));

  useEffect(() => {
    setPageIndex((i) => Math.min(i, Math.max(0, totalPages - 1)));
  }, [totalPages]);

  const goPrev = () => setPageIndex((i) => Math.max(0, i - 1));
  const goNext = () => setPageIndex((i) => Math.min(totalPages - 1, i + 1));

  const handleAnimalClick = (animal) => {
    recordAnimalClick(animal.id);
    setSelectedAnimal(animal);
  };

  const handleModalClose = () => {
    setSelectedAnimal(null);
    const nextSorted = sortAnimalsByClicks(ANIMALS);
    setSortedAnimals(nextSorted);
    const nextTotal = Math.max(1, Math.ceil(nextSorted.length / ITEMS_PER_PAGE));
    setPageIndex((i) => Math.min(i, nextTotal - 1));
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

      <div className="pager">
        <button
          type="button"
          className="page-nav page-nav-prev"
          onClick={goPrev}
          disabled={safePageIndex === 0}
          aria-label="上一页"
        >
          <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
            <path
              d="M15 6 L9 12 L15 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="pager-viewport">
          <div
            className="pager-track"
            style={{ transform: `translateX(-${safePageIndex * 100}%)` }}
          >
            {pages.map((pageAnimals, idx) => (
              <div key={idx} className="pager-page" aria-hidden={idx !== safePageIndex}>
                <div className="animals-grid">
                  {pageAnimals.map((animal) => (
                    <AnimalCard
                      key={animal.id}
                      animal={animal}
                      color={getAnimalColor(animal)}
                      onClick={() => handleAnimalClick(animal)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="page-nav page-nav-next"
          onClick={goNext}
          disabled={safePageIndex >= totalPages - 1}
          aria-label="下一页"
        >
          <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
            <path
              d="M9 6 L15 12 L9 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className="page-dots" role="tablist" aria-label="页码">
        {pages.map((_, idx) => (
          <button
            key={idx}
            type="button"
            role="tab"
            aria-selected={idx === safePageIndex}
            aria-label={`第 ${idx + 1} 页`}
            className={`page-dot ${idx === safePageIndex ? 'active' : ''}`}
            onClick={() => setPageIndex(idx)}
          />
        ))}
      </div>

      <p className="page-hint">
        第 {safePageIndex + 1} / {totalPages} 页 · 点两边大按钮翻页
      </p>

      {selectedAnimal && (
        <AnimalModal
          animal={selectedAnimal}
          color={getAnimalColor(selectedAnimal)}
          onClose={handleModalClose}
        />
      )}

      <style jsx>{`
        .animals-container {
          min-height: 100vh;
          min-height: 100dvh;
          background: linear-gradient(135deg, #FFF8F0 0%, #FFECD2 100%);
          padding: clamp(16px, 3vw, 30px) clamp(12px, 3vw, 32px);
          display: flex;
          flex-direction: column;
        }

        .animals-header {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: clamp(12px, 2vw, 30px);
          margin-bottom: clamp(14px, 2.5vw, 24px);
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

        .pager {
          flex: 1;
          display: flex;
          align-items: center;
          gap: clamp(8px, 1.5vw, 16px);
          min-height: 0;
        }

        .pager-viewport {
          flex: 1;
          overflow: hidden;
          touch-action: pan-y;
          min-width: 0;
        }

        .pager-track {
          display: flex;
          transition: transform 0.35s ease;
          will-change: transform;
        }

        .pager-page {
          flex: 0 0 100%;
          width: 100%;
          min-width: 0;
        }

        .animals-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: clamp(12px, 2vw, 25px);
        }

        .page-nav {
          flex-shrink: 0;
          width: clamp(48px, 8vw, 72px);
          height: clamp(48px, 8vw, 72px);
          border: none;
          border-radius: 50%;
          background: white;
          color: #FF6B6B;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(0,0,0,0.12);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
        }

        .page-nav:hover:not(:disabled) {
          transform: scale(1.06);
          box-shadow: 0 8px 24px rgba(255,107,107,0.25);
        }

        .page-nav:active:not(:disabled) {
          transform: scale(0.95);
        }

        .page-nav:disabled {
          opacity: 0.35;
          cursor: default;
          box-shadow: none;
        }

        .page-dots {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: clamp(16px, 2.5vw, 24px);
        }

        .page-dot {
          width: clamp(12px, 2vw, 16px);
          height: clamp(12px, 2vw, 16px);
          border-radius: 50%;
          border: none;
          padding: 0;
          background: rgba(255, 107, 107, 0.25);
          cursor: pointer;
          transition: transform 0.2s ease, background 0.2s ease;
        }

        .page-dot.active {
          background: #FF6B6B;
          transform: scale(1.25);
        }

        .page-hint {
          text-align: center;
          font-size: clamp(12px, 2vw, 16px);
          color: #999;
          margin: clamp(8px, 1.5vw, 12px) 0 0;
        }

        @media (max-width: 1200px) {
          .animals-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 768px) {
          .animals-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 600px) {
          .animals-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .page-nav {
            width: 44px;
            height: 44px;
          }
        }

        @media (max-width: 360px) {
          .animals-grid {
            gap: 10px;
          }
        }
      `}</style>
    </div>
  );
}
