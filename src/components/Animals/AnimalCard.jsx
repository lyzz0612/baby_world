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
          border-radius: 24px;
          padding: 30px;
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
          font-size: 100px;
          line-height: 1.2;
          margin-bottom: 15px;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
        }

        .animal-name {
          font-size: 28px;
          font-weight: 700;
          color: #333;
        }
      `}</style>
    </div>
  );
}
