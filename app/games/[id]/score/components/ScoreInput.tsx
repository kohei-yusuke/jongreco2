'use client';

import { useState, useCallback, useEffect } from 'react';
import * as bootstrap from 'bootstrap';

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
  const [scores, setScores] = useState<Record<string, string>>({});
  const [yakitori, setYakitori] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculatedScores, setCalculatedScores] = useState<PlayerScore[]>([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);

  const getRank = useCallback((score: number) => {
    const sortedScores = Object.values(scores)
      .map(s => (parseInt(s) || 0) * 100) // 入力値を100倍して比較
      .sort((a, b) => b - a);
    return sortedScores.indexOf(score) + 1;
  }, [scores]);

  const getUma = useCallback((rank: number) => {
    switch (rank) {
      case 1: return gameSettings.uma.first;
      case 2: return gameSettings.uma.second;
      case 3: return gameSettings.uma.third;
      case 4: return gameSettings.uma.fourth;
      default: return 0;
    }
  }, [gameSettings.uma]);

  // デバッグ用：プレイヤー情報の確認
  useEffect(() => {
    console.log('Players:', players);
  }, [players]);

  // 最新の局数を取得
  useEffect(() => {
    const fetchLatestRound = async () => {
      try {
        const response = await fetch(`/api/games/${gameId}/scores`);
        if (!response.ok) {
          throw new Error('Failed to fetch scores');
        }
        const data = await response.json();
        const latestScore = data.scores[data.scores.length - 1];
        setCurrentRound(latestScore ? latestScore.round + 1 : 1);
      } catch (error) {
        console.error('Error fetching latest round:', error);
      }
    };

    fetchLatestRound();
  }, [gameId]);

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
      // 焼き鳥の分配計算
      const yakitoriPlayers = players.filter(player => yakitori[player.id]);
      const nonYakitoriPlayers = players.filter(player => !yakitori[player.id]);
      const yakitoriPenalty = gameSettings.yakitori;
      const yakitoriDistribution = yakitoriPlayers.length > 0 ? yakitoriPenalty / nonYakitoriPlayers.length : 0;

      const playerScores: PlayerScore[] = players.map(player => {
        const inputScore = parseInt(scores[player.id]) || 0;
        const rawScore = inputScore * 100; // 入力値を100倍して実際の点数に変換
        
        // 焼き鳥の処理
        let yakitoriAdjustment = 0;
        if (yakitori[player.id]) {
          // 焼き鳥プレイヤーはペナルティ
          yakitoriAdjustment = -yakitoriPenalty;
        } else if (yakitoriPlayers.length > 0) {
          // 焼き鳥でないプレイヤーは分配を受ける
          yakitoriAdjustment = yakitoriDistribution;
        }

        const rank = getRank(rawScore);
        const uma = getUma(rank);
        // 得点 = 点数/1000 + ウマ + 焼き鳥調整
        const totalScore = Number(((rawScore + yakitoriAdjustment) / 1000 + uma).toFixed(1));

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

      // 合計得点でソートして順位を付ける
      const sortedScores = [...playerScores].sort((a, b) => b.totalScore - a.totalScore);
      sortedScores.forEach((score, index) => {
        score.rank = index + 1;
      });

      setCalculatedScores(sortedScores);
    };

    calculateScores();
  }, [scores, yakitori, players, gameSettings, getRank, getUma]);

  const handleScoreChange = useCallback((playerId: string, value: string) => {
    // 数値以外の入力を無視
    if (value !== '' && !/^-?\d*$/.test(value)) {
      return;
    }

    // 入力値をそのまま保存（UI表示用）
    setScores(prev => {
      const newScores = { ...prev, [playerId]: value };
      return newScores;
    });
  }, []);

  // スコアの変更を親コンポーネントに通知（デバウンス処理を追加）
  useEffect(() => {
    const timer = setTimeout(() => {
      const numericScores: Record<string, number> = {};
      Object.entries(scores).forEach(([id, score]) => {
        const inputScore = score === '' ? 0 : parseInt(score, 10);
        numericScores[id] = inputScore * 100; // 入力値を100倍して通知
      });
      onScoreChange(numericScores);
    }, 1500); // 1.5秒のデバウンス

    return () => clearTimeout(timer);
  }, [scores, onScoreChange]);

  const handleYakitoriChange = useCallback((playerId: string, checked: boolean) => {
    setYakitori(prev => ({ ...prev, [playerId]: checked }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // 入力値のバリデーション（数値チェックのみ）
    const invalidScores = Object.entries(scores).filter(([, score]) => {
      if (score === '') return false;
      const numScore = parseInt(score);
      return isNaN(numScore);
    });

    if (invalidScores.length > 0) {
      alert('有効な数値を入力してください');
      return;
    }

    setIsSubmitting(true);
    try {
      const numericScores: Record<string, number> = {};
      Object.entries(scores).forEach(([id, score]) => {
        const inputScore = score === '' ? 0 : parseInt(score);
        numericScores[id] = inputScore * 100; // 入力値を100倍して送信
      });

      // プレイヤーの位置に基づいてスコアを変換
      const positionScores = {
        east: numericScores[players.find(p => p.position === 'east')?.id || ''] || 0,
        south: numericScores[players.find(p => p.position === 'south')?.id || ''] || 0,
        west: numericScores[players.find(p => p.position === 'west')?.id || ''] || 0,
        north: numericScores[players.find(p => p.position === 'north')?.id || ''] || 0,
      };

      // ヤキトリ情報を位置に基づいて変換
      const yakitoriInfo = {
        east: yakitori[players.find(p => p.position === 'east')?.id || ''] || false,
        south: yakitori[players.find(p => p.position === 'south')?.id || ''] || false,
        west: yakitori[players.find(p => p.position === 'west')?.id || ''] || false,
        north: yakitori[players.find(p => p.position === 'north')?.id || ''] || false,
      };

      const response = await fetch(`/api/games/${gameId}/scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scores: {
            ...positionScores,
            yakitori: yakitoriInfo
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save scores');
      }

      // 入力フィールドをクリア
      const clearedScores: Record<string, string> = {};
      const clearedYakitori: Record<string, boolean> = {};
      players.forEach(player => {
        clearedScores[player.id] = '';
        clearedYakitori[player.id] = false;
      });
      setScores(clearedScores);
      setYakitori(clearedYakitori);

      // 局数を更新
      setCurrentRound(prev => prev + 1);

      // 親コンポーネントに通知（100倍した値を送信）
      onScoreChange(numericScores);
    } catch (error) {
      console.error('Error saving scores:', error);
      alert('スコアの保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ツールチップの初期化
  useEffect(() => {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    
    return () => {
      tooltipList.forEach(tooltip => tooltip.dispose());
    };
  }, [players, calculatedScores]);

  return (
    <div className="card">
      <div className="card-header">
        <h5 className="card-title mb-0" style={{ fontSize: 'clamp(1.1rem, 3vw, 1.25rem)' }}>スコア入力 - {currentRound}局</h5>
      </div>
      <div className="card-body">
        {/* PC表示用テーブル */}
        <div className="d-none d-md-block">
          <div className="table-responsive">
            <table className="table table-bordered" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '60px', fontSize: 'clamp(0.7rem, 2vw, 0.8rem)' }}>項目</th>
                  {players.map(player => (
                    <th key={player.id} style={{ width: '25%', fontSize: 'clamp(0.7rem, 2vw, 0.8rem)' }}>
                      <div className="d-flex flex-column align-items-center">
                        <span 
                          className="text-truncate" 
                          style={{ maxWidth: '100%' }}
                          title={player.name}
                          data-bs-toggle="tooltip"
                          data-bs-placement="top"
                        >
                          {player.name}
                        </span>
                        <small className="text-muted" style={{ fontSize: 'clamp(0.6rem, 1.8vw, 0.7rem)' }}>
                          {player.position === 'east' && '東家'}
                          {player.position === 'south' && '南家'}
                          {player.position === 'west' && '西家'}
                          {player.position === 'north' && '北家'}
                        </small>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontSize: 'clamp(0.7rem, 2vw, 0.8rem)' }}>点数</td>
                  {players.map(player => (
                    <td key={player.id}>
                      <div className="input-group input-group-sm">
                        <input
                          type="text"
                          className="form-control"
                          value={scores[player.id]}
                          onChange={(e) => handleScoreChange(player.id, e.target.value)}
                          style={{ fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)' }}
                          maxLength={6}
                        />
                        <span className="input-group-text" style={{ fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)' }}>00</span>
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ fontSize: 'clamp(0.7rem, 2vw, 0.8rem)' }}>焼き鳥</td>
                  {players.map(player => (
                    <td key={player.id}>
                      <div className="form-check d-flex justify-content-center">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={yakitori[player.id]}
                          onChange={(e) => handleYakitoriChange(player.id, e.target.checked)}
                          style={{ width: 'clamp(0.9rem, 2.5vw, 1.1rem)', height: 'clamp(0.9rem, 2.5vw, 1.1rem)' }}
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* スマートフォン表示用フォーム */}
        <div className="d-md-none">
          {players.map(player => (
            <div key={player.id} className="card mb-3">
              <div className="card-header py-2">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <span style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1rem)' }}>{player.name}</span>
                    <small className="text-muted ms-2" style={{ fontSize: 'clamp(0.7rem, 2vw, 0.8rem)' }}>
                      {player.position === 'east' && '東家'}
                      {player.position === 'south' && '南家'}
                      {player.position === 'west' && '西家'}
                      {player.position === 'north' && '北家'}
                    </small>
                  </div>
                </div>
              </div>
              <div className="card-body py-2">
                <div className="row g-2">
                  <div className="col-6">
                    <label className="form-label mb-1" style={{ fontSize: 'clamp(0.7rem, 2vw, 0.8rem)' }}>点数</label>
                    <div className="input-group input-group-sm">
                      <input
                        type="text"
                        className="form-control"
                        value={scores[player.id]}
                        onChange={(e) => handleScoreChange(player.id, e.target.value)}
                        style={{ fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)' }}
                        maxLength={6}
                      />
                      <span className="input-group-text" style={{ fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)' }}>00</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <label className="form-label mb-1" style={{ fontSize: 'clamp(0.7rem, 2vw, 0.8rem)' }}>焼き鳥</label>
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={yakitori[player.id]}
                        onChange={(e) => handleYakitoriChange(player.id, e.target.checked)}
                        style={{ width: 'clamp(0.9rem, 2.5vw, 1.1rem)', height: 'clamp(0.9rem, 2.5vw, 1.1rem)' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <h6 style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1rem)' }}>計算結果</h6>
          <div className="table-responsive">
            <table className="table table-bordered" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ width: '60px', fontSize: 'clamp(0.7rem, 2vw, 0.8rem)' }}>項目</th>
                  {players.map(player => (
                    <th key={player.id} style={{ width: '25%', fontSize: 'clamp(0.7rem, 2vw, 0.8rem)' }}>
                      <div className="d-flex flex-column align-items-center">
                        <span 
                          className="text-truncate" 
                          style={{ maxWidth: '100%' }}
                          title={player.name}
                          data-bs-toggle="tooltip"
                          data-bs-placement="top"
                        >
                          {player.name}
                        </span>
                        <small className="text-muted" style={{ fontSize: 'clamp(0.6rem, 1.8vw, 0.7rem)' }}>
                          {player.position === 'east' && '東家'}
                          {player.position === 'south' && '南家'}
                          {player.position === 'west' && '西家'}
                          {player.position === 'north' && '北家'}
                        </small>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontSize: 'clamp(0.7rem, 2vw, 0.8rem)' }}>点数</td>
                  {players.map(player => {
                    const score = calculatedScores.find(s => s.id === player.id);
                    return (
                      <td key={player.id} style={{ fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)' }}>
                        {score ? score.rawScore.toLocaleString() + '点' : '0点'}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td style={{ fontSize: 'clamp(0.7rem, 2vw, 0.8rem)' }}>焼き鳥</td>
                  {players.map(player => {
                    // 焼き鳥の分配計算
                    const yakitoriPlayers = players.filter(p => yakitori[p.id]);
                    const nonYakitoriPlayers = players.filter(p => !yakitori[p.id]);
                    const yakitoriPenalty = gameSettings.yakitori;
                    const yakitoriDistribution = yakitoriPlayers.length > 0 ? yakitoriPenalty / nonYakitoriPlayers.length : 0;
                    
                    let yakitoriDisplay = '0点';
                    if (yakitori[player.id]) {
                      yakitoriDisplay = `-${yakitoriPenalty.toLocaleString()}点`;
                    } else if (yakitoriPlayers.length > 0) {
                      yakitoriDisplay = `+${yakitoriDistribution.toLocaleString()}点`;
                    }
                    
                    return (
                      <td key={player.id} style={{ fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)' }}>
                        {yakitoriDisplay}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td style={{ fontSize: 'clamp(0.7rem, 2vw, 0.8rem)' }}>ウマ</td>
                  {players.map(player => {
                    const score = calculatedScores.find(s => s.id === player.id);
                    return (
                      <td key={player.id} style={{ fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)' }}>
                        {score ? (score.uma > 0 ? '+' : '') + score.uma.toLocaleString() : '0'}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td style={{ fontSize: 'clamp(0.7rem, 2vw, 0.8rem)' }}>得点</td>
                  {players.map(player => {
                    const score = calculatedScores.find(s => s.id === player.id);
                    return (
                      <td key={player.id} style={{ fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)' }}>
                        {score ? (score.totalScore > 0 ? '+' : '') + score.totalScore.toFixed(1) : '0.0'}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td style={{ fontSize: 'clamp(0.7rem, 2vw, 0.8rem)' }}>順位</td>
                  {players.map(player => {
                    const score = calculatedScores.find(s => s.id === player.id);
                    return (
                      <td key={player.id} style={{ fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)' }}>
                        {score ? score.rank + '位' : '-'}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 d-flex justify-content-end">
          <button
            type="submit"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{ minWidth: '120px', fontSize: 'clamp(0.9rem, 3vw, 1rem)' }}
          >
            {isSubmitting ? '保存中...' : '保存'}
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