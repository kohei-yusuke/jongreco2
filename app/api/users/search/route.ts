import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type'); // 'id' or 'email'

    if (!query || !type) {
      return NextResponse.json(
        { error: '検索クエリとタイプが必要です' },
        { status: 400 }
      );
    }

    let user;
    if (type === 'id') {
      user = await prisma.user.findUnique({
        where: { id: query },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });
    } else if (type === 'email') {
      user = await prisma.user.findUnique({
        where: { email: query },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error searching user:', error);
    return NextResponse.json(
      { error: 'ユーザー検索に失敗しました' },
      { status: 500 }
    );
  }
} 