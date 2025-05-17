import { useState, useEffect } from 'react';
import Link from 'next/link';
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

  if (loading) {
    return (
      <div className="d-flex justify-content-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  if (histories.length === 0) {
    return (
      <div className="text-center py-5">
        <h3 className="mb-4">対局を記録して新たな歴史を紡ぎましょう!</h3>
        <Link href="/games/new" className="btn btn-primary">
          新規対局を始める
        </Link>
      </div>
    );
  }

  return (
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
  );
} 