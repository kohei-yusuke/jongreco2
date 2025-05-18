'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import GameSettingsModal from '@/app/components/game/GameSettingsModal';

interface Game {
  id: string;
  name: string;
  players: {
    id: string;
    name: string;
    position: string;
    user?: {
      iconPath?: string;
    };
  }[];
  settings: {
    initialPoints: number;
    returnPoints: number;
    uma: {
      first: number;
      second: number;
      third: number;
      fourth: number;
    };
    yakitori: number;
    chipPoints: number;
    chipEnabled: boolean;
    yakitoriEnabled: boolean;
    yakitoriMode: string;
  };
}

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function GamePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const gameId = pathname.split('/')[2]; // /games/[id]/... から id を取得
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

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

    fetchGame();
  }, [gameId]);

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
        <div className="d-flex align-items-center">
          <h1 className="mb-0">{game.name}</h1>
          <span className="ms-3 text-muted" style={{ fontSize: '1.2rem' }}>
            対局ID: {game.id}
          </span>
        </div>
        <button
          className="btn btn-outline-primary"
          onClick={() => setShowSettingsModal(true)}
        >
          設定
        </button>
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="card-title mb-0">プレイヤー</h5>
            </div>
            <div className="card-body">
              <div className="row">
                {game.players.map((player) => (
                  <div key={player.id} className="col-6 mb-3">
                    <div className="d-flex align-items-center">
                      <div className="me-2">
                        {player.user?.iconPath ? (
                          <img
                            src={player.user.iconPath}
                            alt={player.name}
                            className="rounded-circle"
                            style={{ width: '2rem', height: '2rem', objectFit: 'cover' }}
                          />
                        ) : (
                          <i className="bi bi-person-circle fs-4"></i>
                        )}
                      </div>
                      <div>
                        <div className="fw-bold">{player.name}</div>
                        <div className="text-muted small">
                          {player.position === 'east' && '東家'}
                          {player.position === 'south' && '南家'}
                          {player.position === 'west' && '西家'}
                          {player.position === 'north' && '北家'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="card-title mb-0">設定</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-6">
                  <p>配給原点: {game.settings.initialPoints.toLocaleString()}点</p>
                  <p>返し点: {game.settings.returnPoints.toLocaleString()}点</p>
                </div>
                <div className="col-6">
                  <p>チップ: {game.settings.chipPoints.toLocaleString()}点</p>
                  <p>焼き鳥: {game.settings.yakitori.toLocaleString()}点</p>
                </div>
              </div>
              <div className="mt-3">
                <h6>ウマ設定</h6>
                <div className="row">
                  <div className="col-6">
                    <p>1位: +{game.settings.uma.first.toLocaleString()}点</p>
                    <p>2位: +{game.settings.uma.second.toLocaleString()}点</p>
                  </div>
                  <div className="col-6">
                    <p>3位: {game.settings.uma.third.toLocaleString()}点</p>
                    <p>4位: {game.settings.uma.fourth.toLocaleString()}点</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-end gap-2">
        <button
          className="btn btn-primary"
          onClick={() => router.push(`/games/${game.id}/score`)}
        >
          スコア入力
        </button>
      </div>

      {showSettingsModal && (
        <GameSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          gameId={game.id}
          initialSettings={{
            initialPoints: game.settings.initialPoints,
            returnPoints: game.settings.returnPoints,
            chipPoints: game.settings.chipPoints,
            yakitoriPoints: game.settings.yakitori,
            uma1: game.settings.uma.first,
            uma2: game.settings.uma.second,
            uma3: game.settings.uma.third,
            uma4: game.settings.uma.fourth,
            chipEnabled: game.settings.chipEnabled,
            yakitoriEnabled: game.settings.yakitoriEnabled,
            yakitoriMode: game.settings.yakitoriMode as 'distribution' | 'winner_takes_all'
          }}
        />
      )}
    </div>
  );
} 