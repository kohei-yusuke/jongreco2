'use client';

import { useCallback, useEffect, useState } from 'react';

export interface TourStep {
  /** ハイライト対象の CSS セレクタ。見つからなければ中央にカード表示 */
  selector?: string;
  title: string;
  body: string;
}

interface TutorialProps {
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
}

interface Box { top: number; left: number; width: number; height: number; }

/**
 * スポットライト式のインタラクティブ・チュートリアル。
 * 対象要素を丸くくり抜いて強調し、下部シート型のカードで手順を案内する。
 */
export default function Tutorial({ steps, open, onClose }: TutorialProps) {
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);

  const measure = useCallback(() => {
    const step = steps[i];
    const el = step?.selector ? (document.querySelector(step.selector) as HTMLElement | null) : null;
    if (!el) {
      setBox(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const pad = 8;
    setBox({ top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 });
  }, [i, steps]);

  // ステップ変更時：対象を画面中央へスクロールしてから採寸
  useEffect(() => {
    if (!open) return;
    const step = steps[i];
    const el = step?.selector ? (document.querySelector(step.selector) as HTMLElement | null) : null;
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const t = setTimeout(measure, 320);
    return () => clearTimeout(t);
  }, [open, i, steps, measure]);

  // スクロール/リサイズ追従
  useEffect(() => {
    if (!open) return;
    const handler = () => measure();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [open, measure]);

  // 開いたら先頭から
  useEffect(() => {
    if (open) setI(0);
  }, [open]);

  // Esc で閉じる
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || steps.length === 0) return null;

  const step = steps[i];
  const last = i === steps.length - 1;

  return (
    <div className="tour-root" role="dialog" aria-modal="true" aria-label="チュートリアル">
      {/* クリックを遮る透明レイヤ */}
      <div className="tour-catch" onClick={(e) => e.stopPropagation()} />
      {box ? (
        <div
          className="tour-spot"
          style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
        />
      ) : (
        <div className="tour-dim" />
      )}

      <div className="tour-card">
        <div className="tour-step">STEP {i + 1} / {steps.length}</div>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        <div className="tour-actions">
          <button type="button" className="tour-skip" onClick={onClose}>
            スキップ
          </button>
          <div className="tour-grp">
            {i > 0 && (
              <button type="button" className="jr-btn jr-btn-ghost" style={{ minHeight: 40, padding: '.4rem .9rem' }} onClick={() => setI(i - 1)}>
                戻る
              </button>
            )}
            <button
              type="button"
              className="jr-btn jr-btn-primary"
              style={{ minHeight: 40, padding: '.4rem 1.1rem' }}
              onClick={() => (last ? onClose() : setI(i + 1))}
            >
              {last ? 'はじめる 🀄' : '次へ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
