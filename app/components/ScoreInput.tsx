import { useState } from 'react';
import { Player } from '@prisma/client';

interface ScoreInputProps {
  gameId: string;
  players: Player[];
  onScoreChange: (scores: Record<string, number>) => void;
  gameSettings: {
    uma: {
      first: number;
      second: number;
      third: number;
      fourth: number;
    };
    initialPoints: number;
    returnPoints: number;
    chipPoints: number;
    chipEnabled: boolean;
    yakitoriPoints: number;
    yakitoriEnabled: boolean;
  };
  onScoreSubmit?: () => void;
  currentRound: number;
}

export default function ScoreInput({
  gameId,
  players,
  onScoreChange,
  gameSettings,
  onScoreSubmit,
  currentRound,
}: ScoreInputProps) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [chips, setChips] = useState<Record<string, number>>({});
  const [yakitori, setYakitori] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScoreChange = (playerId: string, value: number) => {
    const newScores = { ...scores, [playerId]: value };
    setScores(newScores);
    onScoreChange(newScores);
  };

  const handleChipChange = (playerId: string, value: number) => {
    setChips(prev => ({ ...prev, [playerId]: value }));
  };

  const handleYakitoriChange = (playerId: string, value: boolean) => {
    setYakitori(prev => ({ ...prev, [playerId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/games/${gameId}/scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scores: Object.entries(scores).map(([playerId, score]) => ({
            playerId,
            score,
          })),
          chips: Object.entries(chips).map(([playerId, count]) => ({
            playerId,
            count,
          })),
          yakitori: Object.entries(yakitori)
            .filter(([, value]) => value)
            .map(([playerId]) => playerId),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'スコアの登録に失敗しました');
      }

      // スコアをリセット
      setScores({});
      setChips({});
      setYakitori({});
      
      // 親コンポーネントに通知
      if (onScoreSubmit) {
        onScoreSubmit();
      }
    } catch (error) {
      console.error('Error submitting scores:', error);
      setError(error instanceof Error ? error.message : 'スコアの登録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="card">
        <div className="card-body">
          <h5 className="card-title mb-4">第{currentRound}局</h5>
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          <div className="row g-3">
            {players.map((player) => (
              <div key={player.id} className="col-md-6 col-lg-3">
                <div className="card h-100">
                  <div className="card-body">
                    <h6 className="card-subtitle mb-2 text-muted">
                      {player.position}家: {player.name}
                    </h6>
                    <div className="mb-3">
                      <label htmlFor={`score-${player.id}`} className="form-label">
                        スコア
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        id={`score-${player.id}`}
                        value={scores[player.id] || ''}
                        onChange={(e) =>
                          handleScoreChange(player.id, parseInt(e.target.value) || 0)
                        }
                        required
                      />
                    </div>
                    {gameSettings.chipEnabled && (
                      <div className="mb-3">
                        <label htmlFor={`chips-${player.id}`} className="form-label">
                          チップ数
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          id={`chips-${player.id}`}
                          value={chips[player.id] || 0}
                          onChange={(e) =>
                            handleChipChange(player.id, parseInt(e.target.value) || 0)
                          }
                          min="0"
                        />
                      </div>
                    )}
                    {gameSettings.yakitoriEnabled && (
                      <div className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id={`yakitori-${player.id}`}
                          checked={yakitori[player.id] || false}
                          onChange={(e) =>
                            handleYakitoriChange(player.id, e.target.checked)
                          }
                        />
                        <label className="form-check-label" htmlFor={`yakitori-${player.id}`}>
                          焼き鳥
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  登録中...
                </>
              ) : (
                '登録'
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
} 