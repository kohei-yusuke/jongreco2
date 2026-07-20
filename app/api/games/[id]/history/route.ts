import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  SEATS,
  calcSessionTotals,
  round1,
  type Seat,
  type ScoreSettings,
  type YakitoriMode,
  type SeatRecord,
} from '@/lib/score';

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

    // ゲームとプレイヤー情報を取得（焼き鳥情報も含む）
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        players: true,
        scores: { include: { yakitori: true } },
      },
    });

    if (!game) {
      return NextResponse.json(
        { error: 'ゲームが見つかりません' },
        { status: 404 }
      );
    }

    // 精算設定を lib/score の形へ
    const settings: ScoreSettings = {
      initialPoints: game.initialPoints,
      returnPoints: game.returnPoints,
      uma: [game.uma1, game.uma2, game.uma3, game.uma4],
      yakitoriPoints: game.yakitoriPoints,
      yakitoriEnabled: game.yakitoriEnabled,
      yakitoriMode: (game.yakitoriMode === 'winner_takes_all' ? 'winner_takes_all' : 'distribution') as YakitoriMode,
      chipPoints: game.chipPoints,
    };

    // 全半荘を lib/score で精算（ウマ・オカ・返し点・焼き鳥を反映）
    const rows = game.scores.map((s) => ({
      raw: { east: s.east, south: s.south, west: s.west, north: s.north } as SeatRecord<number>,
      yakitori: s.yakitori
        ? { east: s.yakitori.east, south: s.yakitori.south, west: s.yakitori.west, north: s.yakitori.north }
        : undefined,
    }));
    const { totals, ranks } = calcSessionTotals(rows, settings);

    // 席→プレイヤーへ割り当て。totalScore は「千点単位×10（＝0.1点刻み）」の整数で保存。
    const sortedScores = game.players
      .map((player) => {
        const seat = player.position.toLowerCase() as Seat;
        const seatKnown = SEATS.includes(seat);
        return {
          playerId: player.id,
          name: player.name,
          totalScore: seatKnown ? Math.round(round1(totals[seat]) * 10) : 0,
          rank: seatKnown ? ranks[seat] : 0,
        };
      })
      .sort((a, b) => a.rank - b.rank);

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