'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface GameSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface User {
  id: string;
  email: string;
  name: string | null;
}

interface Player {
  id?: string;
  name: string;
  position: 'east' | 'south' | 'west' | 'north';
  searchType: 'name' | 'id' | 'email';
}

export default function GameSetupModal({ isOpen, onClose }: GameSetupModalProps) {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([
    { name: '', position: 'east', searchType: 'name' },
    { name: '', position: 'south', searchType: 'name' },
    { name: '', position: 'west', searchType: 'name' },
    { name: '', position: 'north', searchType: 'name' },
  ]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number | null>(null);

  const handlePlayerChange = (index: number, value: string) => {
    const newPlayers = [...players];
    newPlayers[index].name = value;
    setPlayers(newPlayers);
  };

  const handleSearchTypeChange = (index: number, type: 'name' | 'id' | 'email') => {
    const newPlayers = [...players];
    newPlayers[index].searchType = type;
    setPlayers(newPlayers);
  };

  const handleSearch = async (index: number) => {
    if (!players[index].name) return;

    setSearching(true);
    setSearchError(null);
    setCurrentPlayerIndex(index);

    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(players[index].name)}&type=${players[index].searchType}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ユーザー検索に失敗しました');
      }

      const user: User = data;
      const newPlayers = [...players];
      newPlayers[index] = {
        id: user.id,
        name: user.name || user.email.split('@')[0],
        position: players[index].position,
        searchType: players[index].searchType,
      };
      setPlayers(newPlayers);
    } catch (error) {
      console.error('Error searching user:', error);
      setSearchError(error instanceof Error ? error.message : 'ユーザー検索に失敗しました');
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          players: {
            east: { id: players[0].id, name: players[0].name },
            south: { id: players[1].id, name: players[1].name },
            west: { id: players[2].id, name: players[2].name },
            north: { id: players[3].id, name: players[3].name }
          },
          settings: {
            initialPoints: 25000,
            returnPoints: 30000,
            uma1: 20,
            uma2: 10,
            uma3: -10,
            uma4: -20,
            chipPoints: 1000,
            chipEnabled: true,
            yakitoriPoints: 2000,
            yakitoriEnabled: true,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `対局の作成に失敗しました: ${response.status}`);
      }

      const game = await response.json();
      router.push(`/games/${game.id}/score`);
    } catch (error) {
      console.error('Error creating game:', error);
      alert(error instanceof Error ? error.message : '対局の作成に失敗しました');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-backdrop show" style={{ zIndex: 1040 }}></div>
      <div
        className="modal d-block"
        tabIndex={-1}
        style={{ zIndex: 1050 }}
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">新規対局作成</h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
              ></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  {players.map((player, index) => (
                    <div key={player.position} className="mb-3">
                      <label className="form-label">
                        {player.position === 'east' ? '東' :
                         player.position === 'south' ? '南' :
                         player.position === 'west' ? '西' : '北'}
                      </label>
                      <div className="btn-group mb-2">
                        <button
                          type="button"
                          className={`btn btn-sm ${player.searchType === 'name' ? 'btn-primary' : 'btn-outline-primary'}`}
                          onClick={() => handleSearchTypeChange(index, 'name')}
                        >
                          名前
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${player.searchType === 'id' ? 'btn-primary' : 'btn-outline-primary'}`}
                          onClick={() => handleSearchTypeChange(index, 'id')}
                        >
                          ID
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${player.searchType === 'email' ? 'btn-primary' : 'btn-outline-primary'}`}
                          onClick={() => handleSearchTypeChange(index, 'email')}
                        >
                          メール
                        </button>
                      </div>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={player.name}
                          onChange={(e) => handlePlayerChange(index, e.target.value)}
                          placeholder={player.searchType === 'name' ? 'プレイヤー名' :
                                     player.searchType === 'id' ? 'ユーザーID' : 'メールアドレス'}
                        />
                        {player.searchType !== 'name' && (
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => handleSearch(index)}
                            disabled={searching && currentPlayerIndex === index}
                          >
                            {searching && currentPlayerIndex === index ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                検索中...
                              </>
                            ) : (
                              '検索'
                            )}
                          </button>
                        )}
                      </div>
                      {searchError && currentPlayerIndex === index && (
                        <div className="text-danger mt-1">{searchError}</div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onClose}
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={players.some(p => !p.name)}
                  >
                    対局開始
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 