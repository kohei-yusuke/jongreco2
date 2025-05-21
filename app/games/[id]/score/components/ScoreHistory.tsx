'use client';

import { useState, useEffect } from 'react';

interface Score {
  id: string;
  round: number;
  east: number;
  south: number;
  west: number;
  north: number;
  yakitori?: {
    east: boolean;
    south: boolean;
    west: boolean;
    north: boolean;
  };
}

interface Player {
  id: string;
  name: string;
  position: 'east' | 'south' | 'west' | 'north';
  user?: {
    name: string;
  };
}

interface ScoreHistoryProps {
  gameId: string;
  onScoreUpdate?: () => void;
  chipEnabled?: boolean;
  chipPoints?: number;
}

export default function ScoreHistory({ gameId, onScoreUpdate, chipEnabled, chipPoints }: ScoreHistoryProps) {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmScore, setDeleteConfirmScore] = useState<Score | null>(null);
  const [chipInputs, setChipInputs] = useState<Record<string, { value: string; isPositive: boolean }>>({
    east: { value: '', isPositive: true },
    south: { value: '', isPositive: true },
    west: { value: '', isPositive: true },
    north: { value: '', isPositive: true }
  });

  const fetchScores = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/games/${gameId}/scores`);
      if (!response.ok) {
        throw new Error('スコアデータの取得に失敗しました');
      }
      const data = await response.json();
      setScores(data.scores || []);
    } catch (error) {
      console.error('Error fetching scores:', error);
      setError(error instanceof Error ? error.message : 'スコアデータの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScores();
  }, [gameId]);

  // スコアが更新されたときに履歴を更新
  useEffect(() => {
    if (onScoreUpdate) {
      fetchScores();
    }
  }, [onScoreUpdate]);

  const handleDelete = async (score: Score) => {
    try {
      const response = await fetch(`/api/games/${gameId}/scores/${score.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('スコアの削除に失敗しました');
      }

      // スコアリストを更新
      await fetchScores();
      // 親コンポーネントに更新を通知
      if (onScoreUpdate) {
        onScoreUpdate();
      }
    } catch (error) {
      console.error('Error deleting score:', error);
      alert('スコアの削除に失敗しました');
    } finally {
      setDeleteConfirmScore(null);
    }
  };

  const handleChipChange = (position: string, value: string) => {
    if (value !== '' && !/^\d*$/.test(value)) {
      return;
    }
    setChipInputs(prev => ({
      ...prev,
      [position]: { ...prev[position], value }
    }));
  };

  const toggleChipSign = (position: string) => {
    setChipInputs(prev => ({
      ...prev,
      [position]: { ...prev[position], isPositive: !prev[position].isPositive }
    }));
  };

  const calculateChipPoints = (position: string) => {
    const input = chipInputs[position];
    if (!input.value) return 0;
    const points = parseInt(input.value) * (chipPoints || 0);
    return input.isPositive ? points : -points;
  };

  // 総得点の計算を修正
  const calculateTotalScores = () => {
    const totals = {
      east: 0,
      south: 0,
      west: 0,
      north: 0
    };

    // 各プレイヤーの総得点を計算
    scores.forEach(score => {
      totals.east += score.east;
      totals.south += score.south;
      totals.west += score.west;
      totals.north += score.north;
    });

    // チップポイントを加算
    if (chipEnabled) {
      totals.east += calculateChipPoints('east');
      totals.south += calculateChipPoints('south');
      totals.west += calculateChipPoints('west');
      totals.north += calculateChipPoints('north');
    }

    // 順位付け
    const sortedScores = Object.entries(totals)
      .map(([position, total]) => ({
        position,
        total,
      }))
      .sort((a, b) => b.total - a.total);

    return {
      totals,
      ranks: sortedScores.reduce((acc, { position }, index) => {
        acc[position] = index + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center my-3">
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

  const { totals, ranks } = calculateTotalScores();

  return (
    <div className="card mt-4">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="card-title mb-0">スコア履歴</h5>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={fetchScores}
        >
          更新
        </button>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-bordered mb-0">
            <thead>
              <tr>
                <th className="w-10 text-center">局</th>
                <th className="w-22 text-center">東家</th>
                <th className="w-22 text-center">南家</th>
                <th className="w-22 text-center">西家</th>
                <th className="w-22 text-center">北家</th>
                <th className="w-10 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score) => (
                <tr key={score.id}>
                  <td className="text-center">{score.round}</td>
                  <td className={`text-end ${score.east > 0 ? 'text-success' : score.east < 0 ? 'text-danger' : ''}`}>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="d-none d-sm-inline">{score.east.toLocaleString()}</span>
                      <span className="d-inline d-sm-none">{score.east.toLocaleString()}</span>
                      {score.yakitori?.east && <span className="ms-1">🐔</span>}
                    </div>
                  </td>
                  <td className={`text-end ${score.south > 0 ? 'text-success' : score.south < 0 ? 'text-danger' : ''}`}>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="d-none d-sm-inline">{score.south.toLocaleString()}</span>
                      <span className="d-inline d-sm-none">{score.south.toLocaleString()}</span>
                      {score.yakitori?.south && <span className="ms-1">🐔</span>}
                    </div>
                  </td>
                  <td className={`text-end ${score.west > 0 ? 'text-success' : score.west < 0 ? 'text-danger' : ''}`}>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="d-none d-sm-inline">{score.west.toLocaleString()}</span>
                      <span className="d-inline d-sm-none">{score.west.toLocaleString()}</span>
                      {score.yakitori?.west && <span className="ms-1">🐔</span>}
                    </div>
                  </td>
                  <td className={`text-end ${score.north > 0 ? 'text-success' : score.north < 0 ? 'text-danger' : ''}`}>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="d-none d-sm-inline">{score.north.toLocaleString()}</span>
                      <span className="d-inline d-sm-none">{score.north.toLocaleString()}</span>
                      {score.yakitori?.north && <span className="ms-1">🐔</span>}
                    </div>
                  </td>
                  <td className="text-center">
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => setDeleteConfirmScore(score)}
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
              {chipEnabled && (
                <tr className="table-light">
                  <td className="text-center">チップ</td>
                  {['east', 'south', 'west', 'north'].map(position => (
                    <td key={position} className="text-end">
                      <div className="input-group input-group-sm">
                        <button
                          className="btn btn-outline-secondary"
                          type="button"
                          onClick={() => toggleChipSign(position)}
                        >
                          {chipInputs[position].isPositive ? '+' : '-'}
                        </button>
                        <input
                          type="text"
                          className="form-control"
                          value={chipInputs[position].value}
                          onChange={(e) => handleChipChange(position, e.target.value)}
                          placeholder="枚数"
                        />
                        <span className="input-group-text">枚</span>
                      </div>
                    </td>
                  ))}
                  <td></td>
                </tr>
              )}
              <tr className="table-secondary">
                <td className="text-center">総得点</td>
                <td className={`text-end ${totals.east > 0 ? 'text-success' : totals.east < 0 ? 'text-danger' : ''}`}>
                  {totals.east.toLocaleString()}
                </td>
                <td className={`text-end ${totals.south > 0 ? 'text-success' : totals.south < 0 ? 'text-danger' : ''}`}>
                  {totals.south.toLocaleString()}
                </td>
                <td className={`text-end ${totals.west > 0 ? 'text-success' : totals.west < 0 ? 'text-danger' : ''}`}>
                  {totals.west.toLocaleString()}
                </td>
                <td className={`text-end ${totals.north > 0 ? 'text-success' : totals.north < 0 ? 'text-danger' : ''}`}>
                  {totals.north.toLocaleString()}
                </td>
                <td></td>
              </tr>
              <tr className="table-secondary">
                <td className="text-center">順位</td>
                <td className="text-center">
                  {ranks.east === 1 ? '👑 ' : ''}{ranks.east}位
                </td>
                <td className="text-center">
                  {ranks.south === 1 ? '👑 ' : ''}{ranks.south}位
                </td>
                <td className="text-center">
                  {ranks.west === 1 ? '👑 ' : ''}{ranks.west}位
                </td>
                <td className="text-center">
                  {ranks.north === 1 ? '👑 ' : ''}{ranks.north}位
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 削除確認モーダル */}
      {deleteConfirmScore && (
        <div className="modal show d-block" tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">スコアの削除</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setDeleteConfirmScore(null)}
                ></button>
              </div>
              <div className="modal-body">
                <p>{deleteConfirmScore.round}局のスコアを削除してもよろしいですか？</p>
                <p className="text-danger">この操作は取り消せません。</p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDeleteConfirmScore(null)}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleDelete(deleteConfirmScore)}
                >
                  削除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {deleteConfirmScore && <div className="modal-backdrop show"></div>}
    </div>
  );
} 