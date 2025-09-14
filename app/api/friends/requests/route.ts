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

    // 自分宛・自分発のリクエストを取得
    const requests = await prisma.friendRequest.findMany({
      where: {
        OR: [
          { fromId: session.user.id },
          { toId: session.user.id },
        ],
      },
      include: {
        from: { select: { id: true, name: true, email: true } },
        to: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('フレンドリクエスト一覧取得エラー:', error);
    return NextResponse.json({ error: 'サーバー内部でエラーが発生しました。しばらくしてから再度お試しください。' }, { status: 500 });
  }
} 