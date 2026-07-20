'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import GameStartModal from '../components/game/GameStartModal';
import GameHistoryList from './components/GameHistoryList';
import { Player, GameSettings } from '../components/game/types';

export default function Dashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const [showGameStartModal, setShowGameStartModal] = useState(false);

  const handleGameStart = async (players: Player[], settings: GameSettings) => {
    try {
      const positions = ['east', 'south', 'west', 'north'] as const;
      const hasAll = positions.every((pos) => players.some((p) => p.position === pos));
      if (players.length !== 4 || !hasAll) {
        throw new Error('プレイヤーは4人必要です');
      }

      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players, settings }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '対局の作成に失敗しました');
      }

      const data = await response.json();
      router.push(`/games/${data.id}/score`);
    } catch (error) {
      console.error('対局作成エラー:', error);
      alert(error instanceof Error ? error.message : '対局の作成に失敗しました。もう一度お試しください。');
    }
  };

  if (!session) {
    return (
      <div className="page-wrap">
        <div className="jr-card"><div className="jr-card-body empty-state">ログインが必要です</div></div>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <div className="hero mb-4">
        <span className="jr-chip mb-2" style={{ background: 'rgba(255,255,255,.15)', color: '#fff' }}>
          ようこそ{session.user?.name ? `、${session.user.name} さん` : ''}
        </span>
        <h2>次の半荘を始めましょう</h2>
        <p>点数を入力するだけで、ウマ・オカ・返し点・焼き鳥まで自動精算。卓の記録をそのまま残せます。</p>
        <button className="jr-btn jr-btn-primary" onClick={() => setShowGameStartModal(true)}>
          <i className="bi bi-plus-lg" /> 新規対局を作成
        </button>
      </div>

      <div className="jr-card">
        <div className="jr-card-head">
          <h5 className="jr-card-title">🀄 対局履歴</h5>
        </div>
        <div className="jr-card-body">
          <GameHistoryList />
        </div>
      </div>

      <GameStartModal
        isOpen={showGameStartModal}
        onClose={() => setShowGameStartModal(false)}
        onStart={handleGameStart}
      />
    </div>
  );
} 