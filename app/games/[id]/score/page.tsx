'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import ScoreInput from './components/ScoreInput';
import ScoreHistory from './components/ScoreHistory';
import ScoreGraph from './components/ScoreGraph';
import TotalScoreGraph from './components/TotalScoreGraph';

interface Player {
  id: string;
  name: string;
  position: 'east' | 'south' | 'west' | 'north';
  user?: {
    name: string;
  };
}

interface Game {
  id: string;
  name: string;
  players: Player[];
  settings: {
    uma: {
      first: number;
      second: number;
      third: number;
      fourth: number;
    };
    yakitori: number;
    initialPoints: number;
    returnPoints: number;
    chipPoints: number;
    chipEnabled: boolean;
    yakitoriEnabled: boolean;
    yakitoriMode: string;
  };
  currentRound: number;
}

interface PlayerStats {
  id: string;
  name: string;
  position: string;
  scores: {
    round: number;
    score: number;
  }[];
  totalScore: number;
  rank: number;
}

interface Score {
  id: string;
  round: number;
  east: number;
  south: number;
  west: number;
  north: number;
}


export default function ScorePage() {
  const router = useRouter();
  const pathname = usePathname();
  const gameId = pathname.split('/')[2]; // /games/[id]/... から id を取得
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const response = await fetch(`/api/games/${gameId}`);
        if (!response.ok) {
          throw new Error('対局情報の取得に失敗しました');
        }
        const data = await response.json();
        setGame(data);
      } catch (error) {
        console.error('Error fetching game:', error);
        setError(error instanceof Error ? error.message : '対局情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    if (gameId) {
      fetchGame();
    }
  }, [gameId]);

  const handleScoreChange = useCallback((scores: Record<string, number>) => {
    // スコア変更の処理（現在は何もしない）
    console.log('Score changed:', scores);
  }, []);


  const handleSaveAndReturn = async () => {
    if (!game) return;

    try {
      setIsSaving(true);
      const response = await fetch(`/api/games/${game.id}/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'draft' }),
      });

      if (!response.ok) {
        throw new Error('対局履歴の保存に失敗しました');
      }

      // 保存成功後、ダッシュボードに遷移
      router.push('/dashboard');
    } catch (error) {
      console.error('Error saving game history:', error);
      alert('対局履歴の保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompleteGame = async () => {
    if (!game) return;

    try {
      setIsSaving(true);
      const response = await fetch(`/api/games/${game.id}/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'completed' }),
      });

      if (!response.ok) {
        throw new Error('対局履歴の保存に失敗しました');
      }

      // 対局終了の場合はダッシュボードに戻る
      router.push('/dashboard');
    } catch (error) {
      console.error('Error saving game history:', error);
      alert('対局履歴の保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="container mt-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning" role="alert">
          ゲームが見つかりません
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
        <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center mb-3 mb-md-0">
          <h1 className="mb-2 mb-md-0" style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>{game.name}</h1>
          <span className="ms-md-3 text-muted" style={{ fontSize: 'clamp(0.9rem, 3vw, 1.2rem)' }}>
            対局ID: {game.id}
          </span>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-primary"
            onClick={() => setShowSettingsModal(true)}
            style={{ minWidth: '80px', fontSize: 'clamp(0.9rem, 3vw, 1rem)' }}
          >
            設定
          </button>
          <button
            className="btn btn-outline-secondary"
            onClick={handleSaveAndReturn}
            disabled={isSaving}
            style={{ minWidth: '120px', fontSize: 'clamp(0.9rem, 3vw, 1rem)' }}
          >
            {isSaving ? '保存中...' : '下書き保存'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCompleteGame}
            disabled={isSaving}
            style={{ minWidth: '120px', fontSize: 'clamp(0.9rem, 3vw, 1rem)' }}
          >
            {isSaving ? '保存中...' : '対局終了'}
          </button>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <ScoreInput
            gameId={game.id}
            players={game.players}
            onScoreChange={handleScoreChange}
            gameSettings={game.settings}
          />
        </div>

        <div className="col-12 col-lg-6">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title mb-0" style={{ fontSize: 'clamp(1.1rem, 3vw, 1.25rem)' }}>スコア履歴</h5>
            </div>
            <div className="card-body">
              <ScoreHistory
                gameId={game.id}
                onScoreUpdate={() => {}}
              />
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0" style={{ fontSize: 'clamp(1.1rem, 3vw, 1.25rem)' }}>スコア推移</h5>
            </div>
            <div className="card-body">
              <div className="row g-4">
                <div className="col-12 col-lg-6">
                  <ScoreGraph
                    gameId={game.id}
                    onScoreUpdate={() => {}}
                  />
                </div>
                <div className="col-12 col-lg-6">
                  <TotalScoreGraph
                    gameId={game.id}
                    onScoreUpdate={() => {}}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSettingsModal && game && (
        <div className="modal show d-block" tabIndex={-1}>
          <div className="modal-dialog modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" style={{ fontSize: 'clamp(1.1rem, 3vw, 1.25rem)' }}>対局設定</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowSettingsModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <h6 style={{ fontSize: 'clamp(1rem, 3vw, 1.1rem)' }}>基本設定</h6>
                  <div className="row g-3">
                    <div className="col-6">
                      <p className="mb-2" style={{ fontSize: 'clamp(0.9rem, 3vw, 1rem)' }}>
                        配給原点: {game.settings?.initialPoints?.toLocaleString() ?? 0}点
                      </p>
                      <p className="mb-2" style={{ fontSize: 'clamp(0.9rem, 3vw, 1rem)' }}>
                        返し点: {game.settings?.returnPoints?.toLocaleString() ?? 0}点
                      </p>
                    </div>
                    <div className="col-6">
                      <p className="mb-2" style={{ fontSize: 'clamp(0.9rem, 3vw, 1rem)' }}>
                        チップ: {game.settings?.chipPoints?.toLocaleString() ?? 0}点
                      </p>
                      <p className="mb-2" style={{ fontSize: 'clamp(0.9rem, 3vw, 1rem)' }}>
                        焼き鳥: {game.settings?.yakitori?.toLocaleString() ?? 0}点
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <h6 style={{ fontSize: 'clamp(1rem, 3vw, 1.1rem)' }}>ウマ設定</h6>
                  <div className="row g-3">
                    <div className="col-6">
                      <p className="mb-2" style={{ fontSize: 'clamp(0.9rem, 3vw, 1rem)' }}>
                        1位: +{game.settings?.uma?.first?.toLocaleString() ?? 0}点
                      </p>
                      <p className="mb-2" style={{ fontSize: 'clamp(0.9rem, 3vw, 1rem)' }}>
                        2位: +{game.settings?.uma?.second?.toLocaleString() ?? 0}点
                      </p>
                    </div>
                    <div className="col-6">
                      <p className="mb-2" style={{ fontSize: 'clamp(0.9rem, 3vw, 1rem)' }}>
                        3位: {game.settings?.uma?.third?.toLocaleString() ?? 0}点
                      </p>
                      <p className="mb-2" style={{ fontSize: 'clamp(0.9rem, 3vw, 1rem)' }}>
                        4位: {game.settings?.uma?.fourth?.toLocaleString() ?? 0}点
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <h6 style={{ fontSize: 'clamp(1rem, 3vw, 1.1rem)' }}>機能設定</h6>
                  <div className="row g-3">
                    <div className="col-6">
                      <p className="mb-2" style={{ fontSize: 'clamp(0.9rem, 3vw, 1rem)' }}>
                        チップ機能: {game.settings?.chipEnabled ? '有効' : '無効'}
                      </p>
                      {game.settings?.chipEnabled && (
                        <p className="text-muted small" style={{ fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)' }}>
                          チップの点数: {game.settings?.chipPoints?.toLocaleString() ?? 0}点
                        </p>
                      )}
                    </div>
                    <div className="col-6">
                      <p className="mb-2" style={{ fontSize: 'clamp(0.9rem, 3vw, 1rem)' }}>
                        焼き鳥機能: {game.settings?.yakitoriEnabled ? '有効' : '無効'}
                      </p>
                      {game.settings?.yakitoriEnabled && (
                        <>
                          <p className="text-muted small" style={{ fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)' }}>
                            焼き鳥の点数: {game.settings?.yakitori?.toLocaleString() ?? 0}点
                          </p>
                          <p className="text-muted small" style={{ fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)' }}>
                            支払い方法: {game.settings?.yakitoriMode === 'distribution' ? '分配モード' : '総取りモード'}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowSettingsModal(false)}
                  style={{ fontSize: 'clamp(0.9rem, 3vw, 1rem)' }}
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