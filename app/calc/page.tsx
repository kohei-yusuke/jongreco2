'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  SEATS,
  SEAT_LABEL,
  calcRoundResult,
  calcSessionTotals,
  validateRawScores,
  expectedRawTotal,
  formatSigned,
  round1,
  type Seat,
  type SeatRecord,
  type ScoreSettings,
} from '@/lib/score';

const STORAGE_KEY = 'jongreco.calc.v1';
const RANK_MEDAL = ['🥇', '🥈', '🥉', ''];

const DEFAULT_SETTINGS: ScoreSettings = {
  initialPoints: 25000,
  returnPoints: 30000,
  uma: [10, 5, -5, -10],
  yakitoriPoints: 6000,
  yakitoriEnabled: false,
  yakitoriMode: 'distribution',
  chipPoints: 1000,
};

interface Round {
  raw: SeatRecord<number>;
  yakitori: SeatRecord<boolean>;
}

interface Persisted {
  settings: ScoreSettings;
  names: SeatRecord<string>;
  rounds: Round[];
}

const emptyStr = (): SeatRecord<string> => ({ east: '', south: '', west: '', north: '' });
const emptyBool = (): SeatRecord<boolean> => ({ east: false, south: false, west: false, north: false });

const UMA_PRESETS: { label: string; uma: [number, number, number, number] }[] = [
  { label: '5-10', uma: [10, 5, -5, -10] },
  { label: '10-20', uma: [20, 10, -10, -20] },
  { label: 'なし', uma: [0, 0, 0, 0] },
];

function valClass(n: number): string {
  const r = round1(n);
  return r > 0 ? 'val-pos' : r < 0 ? 'val-neg' : 'val-zero';
}

