import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

interface GameSettings {
  initialPoints: number;
  returnPoints: number;
  chipPoints: number;
  yakitoriPoints: number;
  yakitoriMode: 'distribution' | 'winner_takes_all';
  uma1: number;
  uma2: number;
  uma3: number;
  uma4: number;
  chipEnabled: boolean;
  yakitoriEnabled: boolean;
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const gameId = params.id;
    if (!gameId) {
      return NextResponse.json({ error: 'ゲームIDが必要です' }, { status: 400 });
    }

    const settings = await request.json() as GameSettings;

    // ゲームの存在確認と権限チェック
    const game = await prisma.game.findFirst({
      where: {
        id: gameId,
        players: {
          some: {
            userId: session.user.id
          }
        }
      }
    });

    if (!game) {
      return NextResponse.json({ error: 'ゲームが見つかりません' }, { status: 404 });
    }

    // 設定を更新
    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        initialPoints: settings.initialPoints,
        returnPoints: settings.returnPoints,
        chipPoints: settings.chipPoints,
        yakitoriPoints: settings.yakitoriPoints,
        yakitoriMode: settings.yakitoriMode,
        uma1: settings.uma1,
        uma2: settings.uma2,
        uma3: settings.uma3,
        uma4: settings.uma4,
        chipEnabled: settings.chipEnabled,
        yakitoriEnabled: settings.yakitoriEnabled,
      }
    });

    return NextResponse.json({ success: true, game: updatedGame });
  } catch (error) {
    console.error('ゲーム設定の更新エラー:', error);
    return NextResponse.json(
      { error: 'ゲーム設定の更新に失敗しました' },
      { status: 500 }
    );
  }
} 