'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ScoreInputProps {
  gameId: string;
  players: {
    id: string;
    name: string;
    position: 'east' | 'south' | 'west' | 'north';
    user?: {
      name: string;
    };
  }[];
  onScoreChange: (scores: Record<string, number>) => void;
  gameSettings: {
    uma: {
      first: number;
      second: number;
      third: number;
      fourth: number;
    };
    yakitori: number;
    initialPoints: number;
    returnPoints: number;
  };
}

interface PlayerScore {
  id: string;
  name: string;
  position: 'east' | 'south' | 'west' | 'north';
  rawScore: number;
  yakitori: boolean;
  uma: number;
  totalScore: number;
  rank: number;
}

export default function ScoreInput({ gameId, players, onScoreChange, gameSettings }: ScoreInputProps) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<string, string>>({});
  const [yakitori, setYakitori] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculatedScores, setCalculatedScores] = useState<PlayerScore[]>([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // 初期スコアの設定
  useEffect(() => {
    const initialScores: Record<string, string> = {};
    const initialYakitori: Record<string, boolean> = {};
    players.forEach(player => {
      initialScores[player.id] = '';
      initialYakitori[player.id] = false;
    });
    setScores(initialScores);
    setYakitori(initialYakitori);
  }, [players]);

  // スコアの計算
  useEffect(() => {
    const calculateScores = () => {
      const playerScores: PlayerScore[] = players.map(player => {
        const rawScore = parseInt(scores[player.id]) || 0;
        const yakitoriPoints = yakitori[player.id] ? -gameSettings.yakitori * 3 : 0;
        const rank = getRank(rawScore);
        const uma = getUma(rank);
        const totalScore = Number((rawScore / 10 + uma + yakitoriPoints).toFixed(1));

        return {
          id: player.id,
          name: player.name,
          position: player.position,
          rawScore,
          yakitori: yakitori[player.id],
          uma,
          totalScore,
          rank: 0, // 一時的な値
        };
      });

      // 合計点でソートして順位を付ける
      const sortedScores = [...playerScores].sort((a, b) => b.totalScore - a.totalScore);
      sortedScores.forEach((score, index) => {
        score.rank = index + 1;
      });

      setCalculatedScores(sortedScores);
    };

    calculateScores();
  }, [scores, yakitori, players, gameSettings]);

  const getRank = (score: number) => {
    const sortedScores = Object.values(scores)
      .map(s => parseInt(s) || 0)
      .sort((a, b) => b - a);
    return sortedScores.indexOf(score) + 1;
  };

  const getUma = (rank: number) => {
    switch (rank) {
      case 1: return gameSettings.uma.first;
      case 2: return gameSettings.uma.second;
      case 3: return gameSettings.uma.third;
      case 4: return gameSettings.uma.fourth;
      default: return 0;
    }
  };

  const handleScoreChange = useCallback((playerId: string, value: string) => {
    // 数値以外の入力を無視
    if (value !== '' && !/^-?\d*$/.test(value)) {
      return;
    }

    setScores(prev => {
      const newScores = { ...prev, [playerId]: value };
      // 数値に変換して親コンポーネントに通知
      const numericScores: Record<string, number> = {};
      Object.entries(newScores).forEach(([id, score]) => {
        numericScores[id] = score === '' ? 0 : parseInt(score, 10);
      });
      onScoreChange(numericScores);
      return newScores;
    });
  }, [onScoreChange]);

  const handleYakitoriChange = useCallback((playerId: string, checked: boolean) => {
    setYakitori(prev => ({ ...prev, [playerId]: checked }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const numericScores: Record<string, number> = {};
      Object.entries(scores).forEach(([id, score]) => {
        numericScores[id] = score === '' ? 0 : parseInt(score, 10);
      });

      const response = await fetch(`/api/games/${gameId}/scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scores: numericScores,
          yakitori: yakitori,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save scores');
      }

      router.refresh();
      // 入力フィールドをクリア
      const clearedScores: Record<string, string> = {};
      const clearedYakitori: Record<string, boolean> = {};
      players.forEach(player => {
        clearedScores[player.id] = '';
        clearedYakitori[player.id] = false;
      });
      setScores(clearedScores);
      setYakitori(clearedYakitori);
    } catch (error) {
      console.error('Error saving scores:', error);
      alert('スコアの保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card">
      <div className="card-body">
        <div className="table-responsive">
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>項目</th>
                {players.map(player => (
                  <th key={player.id}>
                    {player.user?.name || player.name}
                    <br />
                    <small className="text-muted">
                      {player.position === 'east' && '東家'}
                      {player.position === 'south' && '南家'}
                      {player.position === 'west' && '西家'}
                      {player.position === 'north' && '北家'}
                    </small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>素点</td>
                {players.map(player => (
                  <td key={player.id}>
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        value={scores[player.id] || ''}
                        onChange={(e) => handleScoreChange(player.id, e.target.value)}
                        placeholder="点数"
                        inputMode="numeric"
                      />
                      <span className="input-group-text">00</span>
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <td>焼き鳥</td>
                {players.map(player => (
                  <td key={player.id}>
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={yakitori[player.id] || false}
                        onChange={(e) => handleYakitoriChange(player.id, e.target.checked)}
                      />
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <td>ウマ</td>
                {players.map(player => (
                  <td key={player.id}>
                    {calculatedScores.find(score => score.id === player.id)?.uma.toLocaleString() || '0'}
                  </td>
                ))}
              </tr>
              <tr>
                <td>合計</td>
                {players.map(player => (
                  <td key={player.id}>
                    {calculatedScores.find(score => score.id === player.id)?.totalScore.toFixed(1) || '0.0'}
                  </td>
                ))}
              </tr>
              <tr>
                <td>順位</td>
                {players.map(player => (
                  <td key={player.id}>
                    {calculatedScores.find(score => score.id === player.id)?.rank || '-'}位
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="text-center mt-3">
          <button
            type="submit"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? '保存中...' : '登録'}
          </button>
        </div>
      </div>

      {/* 詳細設定モーダル */}
      {showSettingsModal && (
        <div className="modal show d-block" tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">対局設定</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowSettingsModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <h6>基本設定</h6>
                  <div className="row">
                    <div className="col-6">
                      <p>初期持ち点: {gameSettings.initialPoints.toLocaleString()}</p>
                      <p>返り点: {gameSettings.returnPoints.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <h6>ウマ設定</h6>
                  <div className="row">
                    <div className="col-6">
                      <p>1位: {gameSettings.uma.first.toLocaleString()}</p>
                      <p>2位: {gameSettings.uma.second.toLocaleString()}</p>
                    </div>
                    <div className="col-6">
                      <p>3位: {gameSettings.uma.third.toLocaleString()}</p>
                      <p>4位: {gameSettings.uma.fourth.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <h6>焼き鳥設定</h6>
                  <p>焼き鳥: {gameSettings.yakitori.toLocaleString()}</p>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowSettingsModal(false)}
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showSettingsModal && <div className="modal-backdrop show"></div>}
    </div>
  );
} 