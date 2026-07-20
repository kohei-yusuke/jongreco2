'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('メールアドレスまたはパスワードが正しくありません');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('ログイン処理中にエラーが発生しました');
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card jr-card">
        <div className="jr-card-body">
          <h2 className="auth-title">おかえりなさい</h2>
          <p className="auth-sub mb-4">JongReco にログイン</p>
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
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" className="jr-btn jr-btn-primary jr-btn-block mt-1">
              ログイン
            </button>
          </form>
          <div className="text-center mt-3 d-flex flex-column gap-2">
            <Link href="/reset-password" className="jr-link" style={{ fontSize: '.85rem' }}>
              パスワードをお忘れですか？
            </Link>
            <Link href="/register" className="jr-link" style={{ fontSize: '.9rem' }}>
              アカウントをお持ちでない方はこちら
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 