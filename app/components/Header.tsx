'use client';

import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGameNavigation } from '../hooks/useGameNavigation';

interface HeaderProps {
  gameId?: string;
}

export default function Header({ gameId }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/';
  const isAuthenticated = !!session?.user;
  const { handleSaveAndNavigate } = useGameNavigation({ gameId: gameId || '' });

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    // ゲームページから他のページへの遷移の場合
    if (gameId && pathname?.includes('/games/') && !pathname?.includes('/score')) {
      e.preventDefault();
      handleSaveAndNavigate(path);
    }
  };

  const Brand = () => (
    <span className="jr-brand">
      <span className="dot" aria-hidden />
      JongReco
    </span>
  );

  if (isAuthPage) {
    return (
      <header className="jr-appbar">
        <div className="page-wrap py-3 d-flex align-items-center" style={{ paddingTop: 0, paddingBottom: 0, minHeight: 56 }}>
          <Brand />
        </div>
      </header>
    );
  }

  return (
    <header className="jr-appbar">
      <div className="page-wrap py-2" style={{ paddingTop: 8, paddingBottom: 8 }}>
        <div className="d-flex justify-content-between align-items-center" style={{ minHeight: 44 }}>
          <Brand />

          {/* デスクトップメニュー */}
          <nav className="d-none d-md-flex align-items-center gap-3">
            <Link href="/dashboard" className="jr-navlink" onClick={(e) => handleNavigation(e, '/dashboard')}>
              ダッシュボード
            </Link>
            {isAuthenticated && (
              <Link href="/profile" className="jr-navlink">
                <i className="bi bi-person-circle me-1"></i>プロフィール
              </Link>
            )}
            <button onClick={handleLogout} className="jr-btn jr-btn-ghost" style={{ minHeight: 38, padding: '.3rem .9rem', color: '#fff', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)' }}>
              ログアウト
            </button>
          </nav>

          {/* モバイルメニューボタン */}
          <button
            className="d-md-none jr-btn jr-btn-ghost"
            style={{ minHeight: 40, width: 40, padding: 0, color: '#fff', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)' }}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="メニュー"
          >
            <i className={`bi ${isMenuOpen ? 'bi-x-lg' : 'bi-list'}`}></i>
          </button>
        </div>

        {/* モバイルメニュー */}
        {isMenuOpen && (
          <div className="d-md-none mt-2 pb-2 d-flex flex-column gap-2">
            <Link
              href="/dashboard"
              className="jr-navlink"
              onClick={(e) => { handleNavigation(e, '/dashboard'); setIsMenuOpen(false); }}
            >
              <i className="bi bi-grid me-2"></i>ダッシュボード
            </Link>
            {isAuthenticated && (
              <Link
                href="/profile"
                className="jr-navlink"
                onClick={(e) => { handleNavigation(e, '/profile'); setIsMenuOpen(false); }}
              >
                <i className="bi bi-person-circle me-2"></i>プロフィール
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="jr-btn jr-btn-ghost align-self-start"
              style={{ minHeight: 40, padding: '.4rem 1rem', color: '#fff', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)' }}
            >
              ログアウト
            </button>
          </div>
        )}
      </div>
    </header>
  );
} 