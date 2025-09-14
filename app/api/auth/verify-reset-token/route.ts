import { NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { message: 'トークンが無効です' },
        { status: 400 }
      );
    }

    // トークンの検証
    verify(token, process.env.NEXTAUTH_SECRET || 'your-secret-key');

    return NextResponse.json(
      { message: 'トークンが有効です' },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { message: 'トークンが無効です' },
      { status: 400 }
    );
  }
}