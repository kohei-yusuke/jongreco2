'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { format, isValid } from 'date-fns';
import { ja } from 'date-fns/locale';
import FriendSearchModal from '@/app/components/FriendSearchModal';

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [newId, setNewId] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showFriendSearch, setShowFriendSearch] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const validateId = (id: string): string | null => {
    const trimmedId = id.trim();
    
    if (trimmedId === session?.user?.id) {
      return '現在のIDと同じIDは指定できません';
    }

    const idPattern = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!idPattern.test(trimmedId)) {
      return 'IDは3-20文字の英数字、アンダースコア(_)、ハイフン(-)のみ使用可能です';
    }

    return null;
  };

  const handleIdChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChanging(true);
    setError(null);

    const trimmedId = newId.trim();

    // クライアント側のバリデーション
    const validationError = validateId(trimmedId);
    if (validationError) {
      setError(validationError);
      setIsChanging(false);
      return;
    }

    try {
      const response = await fetch('/api/users/change-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newId: trimmedId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'IDの変更に失敗しました');
      }

      // セッションを更新
      await update({
        ...session,
        user: {
          ...session?.user,
          id: trimmedId,
        },
      });

      // ページをリロードして確実にセッションを更新
      router.refresh();
      window.location.reload();

      setNewId('');
      setShowForm(false);
      alert('IDを変更しました');
    } catch (err) {
      console.error('ID変更エラー:', err);
      setError(err instanceof Error ? err.message : 'IDの変更に失敗しました');
    } finally {
      setIsChanging(false);
    }
  };

  const handleIdInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewId(value);
    // 入力中はエラーをクリア
    if (error) {
      setError(null);
    }
  };

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
                  <div className="col-md-8">
                    <div className="d-flex align-items-center">
                      <span className="me-2">{session.user.id}</span>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => setShowForm(!showForm)}
                      >
                        {showForm ? 'キャンセル' : '変更'}
                      </button>
                    </div>
                    {showForm && (
                      <div className="mt-2">
                        <form onSubmit={handleIdChange} className="card card-body bg-light">
                          <div className="mb-3">
                            <label htmlFor="newId" className="form-label">新しいID</label>
                            <input
                              type="text"
                              className={`form-control ${error ? 'is-invalid' : ''}`}
                              id="newId"
                              value={newId}
                              onChange={handleIdInput}
                              required
                              minLength={3}
                              maxLength={20}
                              pattern="[a-zA-Z0-9_-]+"
                              title="英数字、アンダースコア(_)、ハイフン(-)のみ使用可能です"
                            />
                            <div className="form-text">
                              3-20文字の英数字、アンダースコア(_)、ハイフン(-)が使用可能です
                            </div>
                            {error && (
                              <div className="invalid-feedback">
                                {error}
                              </div>
                            )}
                          </div>
                          <div className="d-flex gap-2">
                            <button
                              type="submit"
                              className="btn btn-primary"
                              disabled={isChanging}
                            >
                              {isChanging ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                  変更中...
                                </>
                              ) : (
                                'IDを変更'
                              )}
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              onClick={() => {
                                setShowForm(false);
                                setNewId('');
                                setError(null);
                              }}
                              disabled={isChanging}
                            >
                              キャンセル
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
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
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h3 className="h5 mb-0">フレンド</h3>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowFriendSearch(true)}
                  >
                    フレンドを追加
                  </button>
                </div>
                <FriendSection />
              </div>
            </div>
          </div>
        </div>
      </div>

      <FriendSearchModal
        isOpen={showFriendSearch}
        onClose={() => setShowFriendSearch(false)}
      />
    </div>
  );
}

function FriendSection() {
  const [requests, setRequests] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // フレンドリクエスト一覧取得
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/friends/requests');
      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests);
      } else {
        setError(data.error || 'リクエスト取得に失敗しました');
      }
    } catch (e) {
      setError('リクエスト取得に失敗しました');
    }
    setLoading(false);
  };

  // フレンド一覧取得
  const fetchFriends = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/friends');
      const data = await res.json();
      if (res.ok) {
        setFriends(data.friends);
      } else {
        setError(data.error || 'フレンド取得に失敗しました');
      }
    } catch (e) {
      setError('フレンド取得に失敗しました');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
    fetchFriends();
  }, []);

  // 承認/拒否/削除ハンドラ
  const handleAccept = async (id: string) => {
    await fetch(`/api/friends/requests/${id}/accept`, { method: 'POST' });
    fetchRequests();
    fetchFriends();
  };
  const handleReject = async (id: string) => {
    await fetch(`/api/friends/requests/${id}/reject`, { method: 'POST' });
    fetchRequests();
  };
  const handleDelete = async (id: string) => {
    await fetch(`/api/friends/${id}`, { method: 'DELETE' });
    fetchFriends();
  };

  return (
    <div className="mt-4">
      <h4>フレンドリクエスト</h4>
      {loading ? (
        <div>読み込み中...</div>
      ) : error ? (
        <div className="text-danger">{error}</div>
      ) : (
        <ul className="list-group mb-4">
          {requests.length === 0 && <li className="list-group-item">リクエストはありません</li>}
          {requests.map((req) => (
            <li key={req.id} className="list-group-item d-flex justify-content-between align-items-center">
              <span>
                {req.fromId === req.toId ? null : (
                  req.toId === req.from.id ? (
                    <>
                      <b>{req.from.name || req.from.email}</b> からのリクエスト
                    </>
                  ) : (
                    <>
                      <b>{req.to.name || req.to.email}</b> へ申請中
                    </>
                  )
                )}
                <span className="badge bg-secondary ms-2">{req.status}</span>
              </span>
              {req.toId === req.to.id && req.status === 'pending' ? (
                <span>
                  <button className="btn btn-success btn-sm me-2" onClick={() => handleAccept(req.id)}>承認</button>
                  <button className="btn btn-outline-danger btn-sm" onClick={() => handleReject(req.id)}>拒否</button>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <h4>フレンド一覧</h4>
      {loading ? (
        <div>読み込み中...</div>
      ) : error ? (
        <div className="text-danger">{error}</div>
      ) : (
        <ul className="list-group">
          {friends.length === 0 && <li className="list-group-item">フレンドはいません</li>}
          {friends.map((f) => (
            <li key={f.friend.id} className="list-group-item d-flex justify-content-between align-items-center">
              <span>{f.friend.name || f.friend.email}</span>
              <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(f.friend.id)}>削除</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 