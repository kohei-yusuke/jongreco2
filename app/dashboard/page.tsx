'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Button from 'react-bootstrap/Button';
import GameStartModal from '../components/game/GameStartModal';
import GameHistoryList from './components/GameHistoryList';

export default function Dashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const [showGameStartModal, setShowGameStartModal] = useState(false);

  const handleGameStart = async (players: { name: string; userId?: string; position: string }[]) => {
    try {
      if (!players.every(player => player.name.trim())) {
        console.error('すべてのプレイヤー名を入力してください');
        return;
      }

      const response = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          players: {
            east: { id: players[0].userId, name: players[0].name.trim() },
            south: { id: players[1].userId, name: players[1].name.trim() },
            west: { id: players[2].userId, name: players[2].name.trim() },
            north: { id: players[3].userId, name: players[3].name.trim() }
          },
          settings: {
            initialPoints: 25000,
            returnPoints: 30000,
            uma1: 20,
            uma2: 10,
            uma3: -10,
            uma4: -20,
            chipPoints: 1000,
            chipEnabled: true,
            yakitoriPoints: 2000,
            yakitoriEnabled: true,
          }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/games/${data.id}/score`);
      } else {
        const errorData = await response.json();
        console.error('対局の作成に失敗しました:', errorData.error);
      }
    } catch (error) {
      console.error('エラーが発生しました:', error);
    }
  };

  if (!session) {
    return <div>ログインが必要です</div>;
  }

  return (
    <div className="container py-5">
      <h1 className="mb-4">ダッシュボード</h1>
      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">対局を開始</h5>
              <p className="card-text">新しい麻雀対局を開始します。</p>
              <Button
                variant="primary"
                onClick={() => setShowGameStartModal(true)}
              >
                対局を開始
              </Button>
            </div>
          </div>
        </div>
      </div>

      <GameStartModal
        isOpen={showGameStartModal}
        onClose={() => setShowGameStartModal(false)}
        onStart={handleGameStart}
      />

      <div className="row mt-4">
        <div className="col-md-8">
          <div className="card">
            <div className="card-body">
              <h2 className="card-title h4 mb-4">対局履歴</h2>
              <GameHistoryList />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 