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
        game: {
          include: {
            scores: {
              include: {
                yakitori: true
              }
            }
          }
        },
        players: {
          orderBy: {
            rank: 'asc',
          },
          include: {
            player: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 各対局の得点を再計算
    const processedHistories = histories.map(history => {
      const scores = history.game.scores;
      const settings = {
        uma: {
          first: history.game.uma1 || 10,
          second: history.game.uma2 || 5,
          third: history.game.uma3 || -5,
          fourth: history.game.uma4 || -10
        },
        yakitori: history.game.yakitoriPoints || 0,
        yakitoriEnabled: history.game.yakitoriEnabled
      };

      // 各プレイヤーの基本点を計算
      const playerScores = history.players.map(player => {
        const position = player.player.position.toLowerCase();
        const basePoints = scores.reduce((total, score) => {
          return total + score[position as 'east' | 'south' | 'west' | 'north'];
        }, 0);

        // 焼き鳥の計算
        let yakitoriPoints = 0;
        if (settings.yakitoriEnabled) {
          const hasYakitori = scores.some(score => 
            score.yakitori && score.yakitori[position as 'east' | 'south' | 'west' | 'north']
          );
          if (hasYakitori) {
            yakitoriPoints = -settings.yakitori * 1000;
          } else {
            const yakitoriPlayersCount = scores.reduce((count, score) => {
              if (!score.yakitori) return count;
              return count + Object.values(score.yakitori).filter(Boolean).length;
            }, 0);
            if (yakitoriPlayersCount > 0) {
              const distributionPerPlayer = (settings.yakitori * 1000 * yakitoriPlayersCount) / (4 - yakitoriPlayersCount);
              yakitoriPoints = distributionPerPlayer;
            }
          }
        }

        // ウマの計算
        const uma = {
          1: settings.uma.first,
          2: settings.uma.second,
          3: settings.uma.third,
          4: settings.uma.fourth
        }[player.rank] * 1000 || 0;

        const totalScore = basePoints + uma + yakitoriPoints;

        return {
          ...player,
          totalScore
        };
      });

      return {
        ...history,
        players: playerScores
      };
    });

    return NextResponse.json(processedHistories);
  } catch (error) {
    console.error('Error fetching game histories:', error);
    return NextResponse.json(
      { error: '対局履歴の取得に失敗しました' },
      { status: 500 }
    );
  }
} 