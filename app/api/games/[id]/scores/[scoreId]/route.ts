import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function DELETE(
  request: Request,
  context: { params: { id: string; scoreId: string } }
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
    const scoreId = context.params.scoreId;

    // 削除対象のスコアを取得
    const scoreToDelete = await prisma.score.findUnique({
      where: { id: scoreId },
      select: { round: true }
    });

    if (!scoreToDelete) {
      return NextResponse.json(
        { error: 'スコアが見つかりません' },
        { status: 404 }
      );
    }

    // トランザクションで削除と局数の更新を行う
    await prisma.$transaction(async (tx) => {
      // スコアを削除
      await tx.score.delete({
        where: { id: scoreId }
      });

      // 削除したスコアより後の局数のスコアを更新
      await tx.score.updateMany({
        where: {
          gameId,
          round: { gt: scoreToDelete.round }
        },
        data: {
          round: { decrement: 1 }
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting score:', error);
    return NextResponse.json(
      { error: 'スコアの削除に失敗しました' },
      { status: 500 }
    );
  }
} 