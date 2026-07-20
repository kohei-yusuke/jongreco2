'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SeatRecord } from '@/lib/score';

export interface ScoreRow {
  id: string;
  round: number;
  east: number;
  south: number;
  west: number;
  north: number;
  yakitori?: SeatRecord<boolean>;
}

/**
 * ゲームのスコア一覧を取得する共通フック。
 * refreshToken を変えると再取得する（保存・削除後の同期用）。
 */
export function useGameScores(gameId: string, refreshToken: number = 0) {
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScores = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/games/${gameId}/scores`);
      if (!response.ok) throw new Error('スコアデータの取得に失敗しました');
      const data = await response.json();
      setScores(data.scores || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching scores:', err);
      setError(err instanceof Error ? err.message : 'スコアデータの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchScores();
  }, [fetchScores, refreshToken]);

  return { scores, loading, error, refetch: fetchScores };
}
