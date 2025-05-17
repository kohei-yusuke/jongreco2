'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import Link from 'next/link';
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

interface ScoreData {
  scores: Score[];
  players: PlayerStats[];
}

interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    gameData?: string;
  }>;
}

export default function ScorePage({ params, searchParams }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const resolvedSearchParams = use(searchParams);
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [scoreUpdateTrigger, setScoreUpdateTrigger] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchGame = async () => {
      try {
        setError(null);
        // URLパラメータからゲームデータを取得
        if (resolvedSearchParams?.gameData) {
          console.log('Received gameData from URL:', resolvedSearchParams.gameData);
          const gameData = JSON.parse(decodeURIComponent(resolvedSearchParams.gameData));
          console.log('Parsed gameData:', gameData);

          // プレイヤーデータが既に配列形式になっていることを確認
          if (Array.isArray(gameData.players)) {
            console.log('Setting game data:', gameData);
            setGame(gameData);
          } else {
            console.error('Invalid game data format:', gameData);
            setError('ゲームデータの形式が不正です');
          }
          setLoading(false);
          return;
        }

        // 通常のAPIリクエスト
        console.log('Fetching game data from API:', resolvedParams.id);
        const response = await fetch(`/api/games/${resolvedParams.id}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.details || `Failed to fetch game: ${response.status}`);
        }
        const data = await response.json();
        console.log('Received game data from API:', data);
        setGame(data);

        // スコアデータを取得
        const scoresResponse = await fetch(`/api/games/${resolvedParams.id}/scores`);
        if (scoresResponse.ok) {
          const scoreData = await scoresResponse.json();
          setScoreData(scoreData);
          // 最新のスコアから局数を設定
          const latestScore = scoreData.scores[scoreData.scores.length - 1];
          setCurrentRound(latestScore ? latestScore.round + 1 : 1);
        }
      } catch (error) {
        console.error('Error fetching game:', error);
        setError(error instanceof Error ? error.message : 'ゲーム情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [resolvedParams.id, resolvedSearchParams]);

  const handleScoreChange = useCallback((scores: Record<string, number>) => {
    if (!game) return;

    // スコアデータを更新
    const updatedScores = {
      id: Date.now().toString(), // 一時的なID
      round: currentRound,
      east: scores[game.players.find(p => p.position === 'east')?.id || ''] || 0,
      south: scores[game.players.find(p => p.position === 'south')?.id || ''] || 0,
      west: scores[game.players.find(p => p.position === 'west')?.id || ''] || 0,
      north: scores[game.players.find(p => p.position === 'north')?.id || ''] || 0,
    };

    setScoreData(prev => prev ? {
      ...prev,
      scores: [...prev.scores, updatedScores],
    } : {
      scores: [updatedScores],
      players: [],
    });
  }, [game, currentRound]);

  const handleScoreSubmit = async () => {
    if (!game) return;

    try {
      const response = await fetch(`/api/games/${game.id}/scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scores: scoreData?.scores,
          round: currentRound,
        }),
      });

      if (!response.ok) {
        throw new Error('スコアの登録に失敗しました');
      }

      // スコアデータを再取得
      const scoresResponse = await fetch(`/api/games/${game.id}/scores`);
      if (scoresResponse.ok) {
        const updatedScoreData = await scoresResponse.json();
        setScoreData(updatedScoreData);
        setCurrentRound(prev => prev + 1);
        // スコア履歴の更新をトリガー
        setScoreUpdateTrigger(prev => prev + 1);
      } else {
        throw new Error('スコアデータの取得に失敗しました');
      }
    } catch (error) {
      console.error('スコア登録エラー:', error);
      alert('スコアの登録に失敗しました。もう一度お試しください。');
    }
  };

  const handleSaveHistory = async (status: 'draft' | 'completed') => {
    if (!game) return;

    try {
      setIsSaving(true);
      const response = await fetch(`/api/games/${game.id}/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('対局履歴の保存に失敗しました');
      }

      if (status === 'completed') {
        // 対局終了の場合はダッシュボードに戻る
        router.push('/dashboard');
      } else {
        alert('対局履歴を一時保存しました');
      }
    } catch (error) {
      console.error('Error saving game history:', error);
      alert('対局履歴の保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // gameSettingsの形式を変換
  const convertedGameSettings = game ? {
    initialPoints: game.settings.initialPoints,
    returnPoints: game.settings.returnPoints,
    uma1: game.settings.uma.first,
    uma2: game.settings.uma.second,
    uma3: game.settings.uma.third,
    uma4: game.settings.uma.fourth,
    yakitoriPoints: game.settings.yakitori,
    yakitoriEnabled: game.settings.yakitoriEnabled,
  } : null;

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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1>スコア入力</h1>
        </div>
        <div>
          <button
            className="btn btn-outline-primary me-2"
            onClick={() => setShowSettingsModal(true)}
          >
            設定
          </button>
          <Link href={`/games/${game.id}`} className="btn btn-outline-secondary">
            戻る
          </Link>
        </div>
      </div>

      <div className="row">
        <div className="col-md-8">
          <ScoreInput
            gameId={game.id}
            players={game.players}
            onScoreChange={handleScoreChange}
            gameSettings={game.settings}
          />
        </div>
        <div className="col-md-4">
          <div className="mb-2">
            <ScoreGraph
              gameId={game.id}
              onScoreUpdate={() => setScoreUpdateTrigger(prev => prev + 1)}
            />
          </div>
          <div>
            <TotalScoreGraph
              gameId={game.id}
              onScoreUpdate={() => setScoreUpdateTrigger(prev => prev + 1)}
            />
          </div>
        </div>
      </div>

      <div className="mt-4">
        <ScoreHistory
          gameId={game.id}
          onScoreUpdate={() => setScoreUpdateTrigger(prev => prev + 1)}
          chipEnabled={game.settings.chipEnabled}
          chipPoints={game.settings.chipPoints}
        />
      </div>

      <div className="mt-4 d-flex justify-content-end gap-2">
        <button
          className="btn btn-outline-primary"
          onClick={() => handleSaveHistory('draft')}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              保存中...
            </>
          ) : (
            '一時保存'
          )}
        </button>
        <button
          className="btn btn-primary"
          onClick={() => handleSaveHistory('completed')}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              保存中...
            </>
          ) : (
            '対局終了'
          )}
        </button>
      </div>

      {/* 詳細設定モーダル */}
      {showSettingsModal && game && (
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
                      <p>配給原点: {game.settings?.initialPoints?.toLocaleString() ?? 0}点</p>
                      <p>返し点: {game.settings?.returnPoints?.toLocaleString() ?? 0}点</p>
                    </div>
                    <div className="col-6">
                      <p>チップ: {game.settings?.chipPoints?.toLocaleString() ?? 0}点</p>
                      <p>焼き鳥: {game.settings?.yakitori?.toLocaleString() ?? 0}点</p>
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <h6>ウマ設定</h6>
                  <div className="row">
                    <div className="col-6">
                      <p>1位: +{game.settings?.uma?.first?.toLocaleString() ?? 0}点</p>
                      <p>2位: +{game.settings?.uma?.second?.toLocaleString() ?? 0}点</p>
                    </div>
                    <div className="col-6">
                      <p>3位: {game.settings?.uma?.third?.toLocaleString() ?? 0}点</p>
                      <p>4位: {game.settings?.uma?.fourth?.toLocaleString() ?? 0}点</p>
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <h6>機能設定</h6>
                  <div className="row">
                    <div className="col-6">
                      <p>チップ機能: {game.settings?.chipEnabled ? '有効' : '無効'}</p>
                    </div>
                    <div className="col-6">
                      <p>焼き鳥機能: {game.settings?.yakitoriEnabled ? '有効' : '無効'}</p>
                    </div>
                  </div>
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