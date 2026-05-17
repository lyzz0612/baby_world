import { useEffect, useState } from 'react';
import { audioService } from '../../services/audioService';

export default function AnimalModal({ animal, color, onClose }) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      await audioService.playAnimalSound(animal.name);
    } finally {
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    handlePlay();
  }, [animal]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>
          ✕
        </button>

        <div className="animal-display">
          <div className={`animal-emoji ${isPlaying ? 'animating' : ''}`}>
            {animal.emoji}
          </div>
          <h2 className="animal-name">{animal.name}</h2>
        </div>

        <div className="sound-section">
          {isPlaying ? (
            <div className="sound-waves">
              <span className="wave"></span>
              <span className="wave"></span>
              <span className="wave"></span>
            </div>
          ) : (
            <button className="replay-button" onClick={handlePlay}>
              ▶ 再听一次
            </button>
          )}
          <p className="sound-text">{isPlaying ? `${animal.name}怎么叫...` : ''}</p>
        </div>

        <style jsx>{`
          .modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            z-index: 1000;
          }

          .modal-content {
            background: white;
            border-radius: 40px;
            padding: 60px 40px;
            max-width: 600px;
            width: 100%;
            text-align: center;
            position: relative;
          }

          .close-button {
            position: absolute;
            top: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: none;
            background: #FF6B6B;
            color: white;
            font-size: 24px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          }

          .close-button:hover {
            background: #FF5252;
            transform: rotate(90deg);
          }

          .animal-display {
            margin-bottom: 40px;
          }

          .animal-emoji {
            font-size: 180px;
            line-height: 1;
            margin-bottom: 20px;
            display: inline-block;
          }

          .animal-emoji.animating {
            animation: shake 0.5s ease-in-out infinite;
          }

          @keyframes shake {
            0%, 100% { transform: rotate(0deg) scale(1); }
            25% { transform: rotate(-5deg) scale(1.05); }
            75% { transform: rotate(5deg) scale(1.05); }
          }

          .animal-name {
            font-size: 48px;
            font-weight: 800;
            color: #333;
            margin: 0;
          }

          .sound-section {
            padding-top: 30px;
            border-top: 2px solid #F0F0F0;
          }

          .sound-waves {
            display: flex;
            justify-content: center;
            gap: 8px;
            margin-bottom: 15px;
          }

          .wave {
            width: 12px;
            height: 40px;
            background: linear-gradient(to top, #FF9A8B, #FF6B6B);
            border-radius: 6px;
            animation: wave 0.6s ease-in-out infinite;
          }

          .wave:nth-child(2) {
            animation-delay: 0.15s;
          }

          .wave:nth-child(3) {
            animation-delay: 0.3s;
          }

          @keyframes wave {
            0%, 100% { transform: scaleY(0.3); }
            50% { transform: scaleY(1); }
          }

          .replay-button {
            background: linear-gradient(135deg, #FF9A8B 0%, #FF6B6B 100%);
            color: white;
            border: none;
            border-radius: 30px;
            padding: 15px 40px;
            font-size: 24px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 6px 20px rgba(255,107,107,0.4);
            transition: all 0.3s ease;
          }

          .replay-button:hover {
            transform: scale(1.05);
            box-shadow: 0 8px 25px rgba(255,107,107,0.5);
          }

          .sound-text {
            font-size: 24px;
            color: #777;
            margin: 15px 0 0;
          }
        `}</style>
      </div>
    </div>
  );
}
