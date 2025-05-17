import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

// スコアデータの取得
export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const gameId = context.params.id;

  if (!session?.user) {
    return NextResponse.json(
      { error: '認証が必要です' },
      { status: 401 }
    );
  }

  try {
    // プレイヤー情報を取得
    const players = await prisma.player.findMany({
      where: {
        gameId,
      },
      orderBy: {
        position: 'asc',
      },
    });

    // スコアデータを取得
    const scores = await prisma.score.findMany({
      where: {
        gameId,
      },
      orderBy: {
        round: 'asc',
      },
    });

    // プレイヤーごとの集計情報を作成
    const playerStats = players.map(player => {
      const playerScores = scores.map(score => {
        const scoreValue = score[player.position.toLowerCase() as keyof typeof score] as number;
        return {
          round: score.round,
          score: scoreValue,
        };
      });

      const totalScore = playerScores.reduce((sum, score) => sum + score.score, 0);

      return {
        id: player.id,
        name: player.name,
        position: player.position,
        scores: playerScores,
        totalScore,
      };
    });

    // 順位を計算
    const rankedPlayers = playerStats
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((player, index) => ({
        ...player,
        rank: index + 1,
      }));

    return NextResponse.json({
      players: rankedPlayers,
      scores,
      rounds: scores.length,
    });
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
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const gameId = context.params.id;

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { scores } = await request.json();
    const { east, south, west, north } = scores;

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