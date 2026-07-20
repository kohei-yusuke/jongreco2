'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isValidToken, setIsValidToken] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('無効なリセットリンクです');
      return;
    }

    // トークンの検証
    fetch('/api/auth/verify-reset-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    })
      .then((res) => {
        if (res.ok) {
          setIsValidToken(true);
        } else {
          setError('無効なリセットリンクです');
        }
      })
      .catch(() => {
        setError('トークンの検証中にエラーが発生しました');
      });
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: searchParams.get('token'),
          password,
        }),
      });

      if (response.ok) {
        setMessage('パスワードの再設定が完了しました');
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        const data = await response.json();
        setError(data.message || 'パスワードの再設定に失敗しました');
      }
    } catch {
      setError('処理中にエラーが発生しました');
    }
  };

  if (!isValidToken) {
    return (
      <div className="auth-wrap">
        <div className="auth-card jr-card">
          <div className="jr-card-body text-center">
            <h2 className="auth-title">パスワードリセット</h2>
            {error && <div className="jr-alert my-3">{error}</div>}
            <Link href="/login" className="jr-btn jr-btn-primary jr-btn-block mt-2">
              ログインに戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card jr-card">
        <div className="jr-card-body">
          <h2 className="auth-title">新しいパスワード</h2>
          <p className="auth-sub mb-4">新しいパスワードを設定してください</p>
          {message && <div className="jr-alert jr-alert-ok mb-3">{message}</div>}
          {error && <div className="jr-alert mb-3">{error}</div>}
          <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
            <div>
              <label htmlFor="password" className="jr-label">新しいパスワード</label>
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
              <label htmlFor="confirmPassword" className="jr-label">新しいパスワード（確認）</label>
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
              パスワードを再設定
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 