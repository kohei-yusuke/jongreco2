'use client';

import { useState, useEffect } from 'react';

interface Score {
  id: string;
  round: number;
  east: number;
  south: number;
  west: number;
  north: number;
}

interface ScoreHistoryProps {
  gameId: string;
  onScoreUpdate?: () => void;
}

export default function ScoreHistory({ gameId, onScoreUpdate }: ScoreHistoryProps) {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <div className="card-body">
        <div className="table-responsive">
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>局</th>
                <th>東家</th>
                <th>南家</th>
                <th>西家</th>
                <th>北家</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score) => (
                <tr key={score.id}>
                  <td>{score.round}</td>
                  <td className={score.east > 0 ? 'text-success' : score.east < 0 ? 'text-danger' : ''}>
                    {score.east.toLocaleString()}
                  </td>
                  <td className={score.south > 0 ? 'text-success' : score.south < 0 ? 'text-danger' : ''}>
                    {score.south.toLocaleString()}
                  </td>
                  <td className={score.west > 0 ? 'text-success' : score.west < 0 ? 'text-danger' : ''}>
                    {score.west.toLocaleString()}
                  </td>
                  <td className={score.north > 0 ? 'text-success' : score.north < 0 ? 'text-danger' : ''}>
                    {score.north.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 