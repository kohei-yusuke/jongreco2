'use client';

import { useState } from 'react';
import {
  SEATS,
  SEAT_LABEL,
  calcRoundResult,
  calcSessionTotals,
  formatSigned,
  round1,
  type Seat,
  type ScoreSettings,
  type SeatRecord,
} from '@/lib/score';
import { useGameScores, type ScoreRow } from './useGameScores';

interface ScoreHistoryProps {
  gameId: string;
  settings: ScoreSettings;
  refreshToken?: number;
  onScoreUpdate?: () => void;
  chipEnabled?: boolean;
}

const RANK_MEDAL = ['🥇', '🥈', '🥉', ''];

function scoreClass(n: number): string {
  const r = round1(n);
  return r > 0 ? 'text-success' : r < 0 ? 'text-danger' : 'text-secondary';
}

export default function ScoreHistory({ gameId, settings, refreshToken = 0, onScoreUpdate, chipEnabled }: ScoreHistoryProps) {
  const { scores, loading, error } = useGameScores(gameId, refreshToken);
  const [deleteConfirmScore, setDeleteConfirmScore] = useState<ScoreRow | null>(null);
  const [chipInputs, setChipInputs] = useState<SeatRecord<{ value: string; isPositive: boolean }>>({
    east: { value: '', isPositive: true },
    south: { value: '', isPositive: true },
    west: { value: '', isPositive: true },
    north: { value: '', isPositive: true },
  });

  const handleDelete = async (score: ScoreRow) => {
    try {
      const response = await fetch(`/api/games/${gameId}/scores/${score.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('スコアの削除に失敗しました');
      onScoreUpdate?.();
    } catch (err) {
      console.error('Error deleting score:', err);
      alert('スコアの削除に失敗しました');
    } finally {
      setDeleteConfirmScore(null);
    }
  };

  const handleChipChange = (seat: Seat, value: string) => {
    if (value !== '' && !/^\d*$/.test(value)) return;
    setChipInputs((prev) => ({ ...prev, [seat]: { ...prev[seat], value } }));
  };

  const toggleChipSign = (seat: Seat) => {
    setChipInputs((prev) => ({ ...prev, [seat]: { ...prev[seat], isPositive: !prev[seat].isPositive } }));
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center my-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger" role="alert">{error}</div>;
  }

  const chipCounts: SeatRecord<number> = { east: 0, south: 0, west: 0, north: 0 };
  SEATS.forEach((s) => {
    const n = parseInt(chipInputs[s].value) || 0;
    chipCounts[s] = chipInputs[s].isPositive ? n : -n;
  });

  const rows = scores.map((s) => ({
    raw: { east: s.east, south: s.south, west: s.west, north: s.north },
    yakitori: s.yakitori,
  }));
  const { totals, ranks } = calcSessionTotals(rows, settings, chipEnabled ? chipCounts : undefined);

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
        <h5 className="mb-0 fw-semibold">📋 スコア履歴</h5>
        <span className="text-muted small">{scores.length} 半荘</span>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 text-nowrap">
            <thead className="table-light">
              <tr>
                <th className="text-center small text-muted" style={{ width: 56 }}>局</th>
                {SEATS.map((s) => (
                  <th key={s} className="text-center small text-muted">{SEAT_LABEL[s]}</th>
                ))}
                <th style={{ width: 56 }}></th>
              </tr>
            </thead>
            <tbody style={{ fontVariantNumeric: 'tabular-nums' }}>
              {scores.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">まだ記録がありません</td>
                </tr>
              )}
              {scores.map((score) => {
                const yak = score.yakitori ?? { east: false, south: false, west: false, north: false };
                const raw = { east: score.east, south: score.south, west: score.west, north: score.north };
                const result = calcRoundResult(raw, yak, settings);
                return (
                  <tr key={score.id}>
                    <td className="text-center text-muted fw-semibold">{score.round}</td>
                    {SEATS.map((s) => (
                      <td key={s} className={`text-end fw-semibold ${scoreClass(result[s].final)}`}>
                        <span className="me-1">{formatSigned(result[s].final)}</span>
                        {yak[s] && <span title="焼き鳥">🐔</span>}
                      </td>
                    ))}
                    <td className="text-center">
                      <button
                        className="btn btn-sm btn-outline-danger border-0"
                        title="削除"
                        onClick={() => setDeleteConfirmScore(score)}
                      >🗑</button>
                    </td>
                  </tr>
                );
              })}

              {chipEnabled && (
                <tr className="table-light">
                  <td className="text-center small text-muted">チップ</td>
                  {SEATS.map((s) => (
                    <td key={s} className="text-end">
                      <div className="input-group input-group-sm">
                        <button
                          className={`btn ${chipInputs[s].isPositive ? 'btn-outline-success' : 'btn-outline-danger'}`}
                          type="button"
                          onClick={() => toggleChipSign(s)}
                        >{chipInputs[s].isPositive ? '+' : '−'}</button>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="form-control text-end"
                          value={chipInputs[s].value}
                          onChange={(e) => handleChipChange(s, e.target.value)}
                          placeholder="0"
                        />
                        <span className="input-group-text">枚</span>
                      </div>
                    </td>
                  ))}
                  <td></td>
                </tr>
              )}
            </tbody>
            <tfoot className="border-top">
              <tr className="table-secondary">
                <td className="text-center fw-bold">総得点</td>
                {SEATS.map((s) => (
                  <td key={s} className={`text-end fw-bold fs-6 ${scoreClass(totals[s])}`}>{formatSigned(totals[s])}</td>
                ))}
                <td></td>
              </tr>
              <tr>
                <td className="text-center small text-muted">順位</td>
                {SEATS.map((s) => (
                  <td key={s} className="text-center">
                    <span className="me-1">{RANK_MEDAL[ranks[s] - 1]}</span>
                    <span className={ranks[s] === 1 ? 'fw-bold' : ''}>{ranks[s]}位</span>
                  </td>
                ))}
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {deleteConfirmScore && (
        <>
          <div className="modal show d-block" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">スコアの削除</h5>
                  <button type="button" className="btn-close" onClick={() => setDeleteConfirmScore(null)}></button>
                </div>
                <div className="modal-body">
                  <p className="mb-1">{deleteConfirmScore.round}局のスコアを削除しますか？</p>
                  <p className="text-danger small mb-0">この操作は取り消せません。</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirmScore(null)}>キャンセル</button>
                  <button type="button" className="btn btn-danger" onClick={() => handleDelete(deleteConfirmScore)}>削除する</button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop show"></div>
        </>
      )}
    </div>
  );
}
