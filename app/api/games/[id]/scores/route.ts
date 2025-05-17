import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

// スコアデータの取得
export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const gameId = context.params.id;

    // スコアを取得（ヤキトリ情報を含む）
    const scores = await prisma.score.findMany({
      where: { gameId },
      orderBy: { round: 'asc' },
      include: {
        yakitori: true
      }
    });

    // スコアデータを整形
    const formattedScores = scores.map(score => ({
      id: score.id,
      round: score.round,
      east: score.east,
      south: score.south,
      west: score.west,
      north: score.north,
      yakitori: score.yakitori ? {
        east: score.yakitori.east,
        south: score.yakitori.south,
        west: score.yakitori.west,
        north: score.yakitori.north,
      } : {
        east: false,
        south: false,
        west: false,
        north: false,
      }
    }));

    return NextResponse.json({ scores: formattedScores });
  } catch (error) {
    console.error('Error fetching scores:', error);
    return NextResponse.json(
      { error: 'スコアデータの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// スコアデータの作成
export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const gameId = context.params.id;

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { scores } = await request.json();
    const { east, south, west, north, yakitori } = scores;

    // 最新のスコアを取得
    const latestScore = await prisma.score.findFirst({
      where: {
        gameId,
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
        gameId,
        round,
        east: east || 0,
        south: south || 0,
        west: west || 0,
        north: north || 0,
        yakitori: yakitori ? {
          create: {
            east: yakitori.east || false,
            south: yakitori.south || false,
            west: yakitori.west || false,
            north: yakitori.north || false,
          }
        } : undefined
      },
      include: {
        yakitori: true
      }
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