import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth.config';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const histories = await prisma.gameHistory.findMany({
      where: {
        players: {
          some: {
            player: {
              userId: session.user.id
            }
          }
        }
      },
      include: {
        players: {
          orderBy: {
            rank: 'asc',
          },
          include: {
            player: true
          }
        },
        game: {
          select: {
            settings: true,
            yakitoriPlayers: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(histories);
  } catch (error) {
    console.error('Error fetching game histories:', error);
    return NextResponse.json(
      { error: '対局履歴の取得に失敗しました' },
      { status: 500 }
    );
  }
} 