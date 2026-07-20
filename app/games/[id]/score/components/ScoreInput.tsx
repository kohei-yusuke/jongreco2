'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  SEATS,
  SEAT_LABEL,
  calcRoundResult,
  validateRawScores,
  toScoreSettings,
  formatSigned,
  expectedRawTotal,
  type Seat,
  type SeatRecord,
  type ApiGameSettings,
} from '@/lib/score';

interface Player {
  id: string;
  name: string;
  position: Seat;
  user?: { name: string };
}

interface ScoreInputProps {
  gameId: string;
  players: Player[];
  onScoreChange: (scores: Record<string, number>) => void;
  onSaved?: () => void;
  gameSettings: ApiGameSettings;
}

const RANK_MEDAL = ['🥇', '🥈', '🥉', ''];

export default function ScoreInput({ gameId, players, onScoreChange, onSaved, gameSettings }: ScoreInputProps) {
  const settings = useMemo(() => toScoreSettings(gameSettings), [gameSettings]);

  // 入力は「百点棒」単位（250 → 25000）。席ごとに保持。
  const [inputs, setInputs] = useState<SeatRecord<string>>({ east: '', south: '', west: '', north: '' });
  const [yakitori, setYakitori] = useState<SeatRecord<boolean>>({ east: false, south: false, west: false, north: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);

  const playerBySeat = useMemo(() => {
    const map = {} as Record<Seat, Player | undefined>;
    SEATS.forEach((s) => { map[s] = players.find((p) => p.position === s); });
    return map;
  }, [players]);

  useEffect(() => {
    const fetchLatestRound = async () => {
      try {
        const response = await fetch(`/api/games/${gameId}/scores`);
        if (!response.ok) throw new Error('Failed to fetch scores');
        const data = await response.json();
        const latest = data.scores?.[data.scores.length - 1];
        setCurrentRound(latest ? latest.round + 1 : 1);
      } catch (error) {
        console.error('Error fetching latest round:', error);
      }
    };
    fetchLatestRound();
  }, [gameId]);

  // 素点（×100）
  const rawScores: SeatRecord<number> = useMemo(() => {
    const raw = {} as SeatRecord<number>;
    SEATS.forEach((s) => { raw[s] = (parseInt(inputs[s]) || 0) * 100; });
    return raw;
  }, [inputs]);

  const result = useMemo(
    () => calcRoundResult(rawScores, yakitori, settings),
    [rawScores, yakitori, settings],
  );

  const anyInput = SEATS.some((s) => inputs[s] !== '');
  const validation = validateRawScores(rawScores, settings);
  const expected = expectedRawTotal(settings);

  const handleScoreChange = useCallback((seat: Seat, value: string) => {
    if (value !== '' && !/^-?\d*$/.test(value)) return;
    setInputs((prev) => ({ ...prev, [seat]: value }));
  }, []);

  const handleYakitoriChange = useCallback((seat: Seat, checked: boolean) => {
    setYakitori((prev) => ({ ...prev, [seat]: checked }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!anyInput) {
      alert('点数を入力してください');
      return;
    }
    if (!validation.ok) {
      const proceed = confirm(
        `素点の合計が ${validation.actual.toLocaleString()}点 です（正しくは ${expected.toLocaleString()}点）。\n` +
        `差分 ${validation.diff > 0 ? '+' : ''}${validation.diff.toLocaleString()}点。このまま登録しますか？`,
      );
      if (!proceed) return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/games/${gameId}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scores: { ...rawScores, yakitori },
        }),
      });
      if (!response.ok) throw new Error('Failed to save scores');

      setInputs({ east: '', south: '', west: '', north: '' });
      setYakitori({ east: false, south: false, west: false, north: false });
      setCurrentRound((prev) => prev + 1);
      onScoreChange(rawScores);
      onSaved?.();
    } catch (error) {
      console.error('Error saving scores:', error);
      alert('スコアの保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card border-0 shadow-sm">
      <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
        <h5 className="mb-0 fw-semibold">✏️ スコア入力</h5>
        <span className="badge bg-primary-subtle text-primary-emphasis fs-6">{currentRound} 半荘目</span>
      </div>
      <div className="card-body">
        <div className="row g-3">
          {SEATS.map((s) => {
            const player = playerBySeat[s];
            const r = result[s];
            return (
              <div key={s} className="col-12 col-sm-6">
                <div className="border rounded-3 p-3 h-100">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="text-truncate">
                      <span className="fw-semibold">{player?.name ?? '—'}</span>
                      <span className="badge bg-light text-dark ms-2">{SEAT_LABEL[s]}</span>
                    </div>
                    <span className="small text-muted">{RANK_MEDAL[r.rank - 1]} {r.rank}位</span>
                  </div>

                  <div className="input-group mb-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="form-control text-end fs-5"
                      value={inputs[s]}
                      onChange={(e) => handleScoreChange(s, e.target.value)}
                      placeholder="0"
                      maxLength={6}
                      aria-label={`${SEAT_LABEL[s]}の点数`}
                    />
                    <span className="input-group-text">00 点</span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    {settings.yakitoriEnabled ? (
                      <div className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id={`yakitori-${s}`}
                          checked={yakitori[s]}
                          onChange={(e) => handleYakitoriChange(s, e.target.checked)}
                        />
                        <label className="form-check-label small" htmlFor={`yakitori-${s}`}>🐔 焼き鳥</label>
                      </div>
                    ) : <span />}
                    <span className={`fw-bold ${r.final > 0 ? 'text-success' : r.final < 0 ? 'text-danger' : 'text-secondary'}`}>
                      {formatSigned(r.final)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {anyInput && (
          <div className={`alert ${validation.ok ? 'alert-success' : 'alert-warning'} d-flex justify-content-between align-items-center mt-3 mb-0 py-2`}>
            <span className="small">
              素点合計: <strong>{validation.actual.toLocaleString()}</strong> / {expected.toLocaleString()} 点
            </span>
            <span className="small">
              {validation.ok ? '✓ 一致' : `差分 ${validation.diff > 0 ? '+' : ''}${validation.diff.toLocaleString()}`}
            </span>
          </div>
        )}
      </div>
      <div className="card-footer bg-white d-flex justify-content-end py-3">
        <button type="submit" className="btn btn-primary px-4" disabled={isSubmitting}>
          {isSubmitting ? '保存中…' : 'この半荘を登録'}
        </button>
      </div>
    </form>
  );
}
