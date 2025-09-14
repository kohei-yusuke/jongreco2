import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/auth.config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { newId } = await request.json();
    if (!newId) {
      return NextResponse.json({ error: '新しいIDが必要です' }, { status: 400 });
    }

    // 現在のIDと同じ場合はエラー
    if (newId === session.user.id) {
      return NextResponse.json({ error: '現在のIDと同じIDは指定できません' }, { status: 400 });
    }

    // IDの形式チェック
    const idPattern = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!idPattern.test(newId)) {
      return NextResponse.json({ 
        error: 'IDは3-20文字の英数字、アンダースコア(_)、ハイフン(-)のみ使用可能です' 
      }, { status: 400 });
    }

    try {
      // トランザクション内でIDの更新を実行
      const updatedUser = await prisma.$transaction(async (tx) => {
        // IDの重複チェック
        const existingUser = await tx.user.findUnique({
          where: { id: newId },
        });

        if (existingUser) {
          throw new Error('このIDは既に使用されています');
        }

        // メールアドレスでユーザーを検索
        const currentUser = await tx.user.findUnique({
          where: { email: session.user.email },
        });

        if (!currentUser) {
          throw new Error('ユーザー情報の取得に失敗しました');
        }

        // IDの更新
        return await tx.user.update({
          where: { email: session.user.email },
          data: { id: newId },
        });
      });

      return NextResponse.json({ message: 'IDを更新しました', user: updatedUser });
    } catch (error) {
      console.error('データベース操作エラー:', error);
      if (error instanceof Error) {
        return NextResponse.json({ 
          error: error.message 
        }, { status: 400 });
      }
      return NextResponse.json({ 
        error: 'データベース操作に失敗しました' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('ID変更エラー:', error);
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: 'IDの変更に失敗しました: ' + error.message 
      }, { status: 500 });
    }
    return NextResponse.json({ 
      error: 'IDの変更に失敗しました' 
    }, { status: 500 });
  }
} 