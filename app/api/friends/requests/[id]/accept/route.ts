import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

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
      return NextResponse.json({ error: '承認権限がありません' }, { status: 403 });
    }
    // 既に承認済みなら何もしない
    if (friendRequest.status === 'accepted') {
      return NextResponse.json({ message: '既に承認済みです' });
    }
    // トランザクションでフレンド登録＋リクエスト削除
    await prisma.$transaction([
      prisma.friend.create({
        data: {
          userId: friendRequest.fromId,
          friendId: friendRequest.toId,
        },
      }),
      prisma.friend.create({
        data: {
          userId: friendRequest.toId,
          friendId: friendRequest.fromId,
        },
      }),
      prisma.friendRequest.delete({
        where: { id: requestId },
      }),
    ]);
    return NextResponse.json({ message: 'フレンドリクエストを承認しました' });
  } catch (error) {
    console.error('フレンドリクエスト承認エラー:', error);
    return NextResponse.json({ error: 'サーバー内部でエラーが発生しました。しばらくしてから再度お試しください。' }, { status: 500 });
  }
} 