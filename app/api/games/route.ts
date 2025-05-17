import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

interface Player {
  id?: string;
  name: string;
}

interface GameRequest {
  players: {
    east: Player;
    south: Player;
    west: Player;
    north: Player;
  };
  settings: {
    initialPoints: number;
    returnPoints: number;
    uma1: number;
    uma2: number;
    uma3: number;
    uma4: number;
    chipPoints: number;
    chipEnabled: boolean;
    yakitoriPoints: number;
    yakitoriEnabled: boolean;
  };
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      console.error('認証エラー: セッションが見つかりません');
      return new NextResponse('認証が必要です。ログインしてください。', { status: 401 });
    }

    const { players, settings } = await request.json() as GameRequest;

    // プレイヤー情報のバリデーション
    const playerEntries = Object.entries(players);
    for (const [position, player] of playerEntries) {
      if (!player.name) {
        return NextResponse.json(
          { error: `${position}のプレイヤー名を入力してください` },
          { status: 400 }
        );
      }
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
            {
              name: players.east.name,
              position: 'east',
              userId: players.east.id || null,
            },
            {
              name: players.south.name,
              position: 'south',
              userId: players.south.id || null,
            },
            {
              name: players.west.name,
              position: 'west',
              userId: players.west.id || null,
            },
            {
              name: players.north.name,
              position: 'north',
              userId: players.north.id || null,
            },
          ],
        },
      },
      include: {
        players: {
          include: {
            user: true,
          },
        },
      },
    });

    return NextResponse.json(game);
  } catch (error) {
    console.error('Error creating game:', error);
    return NextResponse.json(
      { error: '対局の作成に失敗しました' },
      { status: 500 }
    );
  }
} 