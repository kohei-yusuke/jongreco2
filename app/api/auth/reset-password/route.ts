import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sign } from 'jsonwebtoken';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

// メール送信用のトランスポーター設定
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    // ユーザーの存在確認
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // セキュリティのため、ユーザーが存在しない場合でも成功レスポンスを返す
      return NextResponse.json(
        { message: 'パスワードリセット用のメールを送信しました' },
        { status: 200 }
      );
    }

    // リセットトークンの生成
    const resetToken = sign(
      { userId: user.id, email: user.email },
      process.env.NEXTAUTH_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    // リセットURLの生成
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/confirm?token=${resetToken}`;

    // メールの送信
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'パスワードリセットのご案内',
      html: `
        <p>パスワードリセットのリクエストを受け付けました。</p>
        <p>以下のリンクをクリックして、パスワードの再設定を行ってください：</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>このリンクは1時間後に無効になります。</p>
        <p>このリクエストに心当たりがない場合は、このメールを無視してください。</p>
      `,
    });

    return NextResponse.json(
      { message: 'パスワードリセット用のメールを送信しました' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { message: 'パスワードリセット処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 