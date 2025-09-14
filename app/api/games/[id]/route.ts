import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth.config';
import prisma from '@/lib/prisma';
interface User {
  id: string;
  email: string;
  name: string | null;
  iconPath: string | null;
}

interface Player {
  id: string;
  gameId: string;
  userId: string | null;
  name: string;
  position: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Score {
  id: string;
  gameId: string;
  round: number;
  east: number;
  south: number;
  west: number;
  north: number;
  createdAt: Date;
  updatedAt: Date;
  roundId: string | null;
}

interface PlayerWithUser extends Player {
  user: User | null;
}

interface Game {
  id: string;
  name: string | null;
  initialPoints: number;
  returnPoints: number;
  chipPoints: number;
  yakitoriPoints: number;
  yakitoriMode: string;
  uma1: number;
  uma2: number;
  uma3: number;
  uma4: number;
  chipEnabled: boolean;
  yakitoriEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
}

interface GameWithRelations extends Game {
  players: PlayerWithUser[];
  scores: Score[];
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
    }) as GameWithRelations | null;

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
        iconPath: player.user.iconPath,
      } : null,
    }));

    // ゲーム設定を整形
    const settings = {
      uma: {
        first: game.uma1,
        second: game.uma2,
        third: game.uma3,
        fourth: game.uma4,
      },
      yakitori: game.yakitoriPoints,
      initialPoints: game.initialPoints,
      returnPoints: game.returnPoints,
      chipPoints: game.chipPoints,
      chipEnabled: game.chipEnabled,
      yakitoriEnabled: game.yakitoriEnabled,
      yakitoriMode: game.yakitoriMode,
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