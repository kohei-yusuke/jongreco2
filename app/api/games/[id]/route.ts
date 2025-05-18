import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

interface Player {
  id: string;
  position: string;
  user: {
    name: string | null;
  } | null;
}

interface Game {
  id: string;
  name: string;
  uma1: number;
  uma2: number;
  uma3: number;
  uma4: number;
  yakitoriPoints: number;
  players: Player[];
  umaFirst: number;
  umaSecond: number;
  umaThird: number;
  umaFourth: number;
  initialPoints: number;
  returnPoints: number;
  currentRound: number;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!params.id) {
      return new NextResponse('Game ID is required', { status: 400 });
    }

    const game = await prisma.game.findUnique({
      where: {
        id: params.id,
      },
      include: {
        players: {
          include: {
            user: true,
          },
        },
        scores: {
          orderBy: {
            round: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!game) {
      return new NextResponse('Game not found', { status: 404 });
    }

    // 最新の局数を取得
    const currentRound = game.scores[0]?.round || 0;

    // プレイヤー情報を整形
    const formattedPlayers = game.players.map(player => ({
      id: player.id,
      name: player.name,
      position: player.position,
      user: player.user ? {
        name: player.user.name,
      } : null,
    }));

    // ゲーム設定を整形
    const settings = {
      uma: {
        first: game.uma1 || 0,
        second: game.uma2 || 0,
        third: game.uma3 || 0,
        fourth: game.uma4 || 0,
      },
      yakitori: game.yakitoriPoints || 0,
      initialPoints: game.initialPoints || 0,
      returnPoints: game.returnPoints || 0,
    };

    return NextResponse.json({
      id: game.id,
      name: game.name,
      players: formattedPlayers,
      settings,
      currentRound,
    });
  } catch (error) {
    console.error('Error fetching game:', error);
    return new NextResponse(
      JSON.stringify({
        error: 'Failed to fetch game',
        details: error instanceof Error ? error.message : 'Unknown error',
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