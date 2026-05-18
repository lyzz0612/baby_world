export default function AnimalCard({ animal, onClick, color }) {
  return (
    <div
      className="animal-card"
      onClick={onClick}
    >
      <div className="animal-emoji">{animal.emoji}</div>
      <div className="animal-name">{animal.name}</div>

      <style jsx>{`
        .animal-card {
          background: white;
          border-radius: clamp(16px, 2vw, 24px);
          padding: clamp(14px, 2.5vw, 30px) clamp(10px, 2vw, 30px);
          text-align: center;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
        }

        .animal-card:hover {
          transform: translateY(-5px) scale(1.02);
          box-shadow: 0 12px 30px rgba(0,0,0,0.15);
        }

        .animal-card:active {
          transform: translateY(0) scale(0.98);
        }

        .animal-emoji {
          font-size: clamp(48px, 9vw, 100px);
          line-height: 1.2;
          margin-bottom: clamp(8px, 1.5vw, 15px);
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
        }

        .animal-name {
          font-size: clamp(16px, 2.6vw, 28px);
          font-weight: 700;
          color: #333;
          line-height: 1.2;
        }
      `}</style>
    </div>
  );
}
