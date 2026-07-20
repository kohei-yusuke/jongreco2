import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/auth.config';
import prisma from '@/lib/prisma';

export interface Player {
  id?: string;
  name: string;
  email?: string;
  position: string;
  isCurrentUser: boolean;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { players, settings } = body;

    // プレイヤー情報の検証
    if (!Array.isArray(players) || players.length !== 4) {
      return new Response(JSON.stringify({ error: 'プレイヤーは4人必要です' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // プレイヤーの位置情報の検証
    const positions = ['east', 'south', 'west', 'north'];
    const hasAllPositions = positions.every(pos => 
      players.some(p => p.position === pos)
    );

    if (!hasAllPositions) {
      return new Response(JSON.stringify({ error: '各プレイヤーの位置が正しく設定されていません' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // プレイヤー情報の重複チェック
    const playerIds = new Set<string>();
    const playerEmails = new Set<string>();
    const playerNames = new Set<string>();

    for (const player of players) {
      if (player.userId && playerIds.has(player.userId)) {
        return NextResponse.json({ error: '同じユーザーIDのプレイヤーが存在します' }, { status: 400 });
      }
      if (player.email && playerEmails.has(player.email)) {
        return NextResponse.json({ error: '同じメールアドレスのプレイヤーが存在します' }, { status: 400 });
      }
      if (player.name && playerNames.has(player.name)) {
        return NextResponse.json({ error: '同じ名前のプレイヤーが存在します' }, { status: 400 });
      }

      if (player.userId) playerIds.add(player.userId);
      if (player.email) playerEmails.add(player.email);
      if (player.name) playerNames.add(player.name);
    }

    // ゲームの作成
    const game = await prisma.game.create({
      data: {
        initialPoints: settings.initialPoints,
        returnPoints: settings.returnPoints,
        chipPoints: settings.chipPoints,
        yakitoriPoints: settings.yakitoriPoints,
        yakitoriMode: settings.yakitoriMode ?? 'distribution',
        uma1: settings.uma1,
        uma2: settings.uma2,
        uma3: settings.uma3,
        uma4: settings.uma4,
        chipEnabled: settings.chipEnabled,
        yakitoriEnabled: settings.yakitoriEnabled,
        players: {
          // NOTE: Player モデルに isCurrentUser カラムは無いので保存しない
          create: players.map(player => ({
            position: player.position,
            name: player.name,
            userId: player.userId,
          }))
        }
      },
      include: {
        players: {
          include: {
            user: true
          }
        }
      }
    });

    return new Response(JSON.stringify(game), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error creating game:', error);
    return new Response(JSON.stringify({ error: '対局の作成に失敗しました' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}