'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-bs-theme', theme); // Bootstrap 5.3 のダーク対応
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    // 初期テーマ（no-flash スクリプトが設定済みの値を尊重）
    const current = (document.documentElement.getAttribute('data-theme') as Theme) || 'light';
    setTheme(current);
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem('jongreco.theme', next);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'ライトモードに切替' : 'ダークモードに切替'}
      title={theme === 'dark' ? 'ライトモード' : 'ダークモード'}
      className="jr-icon-btn"
    >
      <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon-stars'}`} />
    </button>
  );
}
