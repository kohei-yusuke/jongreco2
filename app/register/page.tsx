'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // パスワードの一致確認
    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    // パスワードの長さチェック
    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        router.push('/login?registered=true');
      } else {
        const data = await response.json();
        setError(data.message || '登録に失敗しました');
      }
    } catch {
      setError('登録処理中にエラーが発生しました');
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card jr-card">
        <div className="jr-card-body">
          <h2 className="auth-title">アカウント作成</h2>
          <p className="auth-sub mb-4">はじめまして。JongReco へようこそ</p>
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
            <div>
              <label htmlFor="password" className="jr-label">パスワード</label>
              <input
                type="password"
                className="jr-input"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8文字以上"
                required
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="jr-label">パスワード（確認）</label>
              <input
                type="password"
                className="jr-input"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="もう一度入力"
                required
              />
            </div>
            <button type="submit" className="jr-btn jr-btn-primary jr-btn-block mt-1">
              登録する
            </button>
          </form>
          <div className="text-center mt-3">
            <Link href="/login" className="jr-link" style={{ fontSize: '.9rem' }}>
              すでにアカウントをお持ちの方はこちら
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 