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
      // 基本点の計算
      const position = player.position.toLowerCase() as 'east' | 'south' | 'west' | 'north';
      const baseScore = game.scores.reduce((sum: number, score) => {
        return sum + score[position];
      }, 0);

      // 焼き鳥の計算
      let yakitoriPoints = 0;
      if (game.yakitoriEnabled && game.yakitoriPoints) {
        const hasYakitori = game.scores.some(score => {
          const yakitori = score as unknown as { yakitori?: { [key: string]: boolean } };
          return yakitori.yakitori && yakitori.yakitori[position];
        });
        
        if (hasYakitori) {
          yakitoriPoints = -game.yakitoriPoints * 1000;
        } else {
          const yakitoriCount = game.scores.reduce((count, score) => {
            const yakitori = score as unknown as { yakitori?: { [key: string]: boolean } };
            if (!yakitori.yakitori) return count;
            return count + Object.values(yakitori.yakitori).filter(Boolean).length;
          }, 0);
          
          if (yakitoriCount > 0) {
            const distributionPerPlayer = (game.yakitoriPoints * 1000 * yakitoriCount) / (4 - yakitoriCount);
            yakitoriPoints = distributionPerPlayer;
          }
        }
      }

      const totalScore = baseScore + yakitoriPoints;

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
      // ウマの計算と追加
      let uma = 0;
      switch (score.rank) {
        case 1: uma = game.uma1 * 1000; break;
        case 2: uma = game.uma2 * 1000; break;
        case 3: uma = game.uma3 * 1000; break;
        case 4: uma = game.uma4 * 1000; break;
      }
      score.totalScore += uma;
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