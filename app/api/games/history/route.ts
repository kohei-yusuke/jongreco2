import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const histories = await prisma.gameHistory.findMany({
      include: {
        players: {
          orderBy: {
            rank: 'asc',
          },
        },
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