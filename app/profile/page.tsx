'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { format, isValid } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card">
              <div className="card-body text-center">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">読み込み中...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (!isValid(date)) {
      return '日付情報なし';
    }
    return format(date, 'yyyy年MM月dd日 HH:mm', { locale: ja });
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card">
            <div className="card-body">
              <h2 className="card-title mb-4">プロフィール</h2>
              
              <div className="mb-4">
                <h3 className="h5 mb-3">基本情報</h3>
                <div className="row mb-2">
                  <div className="col-md-4 fw-bold">ユーザーID</div>
                  <div className="col-md-8">{session.user.id}</div>
                </div>
                <div className="row mb-2">
                  <div className="col-md-4 fw-bold">メールアドレス</div>
                  <div className="col-md-8">{session.user.email}</div>
                </div>
                <div className="row mb-2">
                  <div className="col-md-4 fw-bold">登録日時</div>
                  <div className="col-md-8">
                    {formatDate(session.user.createdAt)}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="h5 mb-3">フレンド</h3>
                <div className="alert alert-info">
                  フレンド機能は現在開発中です。近日公開予定です。
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 