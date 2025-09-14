import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/auth.config';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const requestId = params.id;
    const friendRequest = await prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!friendRequest) {
      return NextResponse.json({ error: 'リクエストが見つかりません' }, { status: 404 });
    }

    // 自分が送信したリクエストのみ削除可能
    if (friendRequest.fromId !== session.user.id) {
      return NextResponse.json({ error: '削除権限がありません' }, { status: 403 });
    }

    await prisma.friendRequest.delete({
      where: { id: requestId },
    });

    return NextResponse.json({ message: 'フレンドリクエストを削除しました' });
  } catch (error) {
    console.error('フレンドリクエスト削除エラー:', error);
    return NextResponse.json(
      { error: 'サーバー内部でエラーが発生しました。しばらくしてから再度お試しください。' },
      { status: 500 }
    );
  }
} 