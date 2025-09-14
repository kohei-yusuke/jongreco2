import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/auth.config';
import QRCode from 'qrcode';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // QRコードに含めるデータ（ユーザーID）
    const qrData = session.user.id;

    // QRコードを生成
    const qrCode = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300,
    });

    return NextResponse.json({ qrCode });
  } catch (error) {
    console.error('QRコード生成エラー:', error);
    return NextResponse.json(
      { error: 'QRコードの生成に失敗しました' },
      { status: 500 }
    );
  }
} 