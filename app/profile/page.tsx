'use client';

import { useSession } from 'next-auth/react';
import { Session } from 'next-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { format, isValid } from 'date-fns';
import { ja } from 'date-fns/locale';
import FriendSearchModal from '@/app/components/FriendSearchModal';
import QRCodeModal from '@/app/components/QRCodeModal';
import QRScanner from '@/app/components/QRScanner';

interface Friend {
  id: string;
  friend: {
    id: string;
    name: string;
    email: string;
  };
}

interface FriendRequest {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  fromId: string;
  toId: string;
  from: {
    id: string;
    name: string;
    email: string;
  };
  to: {
    id: string;
    name: string;
    email: string;
  };
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [newId, setNewId] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showFriendSearch, setShowFriendSearch] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [isChangingNickname, setIsChangingNickname] = useState(false);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [showNicknameForm, setShowNicknameForm] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [iconError, setIconError] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);

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

  const handleNicknameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingNickname(true);
    setNicknameError(null);

    try {
      const response = await fetch('/api/users/nickname', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nickname: newNickname }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'ニックネームの更新に失敗しました');
      }

      // セッションを更新
      await update({
        ...session,
        user: {
          ...session?.user,
          name: newNickname,
        },
      });

      setShowNicknameForm(false);
      setNewNickname('');
      
      // ページをリロードして確実にセッションを更新
      router.refresh();
    } catch (error) {
      setNicknameError(error instanceof Error ? error.message : 'ニックネームの更新に失敗しました');
    } finally {
      setIsChangingNickname(false);
    }
  };

  const handleIconUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!iconFile) return;

    setIsUploadingIcon(true);
    setIconError(null);

    try {
      const formData = new FormData();
      formData.append('icon', iconFile);

      const response = await fetch('/api/users/icon', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'アイコンのアップロードに失敗しました');
      }

      // セッションを更新
      await update({
        ...session,
        user: {
          ...session?.user,
          iconPath: data.iconPath,
        },
      });

      setIconFile(null);
      router.refresh();
    } catch (error) {
      setIconError(error instanceof Error ? error.message : 'アイコンのアップロードに失敗しました');
    } finally {
      setIsUploadingIcon(false);
    }
  };

  const handleQRScan = async (userId: string) => {
    try {
      const response = await fetch('/api/friends/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ toId: userId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'フレンドリクエストの送信に失敗しました');
      }

      alert('フレンドリクエストを送信しました');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'フレンドリクエストの送信に失敗しました');
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
                <div className="row mb-4">
                  <div className="col-md-4 fw-bold">アイコン</div>
                  <div className="col-md-8">
                    <div className="d-flex align-items-center">
                      <div className="me-3">
                        <img
                          src={session.user.iconPath || '/icons/default-icon.png'}
                          alt="プロフィールアイコン"
                          className="rounded-circle"
                          style={{ width: '64px', height: '64px', objectFit: 'cover' }}
                        />
                      </div>
                      <div>
                        <form onSubmit={handleIconUpload} className="d-flex align-items-center">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setIconFile(e.target.files?.[0] || null)}
                            className="form-control form-control-sm me-2"
                            style={{ maxWidth: '200px' }}
                          />
                          <button
                            type="submit"
                            className="btn btn-primary btn-sm"
                            disabled={!iconFile || isUploadingIcon}
                          >
                            {isUploadingIcon ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                アップロード中...
                              </>
                            ) : (
                              'アップロード'
                            )}
                          </button>
                        </form>
                        {iconError && (
                          <div className="text-danger mt-2">{iconError}</div>
                        )}
                        <div className="form-text mt-1">
                          2MB以下の画像ファイル（JPG、PNG、GIF）をアップロードできます
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="row mb-2">
                  <div className="col-md-4 fw-bold">ニックネーム</div>
                  <div className="col-md-8">
                    <div className="d-flex align-items-center">
                      <span className="me-2">{session.user.name || '未設定'}</span>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => setShowNicknameForm(!showNicknameForm)}
                      >
                        {showNicknameForm ? 'キャンセル' : '変更'}
                      </button>
                    </div>
                    {showNicknameForm && (
                      <div className="mt-2">
                        <form onSubmit={handleNicknameChange}>
                          <div className="mb-2">
                            <input
                              type="text"
                              className="form-control"
                              value={newNickname}
                              onChange={(e) => setNewNickname(e.target.value)}
                              placeholder="新しいニックネーム"
                              maxLength={20}
                            />
                          </div>
                          {nicknameError && (
                            <div className="text-danger mb-2">{nicknameError}</div>
                          )}
                          <div className="d-flex gap-2">
                            <button
                              type="submit"
                              className="btn btn-primary"
                              disabled={isChangingNickname}
                            >
                              {isChangingNickname ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                  変更中...
                                </>
                              ) : (
                                'ニックネームを変更'
                              )}
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              onClick={() => {
                                setShowNicknameForm(false);
                                setNewNickname('');
                                setNicknameError(null);
                              }}
                              disabled={isChangingNickname}
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
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => setShowQRCode(true)}
                    >
                      QRコードを表示
                    </button>
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => setShowQRScanner(true)}
                    >
                      QRコードをスキャン
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => setShowFriendSearch(true)}
                    >
                      フレンドを追加
                    </button>
                  </div>
                </div>
                <FriendSection session={session} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <FriendSearchModal
        isOpen={showFriendSearch}
        onClose={() => setShowFriendSearch(false)}
      />
      <QRCodeModal
        isOpen={showQRCode}
        onClose={() => setShowQRCode(false)}
      />
      <QRScanner
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={handleQRScan}
      />
    </div>
  );
}

