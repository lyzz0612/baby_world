import { useEffect, useRef, useState } from 'react';
import { audioService } from '../../services/audioService';

export default function AnimalModal({ animal, color, onClose }) {
  const [isPlaying, setIsPlaying] = useState(false);
  // 本地令牌：只有最新一次播放的 finally 才能把 isPlaying 复位，
  // 防止"切换动物后旧序列收尾把新一次的播放状态清掉"。
  const playTokenRef = useRef(0);

  const handlePlay = async () => {
    const token = ++playTokenRef.current;
    await audioService.stop();
    setIsPlaying(true);
    try {
      await audioService.playAnimalSound(animal);
    } finally {
      if (playTokenRef.current === token) {
        setIsPlaying(false);
      }
    }
  };

  const handleClose = () => {
    playTokenRef.current++;
    audioService.stop();
    onClose();
  };

  useEffect(() => {
    handlePlay();
    return () => {
      playTokenRef.current++;
      audioService.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animal]);

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={handleClose}>
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
            padding: clamp(12px, 3vw, 20px);
            z-index: 1000;
            overflow-y: auto;
          }

          .modal-content {
            background: white;
            border-radius: clamp(24px, 4vw, 40px);
            padding: clamp(32px, 5vw, 60px) clamp(20px, 4vw, 40px);
            max-width: 600px;
            width: 100%;
            max-height: calc(100dvh - 32px);
            overflow-y: auto;
            text-align: center;
            position: relative;
          }

          .modal-content .close-button {
            position: absolute;
            top: clamp(12px, 2vw, 20px);
            right: clamp(12px, 2vw, 20px);
            width: clamp(38px, 6vw, 50px);
            height: clamp(38px, 6vw, 50px);
            border-radius: 50%;
            border: none;
            background: #FF6B6B;
            color: white;
            font-size: clamp(18px, 2.5vw, 24px);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            z-index: 1;
          }

          .modal-content .close-button:hover {
            background: #FF5252;
            transform: rotate(90deg);
          }

          .modal-content .animal-display {
            margin-bottom: clamp(20px, 4vw, 40px);
          }

          .modal-content .animal-emoji {
            font-size: clamp(96px, 22vw, 180px);
            line-height: 1;
            margin-bottom: clamp(10px, 2vw, 20px);
            display: inline-block;
          }

          .modal-content .animal-emoji.animating {
            animation: shake 0.5s ease-in-out infinite;
          }

          @keyframes shake {
            0%, 100% { transform: rotate(0deg) scale(1); }
            25% { transform: rotate(-5deg) scale(1.05); }
            75% { transform: rotate(5deg) scale(1.05); }
          }

          .modal-content .animal-name {
            font-size: clamp(28px, 5vw, 48px);
            font-weight: 800;
            color: #333;
            margin: 0;
            line-height: 1.1;
          }

          .modal-content .sound-section {
            padding-top: clamp(16px, 3vw, 30px);
            border-top: 2px solid #F0F0F0;
          }

          .modal-content .sound-waves {
            display: flex;
            justify-content: center;
            gap: 8px;
            margin-bottom: 15px;
          }

          .modal-content .wave {
            width: clamp(8px, 1.5vw, 12px);
            height: clamp(28px, 5vw, 40px);
            background: linear-gradient(to top, #FF9A8B, #FF6B6B);
            border-radius: 6px;
            animation: wave 0.6s ease-in-out infinite;
          }

          .modal-content .wave:nth-child(2) { animation-delay: 0.15s; }
          .modal-content .wave:nth-child(3) { animation-delay: 0.3s; }

          @keyframes wave {
            0%, 100% { transform: scaleY(0.3); }
            50% { transform: scaleY(1); }
          }

          .modal-content .replay-button {
            background: linear-gradient(135deg, #FF9A8B 0%, #FF6B6B 100%);
            color: white;
            border: none;
            border-radius: clamp(20px, 3vw, 30px);
            padding: clamp(10px, 1.8vw, 15px) clamp(24px, 4vw, 40px);
            font-size: clamp(16px, 2.8vw, 24px);
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 6px 20px rgba(255,107,107,0.4);
            transition: all 0.3s ease;
          }

          .modal-content .replay-button:hover {
            transform: scale(1.05);
            box-shadow: 0 8px 25px rgba(255,107,107,0.5);
          }

          .modal-content .sound-text {
            font-size: clamp(15px, 2.6vw, 24px);
            color: #777;
            margin: 15px 0 0;
            min-height: 1.2em;
          }

          /* 横屏手机：弹窗变紧凑 */
          @media (max-height: 500px) and (orientation: landscape) {
            .modal-content {
              padding: 24px 32px;
            }
            .modal-content .animal-display {
              margin-bottom: 16px;
            }
            .modal-content .animal-emoji {
              font-size: 72px;
              margin-bottom: 6px;
            }
            .modal-content .animal-name {
              font-size: 24px;
            }
            .modal-content .sound-section {
              padding-top: 12px;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
