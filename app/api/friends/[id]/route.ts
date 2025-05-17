import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }
    const friendId = params.id;
    // 双方向のFriendレコードを削除
    await prisma.$transaction([
      prisma.Friend.deleteMany({
        where: {
          OR: [
            { userId: session.user.id, friendId },
            { userId: friendId, friendId: session.user.id },
          ],
        },
      }),
    ]);
    return NextResponse.json({ message: 'フレンドを削除しました' });
  } catch (error) {
    console.error('フレンド削除エラー:', error);
    return NextResponse.json({ error: 'サーバー内部でエラーが発生しました。しばらくしてから再度お試しください。' }, { status: 500 });
  }
} 