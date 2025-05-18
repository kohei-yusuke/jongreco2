import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GameStartModal from '../../components/game/GameStartModal';
import { Player, GameSettings } from '../../components/game/types';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface GameHistoryPlayer {
  id: string;
  name: string;
  totalScore: number;
  rank: number;
}

interface GameHistory {
  id: string;
  gameId: string;
  status: string;
  players: GameHistoryPlayer[];
  createdAt: string;
  updatedAt: string;
}

export default function GameHistoryList() {
  const [histories, setHistories] = useState<GameHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGameStartModal, setShowGameStartModal] = useState(false);
  const router = useRouter();

  const handleGameStart = async (players: Player[], settings: GameSettings) => {
    try {
      // プレイヤー情報を位置ごとに整理
      const playersByPosition = {
        east: players.find(p => p.position === 'east'),
        south: players.find(p => p.position === 'south'),
        west: players.find(p => p.position === 'west'),
        north: players.find(p => p.position === 'north')
      };

      // プレイヤーが4人揃っているか確認
      if (!playersByPosition.east || !playersByPosition.south || 
          !playersByPosition.west || !playersByPosition.north) {
        throw new Error('プレイヤーは4人必要です');
      }

      const response = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          players: {
            east: {
              id: playersByPosition.east.userId,
              name: playersByPosition.east.name
            },
            south: {
              id: playersByPosition.south.userId,
              name: playersByPosition.south.name
            },
            west: {
              id: playersByPosition.west.userId,
              name: playersByPosition.west.name
            },
            north: {
              id: playersByPosition.north.userId,
              name: playersByPosition.north.name
            }
          },
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
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '対局の作成に失敗しました');
      }

      const data = await response.json();
      router.push(`/games/${data.id}/score`);
    } catch (error) {
      console.error('対局作成エラー:', error);
      alert(error instanceof Error ? error.message : '対局の作成に失敗しました。もう一度お試しください。');
    }
  };

  useEffect(() => {
    const fetchHistories = async () => {
      try {
        const response = await fetch('/api/games/history');
        if (!response.ok) {
          throw new Error('対局履歴の取得に失敗しました');
        }
        const data = await response.json();
        setHistories(data);
      } catch (error) {
        console.error('Error fetching game histories:', error);
        setError(error instanceof Error ? error.message : '対局履歴の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchHistories();
  }, []);

  return (
    <>
      {loading ? (
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : histories.length === 0 ? (
        <div className="text-center py-5">
          <h3 className="mb-4">対局を記録して新たな歴史を紡ぎましょう!</h3>
          <button
            className="btn btn-primary"
            onClick={() => setShowGameStartModal(true)}
          >
            新規対局作成
          </button>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>日時</th>
                <th>状態</th>
                <th>プレイヤー</th>
                <th>順位</th>
                <th>得点</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {histories.map((history) => (
                <tr key={history.id}>
                  <td>
                    {format(new Date(history.createdAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                  </td>
                  <td>
                    <span className={`badge ${history.status === 'completed' ? 'bg-success' : 'bg-warning'}`}>
                      {history.status === 'completed' ? '完了' : '一時保存'}
                    </span>
                  </td>
                  <td>
                    {history.players.map((player) => (
                      <div key={player.id}>{player.name}</div>
                    ))}
                  </td>
                  <td>
                    {history.players.map((player) => (
                      <div key={player.id}>{player.rank}位</div>
                    ))}
                  </td>
                  <td>
                    {history.players.map((player) => (
                      <div key={player.id}>{player.totalScore.toLocaleString()}点</div>
                    ))}
                  </td>
                  <td>
                    <Link
                      href={`/games/${history.gameId}`}
                      className="btn btn-sm btn-outline-primary"
                    >
                      詳細
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <GameStartModal
        isOpen={showGameStartModal}
        onClose={() => setShowGameStartModal(false)}
        onStart={handleGameStart}
      />
    </>
  );
} 