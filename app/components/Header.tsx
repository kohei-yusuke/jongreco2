'use client';

import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/';
  const isAuthenticated = !!session?.user;

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  if (isAuthPage) {
    return (
      <header className="bg-black text-white py-3">
        <div className="container">
          <h1 className="h4 mb-0">JongReco</h1>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-black text-white py-3">
      <div className="container">
        <div className="d-flex justify-content-between align-items-center">
          <h1 className="h4 mb-0">JongReco</h1>
          
          {/* デスクトップメニュー */}
          <div className="d-none d-md-flex align-items-center">
            <Link href="/dashboard" className="text-white text-decoration-none me-3">
              ダッシュボード
            </Link>
            {isAuthenticated && (
              <Link href="/profile" className="text-white text-decoration-none me-3">
                <i className="bi bi-person-circle me-1"></i>
                プロフィール
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="btn btn-outline-light btn-sm"
            >
              ログアウト
            </button>
          </div>

          {/* モバイルメニューボタン */}
          <button
            className="btn btn-outline-light d-md-none"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="メニュー"
          >
            <i className="bi bi-three-dots-vertical"></i>
          </button>
        </div>

        {/* モバイルメニュー */}
        {isMenuOpen && (
          <div className="d-md-none mt-3">
            <div className="d-flex flex-column">
              <Link
                href="/dashboard"
                className="text-white text-decoration-none mb-2"
                onClick={() => setIsMenuOpen(false)}
              >
                ダッシュボード
              </Link>
              {isAuthenticated && (
                <Link
                  href="/profile"
                  className="text-white text-decoration-none mb-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <i className="bi bi-person-circle me-1"></i>
                  プロフィール
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="btn btn-outline-light btn-sm align-self-start"
              >
                ログアウト
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
} 