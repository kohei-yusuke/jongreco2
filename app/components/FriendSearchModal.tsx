'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

interface FriendSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FriendSearchModal({ isOpen, onClose }: FriendSearchModalProps) {
  const { data: session } = useSession();
  const [searchType, setSearchType] = useState<'id' | 'email'>('id');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<{ id: string; email: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    setSearchResult(null);

    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}&type=${searchType}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ユーザー検索に失敗しました');
      }

      setSearchResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ユーザー検索に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    try {
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ toId: userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'フレンドリクエストの送信に失敗しました');
      }

      alert('フレンドリクエストを送信しました');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'フレンドリクエストの送信に失敗しました');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} tabIndex={-1}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">フレンド検索</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSearch}>
                <div className="mb-3">
                  <div className="btn-group w-100 mb-3">
                    <button
                      type="button"
                      className={`btn ${searchType === 'id' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setSearchType('id')}
                    >
                      IDで検索
                    </button>
                    <button
                      type="button"
                      className={`btn ${searchType === 'email' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setSearchType('email')}
                    >
                      メールアドレスで検索
                    </button>
                  </div>
                  <div className="input-group">
                    <input
                      type={searchType === 'email' ? 'email' : 'text'}
                      className="form-control"
                      placeholder={searchType === 'id' ? 'ユーザーID' : 'メールアドレス'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      required
                    />
                    <button className="btn btn-primary" type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          検索中...
                        </>
                      ) : (
                        '検索'
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              {searchResult && (
                <div className="card">
                  <div className="card-body">
                    <h6 className="card-title">検索結果</h6>
                    <p className="card-text">
                      ID: {searchResult.id}<br />
                      メールアドレス: {searchResult.email}
                    </p>
                    {searchResult.id !== session?.user?.id && (
                      <button
                        className="btn btn-primary"
                        onClick={() => handleSendRequest(searchResult.id)}
                      >
                        フレンドリクエストを送信
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 1040 }}></div>
    </>
  );
}