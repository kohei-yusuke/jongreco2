'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setMessage('パスワードリセット用のメールを送信しました。メールをご確認ください。');
        setEmail('');
      } else {
        const data = await response.json();
        setError(data.message || 'リセットメールの送信に失敗しました');
      }
    } catch {
      setError('処理中にエラーが発生しました');
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card jr-card">
        <div className="jr-card-body">
          <h2 className="auth-title">パスワードリセット</h2>
          <p className="auth-sub mb-4">登録済みのメールに再設定用リンクを送ります</p>
          {message && <div className="jr-alert jr-alert-ok mb-3">{message}</div>}
          {error && <div className="jr-alert mb-3">{error}</div>}
          <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
            <div>
              <label htmlFor="email" className="jr-label">メールアドレス</label>
              <input
                type="email"
                className="jr-input"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <button type="submit" className="jr-btn jr-btn-primary jr-btn-block mt-1">
              リセットメールを送信
            </button>
          </form>
          <div className="text-center mt-3">
            <Link href="/login" className="jr-link" style={{ fontSize: '.9rem' }}>ログインに戻る</Link>
          </div>
        </div>
      </div>
    </div>
  );
} 