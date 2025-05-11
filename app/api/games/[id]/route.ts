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
      },
    });

    if (!game) {
      return new NextResponse('Game not found', { status: 404 });
    }

    // プレイヤー情報を整形
    const formattedPlayers = game.players.map(player => ({
      id: player.id,
      name: player.user?.name || 'Unknown',
      position: player.position,
      user: {
        name: player.user?.name || 'Unknown',
      },
    }));

    // ゲーム設定を整形
    const settings = {
      uma: {
        first: game.umaFirst || 0,
        second: game.umaSecond || 0,
        third: game.umaThird || 0,
        fourth: game.umaFourth || 0,
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