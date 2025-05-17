import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import prisma from '../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      console.error('認証エラー: セッションが見つかりません');
      return new NextResponse('認証が必要です。ログインしてください。', { status: 401 });
    }

    const body = await request.json();
    const { players, settings } = body;

    // 入力値のバリデーション
    if (!players.east || !players.south || !players.west || !players.north) {
      return new NextResponse('プレイヤー名は必須です', { status: 400 });
    }

    // 対局データを作成
    const game = await prisma.game.create({
      data: {
        initialPoints: settings.initialPoints,
        returnPoints: settings.returnPoints,
        uma1: settings.uma1,
        uma2: settings.uma2,
        uma3: settings.uma3,
        uma4: settings.uma4,
        chipPoints: settings.chipPoints,
        chipEnabled: settings.chipEnabled,
        yakitoriPoints: settings.yakitoriPoints,
        yakitoriEnabled: settings.yakitoriEnabled,
        players: {
          create: [
            { name: players.east, position: '東' },
            { name: players.south, position: '南' },
            { name: players.west, position: '西' },
            { name: players.north, position: '北' },
          ],
        },
      },
    });

    return NextResponse.json(game);
  } catch (error) {
    console.error('対局作成エラー:', error);
    return new NextResponse(
      JSON.stringify({
        error: '対局の作成に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラーが発生しました',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
} 