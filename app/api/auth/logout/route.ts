import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json(
      { message: 'ログアウトしました' },
      { status: 200 }
    );
    response.headers.set('Set-Cookie', 'token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');
    return response;
  } catch {
    return NextResponse.json(
      { message: 'ログアウト処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}