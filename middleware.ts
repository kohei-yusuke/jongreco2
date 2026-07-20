import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';

// 認証が不要なパス
const publicPaths = [
  '/',
  '/calc',            // 登録不要の点数計算ツール
  '/login',
  '/register',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/reset-password',
  '/api/auth/[...nextauth]',  // NextAuth.jsのルートを追加
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Set headers for API routes to force dynamic behavior
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    response.headers.set('x-middleware-cache', 'no-cache');
    return response;
  }

  // パブリックパスの場合は認証チェックをスキップ
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // APIルートの場合は認証チェックをスキップ（APIルート内で個別に認証を実装）
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // トークンの取得
  const token = request.cookies.get('token')?.value;

  if (!token) {
    // トークンが存在しない場合はログインページにリダイレクト
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  try {
    // トークンの検証
    verify(token, process.env.NEXTAUTH_SECRET || 'your-secret-key');
    return NextResponse.next();
  } catch (error) {
    // トークンが無効な場合はログインページにリダイレクト
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }
}

// ミドルウェアを適用するパスの設定
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}; 