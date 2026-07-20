import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GameStartModal from '../../components/game/GameStartModal';
import { Player, GameSettings } from '../../components/game/types';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface GameHistory {
  id: string;
  gameId: string;
  status: string;
  players: {
    player: {
      id: string;
      name: string;
      userId: string;
    };
    totalScore: number;
    rank: number;
  }[];
  createdAt: string;
  updatedAt: string;
}

export default function GameHistoryList() {
  const [histories, setHistories] = useState<GameHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGameStartModal, setShowGameStartModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchGameHistories();
  }, []);

  const fetchGameHistories = async () => {
    try {
      const response = await fetch('/api/games/history');
      if (!response.ok) {
        throw new Error('対局履歴の取得に失敗しました');
      }
      const data = await response.json();
      setHistories(data);
    } catch (err) {
      console.error('Error fetching game histories:', err);
      setError('対局履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleGameStart = async (players: Player[], settings: GameSettings) => {
    try {
      const positions = ['east', 'south', 'west', 'north'] as const;
      const hasAll = positions.every((pos) => players.some((p) => p.position === pos));
      if (players.length !== 4 || !hasAll) {
        throw new Error('プレイヤーは4人必要です');
      }

      // API は players を配列で受け取る（NewGameSection と同じ契約）
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

  // history route が保存する totalScore は「千点単位 × 10（0.1点刻み）」の整数。
  const formatTotal = (totalScore: number): string => {
    const v = totalScore / 10;
    return (v > 0 ? '+' : '') + v.toFixed(1);
  };

  return (
    <>
      {loading ? (
        <div className="d-flex justify-content-center my-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : error ? (
        <div className="jr-alert">{error}</div>
      ) : histories.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">🀄</div>
          <h3 className="fw-bold mt-2 mb-1" style={{ fontSize: '1.1rem' }}>まだ記録がありません</h3>
          <p className="mb-3">最初の一戦を記録して、卓の歴史を紡ぎましょう。</p>
          <button className="jr-btn jr-btn-primary" onClick={() => setShowGameStartModal(true)}>
            <i className="bi bi-plus-lg" /> 新規対局を作成
          </button>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="jr-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>日時</th>
                <th>状態</th>
                <th style={{ textAlign: 'left' }}>プレイヤー / 得点</th>
                <th style={{ width: 64 }}></th>
              </tr>
            </thead>
            <tbody>
              {histories.map((history) => (
                <tr key={history.id}>
                  <td style={{ textAlign: 'left', color: 'var(--jr-ink-soft)', fontWeight: 600 }}>
                    {format(new Date(history.createdAt), 'M/d HH:mm', { locale: ja })}
                  </td>
                  <td>
                    <span className={`status-pill ${history.status === 'completed' ? 'status-done' : 'status-draft'}`}>
                      {history.status === 'completed' ? '完了' : '下書き'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'left' }}>
                    <div className="d-flex flex-column gap-1">
                      {history.players.map((player) => (
                        <div key={player.player.id} className="d-flex align-items-center justify-content-between gap-3" style={{ minWidth: 180 }}>
                          <span className="d-inline-flex align-items-center gap-2 text-truncate">
                            <span className="rank-pill">{['🥇', '🥈', '🥉', ''][player.rank - 1]}{player.rank}</span>
                            <span className="text-truncate">{player.player.name}</span>
                          </span>
                          <span
                            className={`val tnum ${player.totalScore > 0 ? 'val-pos' : player.totalScore < 0 ? 'val-neg' : 'val-zero'}`}
                          >
                            {formatTotal(player.totalScore)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td>
                    <Link href={`/games/${history.gameId}`} className="jr-link" style={{ fontSize: '.85rem' }}>
                      詳細 ›
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