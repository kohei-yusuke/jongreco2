import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth.config';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

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

    console.log('Deleting score:', { gameId, scoreId });

    // 削除対象のスコアを取得
    const scoreToDelete = await prisma.score.findUnique({
      where: { id: scoreId },
      select: { 
        id: true,
        round: true,
        gameId: true,
        yakitori: true
      }
    });

    if (!scoreToDelete) {
      console.log('Score not found:', scoreId);
      return NextResponse.json(
        { error: 'スコアが見つかりません' },
        { status: 404 }
      );
    }

    console.log('Found score to delete:', scoreToDelete);

    try {
      // トランザクションで削除と局数の更新を行う
      await prisma.$transaction(async (tx) => {
        // 関連するYakitoriレコードを先に削除
        if (scoreToDelete.yakitori) {
          await tx.yakitori.delete({
            where: { scoreId }
          });
          console.log('Yakitori record deleted');
        }

        // スコアを削除
        await tx.score.delete({
          where: { id: scoreId }
        });
        console.log('Score deleted successfully');

        // 削除したスコアより後の局数のスコアを更新
        const updatedScores = await tx.score.updateMany({
          where: {
            gameId,
            round: { gt: scoreToDelete.round }
          },
          data: {
            round: { decrement: 1 }
          }
        });
        console.log('Updated subsequent scores:', updatedScores);
      });

      return NextResponse.json({ success: true });
    } catch (txError) {
      console.error('Transaction error:', txError);
      if (txError instanceof Prisma.PrismaClientKnownRequestError) {
        console.error('Prisma error code:', txError.code);
        console.error('Prisma error message:', txError.message);
      }
      throw txError;
    }
  } catch (error) {
    console.error('Error deleting score:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma error details:', {
        code: error.code,
        message: error.message,
        meta: error.meta
      });
      return NextResponse.json(
        { 
          error: 'スコアの削除に失敗しました',
          details: `データベースエラー: ${error.message}`
        },
        { status: 500 }
      );
    }
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return NextResponse.json(
      { 
        error: 'スコアの削除に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 