export default function CalcPage() {
  const [settings, setSettings] = useState<ScoreSettings>(DEFAULT_SETTINGS);
  const [names, setNames] = useState<SeatRecord<string>>(emptyStr());
  const [inputs, setInputs] = useState<SeatRecord<string>>(emptyStr());
  const [yakitori, setYakitori] = useState<SeatRecord<boolean>>(emptyBool());
  const [rounds, setRounds] = useState<Round[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // 復元
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Persisted;
        if (p.settings) setSettings({ ...DEFAULT_SETTINGS, ...p.settings });
        if (p.names) setNames({ ...emptyStr(), ...p.names });
        if (Array.isArray(p.rounds)) setRounds(p.rounds);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  // 保存
  useEffect(() => {
    if (!hydrated) return;
    const data: Persisted = { settings, names, rounds };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, [settings, names, rounds, hydrated]);

  const rawScores: SeatRecord<number> = useMemo(() => {
    const raw = {} as SeatRecord<number>;
    SEATS.forEach((s) => { raw[s] = parseInt(inputs[s]) || 0; });
    return raw;
  }, [inputs]);

  const anyInput = SEATS.some((s) => inputs[s] !== '');
  const result = useMemo(() => calcRoundResult(rawScores, yakitori, settings), [rawScores, yakitori, settings]);
  const validation = validateRawScores(rawScores, settings);
  const expected = expectedRawTotal(settings);

  const session = useMemo(() => calcSessionTotals(rounds, settings), [rounds, settings]);

  const seatName = (s: Seat) => names[s]?.trim() || SEAT_LABEL[s];

  // ウマ・オカの自由設定用
  const umaTotal = settings.uma.reduce((a, b) => a + b, 0);
  const autoOka = round1(((settings.returnPoints - settings.initialPoints) * 4) / 1000);
  const okaManual = settings.okaOverride !== undefined;
  const effectiveOka = okaManual ? settings.okaOverride! : autoOka;

  const setUma = (i: number, v: number) =>
    setSettings((s) => {
      const u = [...s.uma] as [number, number, number, number];
      u[i] = v;
      return { ...s, uma: u };
    });

  const setOkaManual = (manual: boolean) =>
    setSettings((s) => {
      if (manual) return { ...s, okaOverride: autoOka };
      const next = { ...s };
      delete next.okaOverride;
      return next;
    });

  const handleInput = (s: Seat, v: string) => {
    if (v !== '' && !/^-?\d*$/.test(v)) return;
    setInputs((prev) => ({ ...prev, [s]: v }));
  };

  const addRound = () => {
    if (!anyInput) return;
    if (!validation.ok) {
      const ok = confirm(
        `素点の合計が ${validation.actual.toLocaleString()} 点です（正しくは ${expected.toLocaleString()} 点）。\nこのまま記録に追加しますか？`,
      );
      if (!ok) return;
    }
    setRounds((prev) => [...prev, { raw: { ...rawScores }, yakitori: { ...yakitori } }]);
    setInputs(emptyStr());
    setYakitori(emptyBool());
  };

  const removeRound = (i: number) => setRounds((prev) => prev.filter((_, idx) => idx !== i));
  const clearAll = () => {
    if (rounds.length && !confirm('記録をすべて消去しますか？')) return;
    setRounds([]);
  };

  return (
    <div className="page-wrap" style={{ maxWidth: 900 }}>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h1 className="fw-bold mb-1" style={{ fontSize: 'clamp(1.4rem,4vw,1.9rem)', letterSpacing: '-.02em' }}>
            点数計算ツール
          </h1>
          <span className="jr-chip">登録不要 · すぐ使える</span>
        </div>
        <button className="jr-btn jr-btn-ghost" style={{ minHeight: 42, padding: '.5rem 1rem' }} onClick={() => setShowSettings((v) => !v)}>
          <i className="bi bi-sliders" /> ルール設定
        </button>
      </div>

      {showSettings && (
        <div className="jr-card mb-3">
          <div className="jr-card-body">
            <div className="row g-3">
              <div className="col-6 col-md-3">
                <label className="jr-label">配給原点</label>
                <input className="jr-input" type="number" step={1000} value={settings.initialPoints}
                  onChange={(e) => setSettings((s) => ({ ...s, initialPoints: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="col-6 col-md-3">
                <label className="jr-label">返し点</label>
                <input className="jr-input" type="number" step={1000} value={settings.returnPoints}
                  onChange={(e) => setSettings((s) => ({ ...s, returnPoints: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="col-12 col-md-6">
                <label className="jr-label">ウマ（プリセット）</label>
                <div className="d-flex gap-2 flex-wrap">
                  {UMA_PRESETS.map((p) => {
                    const active = p.uma.every((v, i) => v === settings.uma[i]);
                    return (
                      <button key={p.label} type="button"
                        className={`jr-btn ${active ? 'jr-btn-primary' : 'jr-btn-ghost'}`}
                        style={{ minHeight: 40, padding: '.4rem .9rem' }}
                        onClick={() => setSettings((s) => ({ ...s, uma: p.uma }))}>
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="col-12">
                <label className="jr-label">ウマ（自由設定・順位ごと）</label>
                <div className="row g-2">
                  {(['1位', '2位', '3位', '4位'] as const).map((lbl, i) => (
                    <div className="col-3" key={lbl}>
                      <div className="text-center small mb-1" style={{ color: 'var(--jr-ink-muted)' }}>{lbl}</div>
                      <input
                        className="jr-input text-center"
                        type="number"
                        value={settings.uma[i]}
                        onChange={(e) => setUma(i, parseInt(e.target.value) || 0)}
                        aria-label={`${lbl}のウマ`}
                      />
                    </div>
                  ))}
                </div>
                <div className={`small mt-1 ${umaTotal === 0 ? '' : 'val-neg'}`} style={{ color: umaTotal === 0 ? 'var(--jr-ink-muted)' : undefined }}>
                  {umaTotal === 0 ? '合計0（ゼロサム）✓' : `⚠ ウマ合計が ${umaTotal > 0 ? '+' : ''}${umaTotal}（0にすると合計得点がゼロサムになります）`}
                </div>
              </div>

              <div className="col-12">
                <label className="jr-label">オカ（1位への加点）</label>
                <div className="d-flex gap-2 flex-wrap align-items-center">
                  <button type="button"
                    className={`jr-btn ${!okaManual ? 'jr-btn-primary' : 'jr-btn-ghost'}`}
                    style={{ minHeight: 40, padding: '.4rem .9rem' }}
                    onClick={() => setOkaManual(false)}>
                    自動（返し点−配給原点）
                  </button>
                  <button type="button"
                    className={`jr-btn ${okaManual ? 'jr-btn-primary' : 'jr-btn-ghost'}`}
                    style={{ minHeight: 40, padding: '.4rem .9rem' }}
                    onClick={() => setOkaManual(true)}>
                    手動で指定
                  </button>
                  {okaManual ? (
                    <span className="d-inline-flex align-items-center gap-2">
                      <input
                        className="jr-input text-end"
                        style={{ width: 120, minHeight: 40, display: 'inline-block' }}
                        type="number"
                        step={1000}
                        value={Math.round(effectiveOka * 1000)}
                        onChange={(e) => setSettings((s) => ({ ...s, okaOverride: (parseInt(e.target.value) || 0) / 1000 }))}
                        aria-label="オカ（点）"
                      />
                      <span className="text-muted small">点</span>
                    </span>
                  ) : (
                    <span className="jr-chip jr-chip-muted">= {effectiveOka > 0 ? '+' : ''}{effectiveOka}（{Math.round(effectiveOka * 1000).toLocaleString()}点）</span>
                  )}
                </div>
              </div>

              <div className="col-12">
                <label className="yk-toggle" style={{ marginRight: 8 }}>
                  <input type="checkbox" checked={settings.yakitoriEnabled}
                    onChange={(e) => setSettings((s) => ({ ...s, yakitoriEnabled: e.target.checked }))} />
                  🐔 焼き鳥ルールを使う
                </label>
                {settings.yakitoriEnabled && (
                  <span className="d-inline-flex align-items-center gap-2 ms-2">
                    <input className="jr-input" style={{ width: 110, minHeight: 40, display: 'inline-block' }} type="number" step={100}
                      value={settings.yakitoriPoints}
                      onChange={(e) => setSettings((s) => ({ ...s, yakitoriPoints: parseInt(e.target.value) || 0 }))} />
                    <span className="text-muted small">点</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 入力カード */}
      <div className="jr-card mb-4">
        <div className="jr-card-head">
          <h5 className="jr-card-title">✏️ 素点を入力</h5>
          <span className="jr-chip jr-chip-muted">{rounds.length + 1} 半荘目</span>
        </div>
        <div className="jr-card-body">
          <div className="row g-3">
            {SEATS.map((s) => {
              const r = result[s];
              const dataAttr = { [`data-${s}`]: '' } as Record<string, string>;
              return (
                <div key={s} className="col-12 col-sm-6">
                  <div className="seat-card h-100" {...dataAttr}>
                    <div className="d-flex justify-content-between align-items-center mb-2" style={{ paddingLeft: 6 }}>
                      <span className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                        <span className="seat-tag">{SEAT_LABEL[s]}</span>
                        <input
                          className="seat-name"
                          value={names[s]}
                          onChange={(e) => setNames((n) => ({ ...n, [s]: e.target.value }))}
                          placeholder="名前"
                          style={{ border: 0, outline: 0, background: 'transparent', width: '7rem', fontSize: '.95rem' }}
                          maxLength={12}
                        />
                      </span>
                      <span className="rank-pill">{RANK_MEDAL[r.rank - 1]}<span className={r.rank === 1 ? 'rank-1' : ''}>{r.rank}位</span></span>
                    </div>
                    <div className="score-field" style={{ marginLeft: 6 }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={inputs[s]}
                        onChange={(e) => handleInput(s, e.target.value)}
                        placeholder="0"
                        maxLength={7}
                        aria-label={`${seatName(s)}の点数`}
                      />
                      <span className="suffix">点</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-2" style={{ paddingLeft: 6 }}>
                      {settings.yakitoriEnabled ? (
                        <label className={`yk-toggle ${yakitori[s] ? 'on' : ''}`}>
                          <input type="checkbox" checked={yakitori[s]}
                            onChange={(e) => setYakitori((y) => ({ ...y, [s]: e.target.checked }))} />
                          🐔
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
              <span>合計 <strong className="tnum">{validation.actual.toLocaleString()}</strong> / {expected.toLocaleString()}</span>
              <span>{validation.ok ? '✓ 一致' : `差分 ${validation.diff > 0 ? '+' : ''}${validation.diff.toLocaleString()}`}</span>
            </div>
          )}
        </div>
        <div className="submit-bar">
          <button className="jr-btn jr-btn-primary jr-btn-block" onClick={addRound} disabled={!anyInput}>
            <i className="bi bi-plus-lg" /> この半荘を記録に追加
          </button>
        </div>
      </div>

      {/* 記録 */}
      <div className="jr-card">
        <div className="jr-card-head">
          <h5 className="jr-card-title">📋 記録</h5>
          {rounds.length > 0 && (
            <button className="jr-link" style={{ background: 'none', border: 0, fontSize: '.85rem' }} onClick={clearAll}>
              すべて消去
            </button>
          )}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="jr-table">
            <thead>
              <tr>
                <th style={{ width: 44 }}>局</th>
                {SEATS.map((s) => <th key={s} className="text-truncate">{seatName(s)}</th>)}
                <th style={{ width: 44 }}></th>
              </tr>
            </thead>
            <tbody>
              {rounds.length === 0 && (
                <tr><td colSpan={6} className="empty-state" style={{ padding: '1.5rem' }}>
                  上で入力して「記録に追加」すると、ここに累計が出ます
                </td></tr>
              )}
              {rounds.map((round, i) => {
                const rr = calcRoundResult(round.raw, round.yakitori, settings);
                return (
                  <tr key={i}>
                    <td className="rd">{i + 1}</td>
                    {SEATS.map((s) => (
                      <td key={s} className={`num ${valClass(rr[s].final)}`}>
                        <span className="me-1">{formatSigned(rr[s].final)}</span>
                        {round.yakitori[s] && <span title="焼き鳥">🐔</span>}
                      </td>
                    ))}
                    <td>
                      <button onClick={() => removeRound(i)} title="削除"
                        style={{ border: 0, background: 'transparent', color: 'var(--jr-ink-muted)', cursor: 'pointer', minHeight: 36, minWidth: 36 }}>🗑</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {rounds.length > 0 && (
              <tfoot>
                <tr>
                  <td className="rd">総得点</td>
                  {SEATS.map((s) => (
                    <td key={s} className={`num jr-total ${valClass(session.totals[s])}`}>{formatSigned(session.totals[s])}</td>
                  ))}
                  <td></td>
                </tr>
                <tr>
                  <td className="rd">順位</td>
                  {SEATS.map((s) => (
                    <td key={s}>
                      <span className="rank-pill">{RANK_MEDAL[session.ranks[s] - 1]}<span className={session.ranks[s] === 1 ? 'rank-1' : ''}>{session.ranks[s]}位</span></span>
                    </td>
                  ))}
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 登録導線 */}
      <div className="jr-card mt-4" style={{ background: 'linear-gradient(135deg,#064e3b,#0f172a)', border: 0 }}>
        <div className="jr-card-body d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div style={{ color: '#fff' }}>
            <div className="fw-bold" style={{ fontSize: '1.05rem' }}>記録を残して振り返りたくなったら</div>
            <div style={{ color: 'rgba(255,255,255,.75)', fontSize: '.9rem' }}>無料登録で、対局履歴・成績グラフ・フレンドと共有が使えます</div>
          </div>
          <div className="d-flex gap-2">
            <Link href="/register" className="jr-btn jr-btn-primary">無料で登録</Link>
            <Link href="/login" className="jr-btn jr-btn-ghost" style={{ color: '#fff', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.25)' }}>ログイン</Link>
          </div>
        </div>
      </div>

      <p className="text-center mt-3 mb-0" style={{ color: 'var(--jr-ink-muted)', fontSize: '.8rem' }}>
        入力内容はこの端末のブラウザだけに保存されます
      </p>
    </div>
  );
}
