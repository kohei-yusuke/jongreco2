import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

// スコアデータの取得
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json(
      { error: '認証が必要です' },
      { status: 401 }
    );
  }

  try {
    const scores = await prisma.score.findMany({
      where: {
        gameId: params.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json(scores);
  } catch (error) {
    console.error('Error fetching scores:', error);
    return NextResponse.json(
      { error: 'スコアの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// スコアデータの作成
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { scores } = await request.json();
    const { east, south, west, north } = scores;

    // 最新のスコアを取得
    const latestScore = await prisma.score.findFirst({
      where: {
        gameId: params.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 次のラウンド番号を計算
    const round = latestScore ? latestScore.round + 1 : 1;

    // スコアを作成
    const score = await prisma.score.create({
      data: {
        gameId: params.id,
        round,
        east: east || 0,
        south: south || 0,
        west: west || 0,
        north: north || 0,
      },
    });

    return NextResponse.json(score);
  } catch (error) {
    console.error('Error creating score:', error);
    return NextResponse.json(
      { error: 'スコアの作成に失敗しました' },
      { status: 500 }
    );
  }
} 