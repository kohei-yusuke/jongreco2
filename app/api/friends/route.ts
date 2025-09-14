import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/auth.config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }
    // 自分のフレンド一覧を取得
    const friends = await prisma.friend.findMany({
      where: { userId: session.user.id },
      include: {
        friend: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ friends });
  } catch (error) {
    console.error('フレンド一覧取得エラー:', error);
    return NextResponse.json({ error: 'サーバー内部でエラーが発生しました。しばらくしてから再度お試しください。' }, { status: 500 });
  }
} 