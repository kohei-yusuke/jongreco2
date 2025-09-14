import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/auth.config';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }
    const requestId = params.id;
    // リクエスト取得
    const friendRequest = await prisma.friendRequest.findUnique({
      where: { id: requestId },
    });
    if (!friendRequest) {
      return NextResponse.json({ error: 'リクエストが見つかりません' }, { status: 404 });
    }
    // 自分宛でなければ拒否
    if (friendRequest.toId !== session.user.id) {
      return NextResponse.json({ error: '拒否権限がありません' }, { status: 403 });
    }
    // 既に拒否済みなら何もしない
    if (friendRequest.status === 'rejected') {
      return NextResponse.json({ message: '既に拒否済みです' });
    }
    // リクエストを削除
    await prisma.friendRequest.delete({
      where: { id: requestId },
    });
    return NextResponse.json({ message: 'フレンドリクエストを拒否しました' });
  } catch (error) {
    console.error('フレンドリクエスト拒否エラー:', error);
    return NextResponse.json({ error: 'サーバー内部でエラーが発生しました。しばらくしてから再度お試しください。' }, { status: 500 });
  }
} 