'use client';

import { usePathname } from 'next/navigation';
import Header from '@/app/components/Header';

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const gameId = pathname.split('/')[2]; // /games/[id]/... から id を取得

  // 対局詳細ページとスコア入力ページではヘッダーを表示しない
  const shouldShowHeader = !pathname.includes('/games/') || pathname === '/games';

  return (
    <>
      {shouldShowHeader && <Header gameId={gameId} />}
      {children}
    </>
  );
} 