import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
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
  players: Player[];
  scores: Score[];
}

interface GameHistoryPlayer {
  id: string;
  gameHistoryId: string;
  playerId: string;
  name: string;
  totalScore: number;
  rank: number;
  createdAt: Date;
  updatedAt: Date;
}

interface GameHistory {
  id: string;
  gameId: string;
  status: string;
  players: GameHistoryPlayer[];
  createdAt: Date;
  updatedAt: Date;
}

type GameHistoryWithPlayers = GameHistory;

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
    const playerScores = game.players.map((player) => {
      const totalScore = game.scores.reduce((sum: number, score) => {
        const position = player.position.toLowerCase();
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