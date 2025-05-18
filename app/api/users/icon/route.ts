import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('icon') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'アイコンファイルが必要です' }, { status: 400 });
    }

    // ファイルタイプの検証
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: '画像ファイルのみアップロード可能です' }, { status: 400 });
    }

    // ファイルサイズの検証（2MB以下）
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'ファイルサイズは2MB以下にしてください' }, { status: 400 });
    }

    // ファイル名を生成（ユーザーID + 拡張子）
    const fileExtension = file.name.split('.').pop();
    const fileName = `${session.user.id}.${fileExtension}`;
    const uploadDir = join(process.cwd(), 'public', 'icons');

    // アップロードディレクトリが存在しない場合は作成
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filePath = join(uploadDir, fileName);

    // ファイルを保存
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // アイコンパスをデータベースに保存
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        iconPath: `/icons/${fileName}`
      },
      select: {
        id: true,
        email: true,
        name: true,
        iconPath: true,
        createdAt: true
      }
    });

    return NextResponse.json({ 
      message: 'アイコンを更新しました',
      iconPath: updatedUser.iconPath
    });
  } catch (error) {
    console.error('アイコンアップロードエラー:', error);
    return NextResponse.json(
      { error: 'サーバー内部でエラーが発生しました。しばらくしてから再度お試しください。' },
      { status: 500 }
    );
  }
} 