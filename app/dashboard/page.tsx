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
      console.log('handleGameStart - 受け取ったプレイヤー情報:', players);
      console.log('handleGameStart - 受け取った設定情報:', settings);

      // プレイヤー情報を位置ごとに整理
      const playersByPosition = {
        east: players.find(p => p.position === 'east'),
        south: players.find(p => p.position === 'south'),
        west: players.find(p => p.position === 'west'),
        north: players.find(p => p.position === 'north')
      };

      console.log('handleGameStart - 位置ごとのプレイヤー情報:', playersByPosition);

      // プレイヤーが4人揃っているか確認
      if (!playersByPosition.east || !playersByPosition.south || 
          !playersByPosition.west || !playersByPosition.north) {
        throw new Error('プレイヤーは4人必要です');
      }

      const requestBody = {
        players: [
          {
            position: 'east',
            userId: playersByPosition.east.userId,
            name: playersByPosition.east.name
          },
          {
            position: 'south',
            userId: playersByPosition.south.userId,
            name: playersByPosition.south.name
          },
          {
            position: 'west',
            userId: playersByPosition.west.userId,
            name: playersByPosition.west.name
          },
          {
            position: 'north',
            userId: playersByPosition.north.userId,
            name: playersByPosition.north.name
          }
        ],
        settings: {
          initialPoints: settings.initialPoints,
          returnPoints: settings.returnPoints,
          chipPoints: settings.chipPoints,
          yakitoriPoints: settings.yakitoriPoints,
          uma1: settings.uma1,
          uma2: settings.uma2,
          uma3: settings.uma3,
          uma4: settings.uma4,
          chipEnabled: settings.chipEnabled,
          yakitoriEnabled: settings.yakitoriEnabled,
          yakitoriMode: settings.yakitoriMode
        }
      };

      console.log('handleGameStart - APIリクエストボディ:', requestBody);

      const response = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '対局の作成に失敗しました');
      }

      const data = await response.json();
      console.log('handleGameStart - APIレスポンス:', data);
      router.push(`/games/${data.id}/score`);
    } catch (error) {
      console.error('対局作成エラー:', error);
      alert(error instanceof Error ? error.message : '対局の作成に失敗しました。もう一度お試しください。');
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
              <button
                className="btn btn-primary"
                onClick={() => setShowGameStartModal(true)}
              >
                新規対局作成
              </button>
            </div>
          </div>
        </div>
      </div>

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

      <GameStartModal
        isOpen={showGameStartModal}
        onClose={() => setShowGameStartModal(false)}
        onStart={handleGameStart}
      />
    </div>
  );
} 