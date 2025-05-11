import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // トークンを含むクッキーを削除
    cookies().delete('token');

    return NextResponse.json(
      { message: 'ログアウトしました' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'ログアウト処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 