import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Player, Score, Game, GameHistory, GameHistoryPlayer } from '@prisma/client';

interface GameWithRelations extends Game {
  players: Player[];
  scores: Score[];
}

interface GameHistoryWithPlayers extends GameHistory {
  players: GameHistoryPlayer[];
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { status } = await request.json();
    const gameId = params.id;

    // ゲームとプレイヤー情報を取得
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        players: true,
        scores: true,
      },
    }) as GameWithRelations | null;

    if (!game) {
      return NextResponse.json(
        { error: 'ゲームが見つかりません' },
        { status: 404 }
      );
    }

    // 各プレイヤーの総得点と順位を計算
    const playerScores = game.players.map((player: Player) => {
      const totalScore = game.scores.reduce((sum: number, score: Score) => {
        const position = player.position.toLowerCase() as keyof Score;
        const scoreValue = score[position];
        return sum + (typeof scoreValue === 'number' ? scoreValue : 0);
      }, 0);

      return {
        playerId: player.id,
        name: player.name,
        totalScore,
        rank: 0, // 一時的な値
      };
    });

    // 順位付け
    const sortedScores = [...playerScores].sort((a, b) => b.totalScore - a.totalScore);
    sortedScores.forEach((score, index) => {
      score.rank = index + 1;
    });

    // 対局履歴を作成または更新
    const gameHistory = await prisma.$transaction(async (tx) => {
      const history = await tx.gameHistory.upsert({
        where: { gameId },
        create: {
          gameId,
          status,
          players: {
            create: sortedScores.map(score => ({
              playerId: score.playerId,
              name: score.name,
              totalScore: score.totalScore,
              rank: score.rank,
            })),
          },
        },
        update: {
          status,
          players: {
            deleteMany: {},
            create: sortedScores.map(score => ({
              playerId: score.playerId,
              name: score.name,
              totalScore: score.totalScore,
              rank: score.rank,
            })),
          },
        },
        include: {
          players: true,
        },
      });
      return history;
    }) as GameHistoryWithPlayers;

    return NextResponse.json(gameHistory);
  } catch (error) {
    console.error('Error saving game history:', error);
    return NextResponse.json(
      { error: '対局履歴の保存に失敗しました' },
      { status: 500 }
    );
  }
} 