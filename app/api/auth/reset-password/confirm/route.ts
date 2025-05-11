import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verify } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { message: '必要な情報が不足しています' },
        { status: 400 }
      );
    }

    // トークンの検証とデコード
    const decoded = verify(token, process.env.NEXTAUTH_SECRET || 'your-secret-key') as {
      userId: string;
      email: string;
    };

    // パスワードのハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);

    // パスワードの更新
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { password: hashedPassword },
    });

    return NextResponse.json(
      { message: 'パスワードの再設定が完了しました' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Password reset confirmation error:', error);
    return NextResponse.json(
      { message: 'パスワードの再設定に失敗しました' },
      { status: 400 }
    );
  }
} 