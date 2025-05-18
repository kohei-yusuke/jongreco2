import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

interface Player {
  id?: string;
  name: string;
  email?: string;
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

// メールアドレスのバリデーション用正規表現
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

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
    const playerNames = new Set<string>();
    const playerEmails = new Set<string>();
    const playerIds = new Set<string>();

    for (const [position, player] of playerEntries) {
      // 名前の必須チェック
      if (!player.name) {
        return NextResponse.json(
          { error: `${position}のプレイヤー名を入力してください` },
          { status: 400 }
        );
      }

      // 名前の長さチェック
      if (player.name.length < 1 || player.name.length > 20) {
        return NextResponse.json(
          { error: `${position}のプレイヤー名は1文字以上20文字以下で入力してください` },
          { status: 400 }
        );
      }

      // 名前の重複チェック
      if (playerNames.has(player.name)) {
        return NextResponse.json(
          { error: `同じ名前のプレイヤーが存在します: ${player.name}` },
          { status: 400 }
        );
      }
      playerNames.add(player.name);

      // メールアドレスのバリデーション（存在する場合）
      if (player.email) {
        if (!EMAIL_REGEX.test(player.email)) {
          return NextResponse.json(
            { error: `${position}のメールアドレスの形式が正しくありません` },
            { status: 400 }
          );
        }

        if (playerEmails.has(player.email)) {
          return NextResponse.json(
            { error: `同じメールアドレスのプレイヤーが存在します: ${player.email}` },
            { status: 400 }
          );
        }
        playerEmails.add(player.email);
      }

      // ユーザーIDの重複チェック（存在する場合）
      if (player.id) {
        if (playerIds.has(player.id)) {
          return NextResponse.json(
            { error: `同じユーザーIDのプレイヤーが存在します` },
            { status: 400 }
          );
        }
        playerIds.add(player.id);
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