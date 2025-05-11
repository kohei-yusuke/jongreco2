'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import Link from 'next/link';
import ScoreInput from './components/ScoreInput';

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
      } catch (error) {
        console.error('Error fetching game:', error);
        setError(error instanceof Error ? error.message : 'ゲーム情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [resolvedParams.id, resolvedSearchParams]);

  const handleScoreChange = (scores: Record<string, number>) => {
    // スコアの変更を処理する必要がある場合はここで実装
    console.log('Scores changed:', scores);
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>スコア入力</h1>
        <div>
          <button
            className="btn btn-outline-primary me-2"
            onClick={() => setShowSettingsModal(true)}
          >
            詳細設定
          </button>
          <Link href="/dashboard" className="btn btn-outline-secondary">
            ダッシュボードに戻る
          </Link>
        </div>
      </div>

      {game && (
        <>
          <ScoreInput
            gameId={game.id}
            players={game.players}
            onScoreChange={handleScoreChange}
            gameSettings={game.settings}
          />
        </>
      )}

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