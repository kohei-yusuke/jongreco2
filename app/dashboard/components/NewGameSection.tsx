import { useState } from 'react';
import GameStartModal from '../../components/game/GameStartModal';
import { useRouter } from 'next/navigation';
import { Player, GameSettings } from '../../components/game/types';

export default function NewGameSection() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const handleGameStart = async (players: Player[], settings: GameSettings) => {
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          players,
          settings,
        }),
      });

      if (!response.ok) {
        throw new Error('対局の作成に失敗しました');
      }

      const data = await response.json();
      router.push(`/games/${data.id}/score`);
    } catch (error) {
      console.error('対局作成エラー:', error);
      alert('対局の作成に失敗しました。もう一度お試しください。');
    }
  };

  return (
    <div className="card mb-4">
      <div className="card-body">
        <h2 className="card-title h4 mb-4">新規対局</h2>
        <p className="card-text mb-4">
          新しい対局を開始して、スコアを記録しましょう。
        </p>
        <button
          className="btn btn-primary"
          onClick={() => setIsModalOpen(true)}
        >
          新規対局作成
        </button>
      </div>

      <GameStartModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStart={handleGameStart}
      />
    </div>
  );
} 