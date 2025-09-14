import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/auth.config';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { toId } = await request.json();
    if (!toId) {
      return NextResponse.json({ error: 'ユーザーIDが必要です' }, { status: 400 });
    }

    // 自分自身へのリクエストは禁止
    if (toId === session.user.id) {
      return NextResponse.json({ error: '自分自身にフレンドリクエストを送信することはできません' }, { status: 400 });
    }

    // ユーザーの存在確認
    const targetUser = await prisma.user.findUnique({
      where: { id: toId },
    });

    if (!targetUser) {
      throw new Error('ユーザーが見つかりません');
    }

    // 既存のフレンドリクエストをチェック
    const existingRequest = await prisma.friendRequest.findUnique({
      where: {
        fromId_toId: {
          fromId: session.user.id,
          toId: toId,
        },
      },
    });

    if (existingRequest) {
      throw new Error('既にフレンドリクエストを送信しています');
    }

    // 既存のフレンド関係をチェック
    const existingFriend = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId: session.user.id, friendId: toId },
          { userId: toId, friendId: session.user.id },
        ],
      },
    });

    if (existingFriend) {
      throw new Error('既にフレンド関係が存在します');
    }

    // フレンドリクエストを作成
    const result = await prisma.friendRequest.create({
      data: {
        fromId: session.user.id,
        toId: toId,
      },
    });

    return NextResponse.json({ message: 'フレンドリクエストを送信しました', request: result });
  } catch (error) {
    console.error('フレンドリクエストエラー:', error);
    if (error instanceof Error) {
      // 既知のエラーはそのまま返す
      if (
        error.message.includes('ユーザーが見つかりません') ||
        error.message.includes('既にフレンドリクエストを送信しています') ||
        error.message.includes('既にフレンド関係が存在します') ||
        error.message.includes('自分自身にフレンドリクエストを送信することはできません')
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      // テーブルが存在しない等の内部エラーはユーザーフレンドリーに
      return NextResponse.json(
        { error: 'サーバー内部でエラーが発生しました。しばらくしてから再度お試しください。' },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'サーバー内部でエラーが発生しました。しばらくしてから再度お試しください。' },
      { status: 500 }
    );
  }
} 