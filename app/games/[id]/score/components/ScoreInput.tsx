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

  const valClass = (n: number) => (n > 0 ? 'val-pos' : n < 0 ? 'val-neg' : 'val-zero');

  return (
    <form onSubmit={handleSubmit} className="jr-card">
      <div className="jr-card-head">
        <h5 className="jr-card-title">✏️ スコア入力</h5>
        <span className="jr-chip">{currentRound} 半荘目</span>
      </div>

      <div className="jr-card-body">
        <div className="row g-3">
          {SEATS.map((s) => {
            const player = playerBySeat[s];
            const r = result[s];
            const dataAttr = { [`data-${s}`]: '' } as Record<string, string>;
            return (
              <div key={s} className="col-12 col-sm-6">
                <div className="seat-card h-100" {...dataAttr}>
                  <div className="d-flex justify-content-between align-items-center mb-2" style={{ paddingLeft: 6 }}>
                    <div className="text-truncate d-flex align-items-center gap-2">
                      <span className="seat-tag">{SEAT_LABEL[s]}</span>
                      <span className="seat-name text-truncate">{player?.name ?? '—'}</span>
                    </div>
                    <span className="rank-pill">{RANK_MEDAL[r.rank - 1]}<span className={r.rank === 1 ? 'rank-1' : ''}>{r.rank}位</span></span>
                  </div>

                  <div className="score-field" style={{ marginLeft: 6 }}>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={inputs[s]}
                      onChange={(e) => handleScoreChange(s, e.target.value)}
                      placeholder="0"
                      maxLength={6}
                      aria-label={`${SEAT_LABEL[s]}の点数`}
                    />
                    <span className="suffix">00 点</span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mt-2" style={{ paddingLeft: 6 }}>
                    {settings.yakitoriEnabled ? (
                      <label className={`yk-toggle ${yakitori[s] ? 'on' : ''}`}>
                        <input
                          type="checkbox"
                          checked={yakitori[s]}
                          onChange={(e) => handleYakitoriChange(s, e.target.checked)}
                        />
                        🐔 焼き鳥
                      </label>
                    ) : <span />}
                    <span className={`val fs-5 ${valClass(r.final)}`}>{formatSigned(r.final)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {anyInput && (
          <div className={`jr-note ${validation.ok ? 'jr-note-ok' : 'jr-note-warn'} mt-3`}>
            <span>素点合計 <strong className="tnum">{validation.actual.toLocaleString()}</strong> / {expected.toLocaleString()}</span>
            <span>{validation.ok ? '✓ 一致' : `差分 ${validation.diff > 0 ? '+' : ''}${validation.diff.toLocaleString()}`}</span>
          </div>
        )}
      </div>

      <div className="submit-bar">
        <button type="submit" className="jr-btn jr-btn-primary jr-btn-block" disabled={isSubmitting}>
          {isSubmitting ? '保存中…' : 'この半荘を登録'}
        </button>
      </div>
    </form>
  );
}