function FriendSection({ session }: { session: Session }) {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
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
    } catch {
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
    } catch {
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

  const handleCancelRequest = async (id: string) => {
    await fetch(`/api/friends/requests/${id}`, { method: 'DELETE' });
    fetchRequests();
  };

  // 受信リクエストと送信済みリクエストを分離
  const receivedRequests = requests.filter(req => req.toId === session?.user?.id);
  const sentRequests = requests.filter(req => req.fromId === session?.user?.id);

  return (
    <div className="mt-4">
      <h4>受信したフレンドリクエスト</h4>
      {loading ? (
        <div>読み込み中...</div>
      ) : error ? (
        <div className="text-danger">{error}</div>
      ) : (
        <ul className="list-group mb-4">
          {receivedRequests.length === 0 && <li className="list-group-item">受信したリクエストはありません</li>}
          {receivedRequests.map((req) => (
            <li key={req.id} className="list-group-item d-flex justify-content-between align-items-center">
              <span>
                <b>{req.from.name || '名無し'}</b>
                <span className="text-muted ms-1">@{req.from.id}</span> からのリクエスト
                <span className="badge bg-secondary ms-2">{req.status}</span>
              </span>
              {req.status === 'pending' && (
                <span>
                  <button className="btn btn-success btn-sm me-2" onClick={() => handleAccept(req.id)}>承認</button>
                  <button className="btn btn-outline-danger btn-sm" onClick={() => handleReject(req.id)}>拒否</button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <h4>送信済みフレンドリクエスト</h4>
      {loading ? (
        <div>読み込み中...</div>
      ) : error ? (
        <div className="text-danger">{error}</div>
      ) : (
        <ul className="list-group mb-4">
          {sentRequests.length === 0 && <li className="list-group-item">送信済みのリクエストはありません</li>}
          {sentRequests.map((req) => (
            <li key={req.id} className="list-group-item d-flex justify-content-between align-items-center">
              <span>
                <b>{req.to.name || '名無し'}</b>
                <span className="text-muted ms-1">@{req.to.id}</span> へ申請中
                <span className="badge bg-secondary ms-2">{req.status}</span>
              </span>
              {req.status === 'pending' && (
                <button className="btn btn-outline-danger btn-sm" onClick={() => handleCancelRequest(req.id)}>
                  取下
                </button>
              )}
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
          {friends.map((friend) => (
            <li key={friend.id} className="list-group-item d-flex justify-content-between align-items-center">
              <span>
                <b>{friend.friend.name || '名無し'}</b>
                <span className="text-muted ms-1">@{friend.friend.id}</span>
              </span>
              <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(friend.friend.id)}>
                削除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}