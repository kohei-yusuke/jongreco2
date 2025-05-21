import { useState, useEffect } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import { useSession } from 'next-auth/react';
import { Player, PlayerType, Position, Friend, GameStartModalProps, GameSettings } from './types';
import GameSettingsModal from './GameSettingsModal';

const POSITION_LABELS: Record<Position, string> = {
  east: '東家',
  south: '南家',
  west: '西家',
  north: '北家'
};

const POSITION_ORDER: Position[] = ['east', 'south', 'west', 'north'];

// バリデーション用の正規表現
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// バリデーション関数
const validatePlayer = (player: Player, allPlayers: Player[]): string[] => {
  const errors: string[] = [];

  // 入力値がない場合はバリデーションをスキップ
  if (!player.name && !player.userId && !player.email) {
    return errors;
  }

  // 名前のバリデーション
  if (!player.name) {
    errors.push('プレイヤー名を入力してください');
  } else if (player.name.length < 1 || player.name.length > 20) {
    errors.push('プレイヤー名は1文字以上20文字以下で入力してください');
  }

  // 名前の重複チェック（登録済みユーザーは除外）
  const duplicateName = allPlayers.filter(p => 
    p.name === player.name && 
    (!p.userId || p.userId !== player.userId)
  ).length > 1;
  if (duplicateName) {
    errors.push('同じ名前のプレイヤーが存在します');
  }

  // メールアドレスのバリデーション
  if (player.email) {
    if (!EMAIL_REGEX.test(player.email)) {
      errors.push('メールアドレスの形式が正しくありません');
    }
    // メールアドレスの重複チェック（登録済みユーザーは除外）
    const duplicateEmail = allPlayers.filter(p => 
      p.email === player.email && 
      (!p.userId || p.userId !== player.userId)
    ).length > 1;
    if (duplicateEmail) {
      errors.push('同じメールアドレスのプレイヤーが存在します');
    }
  }

  // ユーザーIDの重複チェック
  if (player.userId) {
    const duplicateUserId = allPlayers.filter(p => 
      p.userId === player.userId && 
      p.id !== player.id
    ).length > 0;
    if (duplicateUserId) {
      errors.push('同じユーザーIDのプレイヤーが存在します');
    }
  }

  return errors;
};

function PositionSwapButton({ 
  onClick, 
  direction
}: { 
  onClick: () => void;
  direction: 'horizontal' | 'vertical' | 'diagonal';
}) {
  const getArrow = () => {
    switch (direction) {
      case 'horizontal':
        return '⇔';
      case 'vertical':
        return '⇕';
      case 'diagonal':
        return '⇖';
      default:
        return '⇔';
    }
  };

  return (
    <Button
      variant="outline-secondary"
      className="position-swap-btn rounded-circle"
      onClick={onClick}
      style={{
        width: '40px',
        height: '40px',
        padding: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.2rem',
        border: '2px solid #dee2e6',
        backgroundColor: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}
    >
      {getArrow()}
    </Button>
  );
}

export default function GameStartModal({ isOpen, onClose, onStart }: GameStartModalProps) {
  const { data: session } = useSession();
  const [players, setPlayers] = useState<Player[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [validPlayers, setValidPlayers] = useState<Player[]>([]);
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    initialPoints: 25000,
    returnPoints: 30000,
    chipPoints: 0,
    yakitoriPoints: 2000,
    uma1: 20,
    uma2: 10,
    uma3: -10,
    uma4: -20,
    chipEnabled: false,
    yakitoriEnabled: false,
    yakitoriMode: 'distribution'
  });

  useEffect(() => {
    if (isOpen && session?.user) {
      const initialPlayers = [
        {
          id: 'player-1',
          type: 'manual' as const,
          name: session.user.name || '自分',
          userId: session.user.id,
          position: 'east' as const,
          isCurrentUser: true
        },
        {
          id: 'player-2',
          type: 'manual' as const,
          name: '',
          position: 'south' as const,
          isCurrentUser: false
        },
        {
          id: 'player-3',
          type: 'manual' as const,
          name: '',
          position: 'west' as const,
          isCurrentUser: false
        },
        {
          id: 'player-4',
          type: 'manual' as const,
          name: '',
          position: 'north' as const,
          isCurrentUser: false
        }
      ];
      setPlayers(initialPlayers);
      fetchFriends();
    }
  }, [isOpen, session]);

  const fetchFriends = async () => {
    try {
      const response = await fetch('/api/friends');
      if (!response.ok) {
        throw new Error('フレンドの取得に失敗しました');
      }
      const data = await response.json();
      setFriends(data || []); // データがnullの場合は空配列を設定
    } catch (error) {
      console.error('Error fetching friends:', error);
      setFriends([]); // エラー時も空配列を設定
    }
  };

  const handlePlayerTypeChange = (index: number, type: PlayerType) => {
    setPlayers(prevPlayers => {
      const newPlayers = [...prevPlayers];
      newPlayers[index] = {
        ...newPlayers[index],
        type,
        name: '', // 入力値をクリア
        userId: undefined,
        email: undefined
      };
      return newPlayers;
    });

    // 入力値をクリアした後、エラーもクリア
    setErrors(prev => ({
      ...prev,
      [players[index].id]: []
    }));
  };

  const handlePlayerChange = (index: number, field: keyof Player, value: string) => {
    setPlayers(prevPlayers => {
      const newPlayers = [...prevPlayers];
      newPlayers[index] = {
        ...newPlayers[index],
        [field]: value
      };
      return newPlayers;
    });

    // メールアドレスが入力された場合、ユーザー検索を実行
    if (field === 'email' && value) {
      searchUserByEmail(value, index);
    }
  };

  const handlePlayerBlur = (index: number) => {
    const player = players[index];
    
    // 入力値がない場合はエラーをクリア
    if (!player.name && !player.userId && !player.email) {
      setErrors(prev => ({
        ...prev,
        [player.id]: []
      }));
      return;
    }

    // バリデーション実行
    const playerErrors = validatePlayer(player, players);
    setErrors(prev => ({
      ...prev,
      [player.id]: playerErrors
    }));
  };

  const searchUserByEmail = async (email: string, index: number) => {
    try {
      const response = await fetch(`/api/users/search?email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (response.ok && data.user) {
        // ユーザーが見つかった場合、プレイヤー情報を更新
        setPlayers(prevPlayers => {
          const newPlayers = [...prevPlayers];
          newPlayers[index] = {
            ...newPlayers[index],
            name: data.user.name || '名無し',
            userId: data.user.id,
            email: data.user.email
          };
          return newPlayers;
        });

        // 更新後のプレイヤー情報でバリデーションを再実行
        const updatedPlayers = [...players];
        updatedPlayers[index] = {
          ...updatedPlayers[index],
          name: data.user.name || '名無し',
          userId: data.user.id,
          email: data.user.email
        };
        const playerErrors = validatePlayer(updatedPlayers[index], updatedPlayers);
        setErrors(prev => ({
          ...prev,
          [updatedPlayers[index].id]: playerErrors
        }));
      } else {
        // ユーザーが見つからなかった場合、エラーを設定
        setErrors(prev => ({
          ...prev,
          [players[index].id]: ['ユーザーが見つかりません']
        }));
      }
    } catch (error) {
      console.error('ユーザー検索エラー:', error);
      setErrors(prev => ({
        ...prev,
        [players[index].id]: ['ユーザー検索に失敗しました']
      }));
    }
  };

  const handleFriendSelect = (index: number, friend: Friend) => {
    setPlayers(prevPlayers => {
      const newPlayers = [...prevPlayers];
      newPlayers[index] = {
        ...newPlayers[index],
        type: 'friend' as const,
        name: friend.friend.name || '名無し',
        userId: friend.friend.id
      };
      return newPlayers;
    });

    // フレンド選択後もバリデーションを実行
    handlePlayerBlur(index);
  };

  const swapPositions = (index1: number, index2: number) => {
    setPlayers(prevPlayers => {
      const newPlayers = [...prevPlayers];
      const temp = newPlayers[index1];
      newPlayers[index1] = newPlayers[index2];
      newPlayers[index2] = temp;

      return newPlayers.map((player, index) => ({
        ...player,
        position: POSITION_ORDER[index]
      }));
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      // プレイヤー情報の検証
      const validPlayers = players.filter(p => {
        // 手動入力の場合
        if (p.type === 'manual') {
          return p.name.trim() !== '';
        }
        // フレンド選択の場合
        if (p.type === 'friend') {
          return p.userId !== undefined;
        }
        // ユーザーIDの場合
        if (p.type === 'id') {
          return p.userId !== undefined && p.userId.trim() !== '';
        }
        // メールアドレスの場合
        if (p.type === 'email') {
          return p.email !== undefined && p.email.trim() !== '';
        }
        return false;
      });

      console.log('検証前のプレイヤー情報:', players);
      console.log('検証後のプレイヤー情報:', validPlayers);

      if (validPlayers.length !== 4) {
        throw new Error('プレイヤーは4人必要です。全てのプレイヤー情報を入力してください。');
      }

      // プレイヤー情報を保存
      setValidPlayers(validPlayers);
      console.log('保存されたプレイヤー情報:', validPlayers);

      // 設定モーダルを表示
      setShowSettings(true);
    } catch (error) {
      console.error('プレイヤー検証エラー:', error);
      setErrors({
        global: [error instanceof Error ? error.message : 'プレイヤー情報の検証に失敗しました']
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsSubmit = (settings: GameSettings) => {
    console.log('設定モーダルからのデータ:', { players: validPlayers, settings });
    if (validPlayers.length !== 4) {
      setErrors({
        global: ['プレイヤーは4人必要です']
      });
      setShowSettings(false);
      return;
    }
    // モーダルを閉じてから対局を開始
    onClose(); // 親モーダルを閉じる
    onStart(validPlayers, settings);
  };

  if (!isOpen || !session?.user || players.length === 0) {
    return null;
  }

  return (
    <>
      <Modal 
        show={isOpen && !showSettings} 
        onHide={onClose} 
        size="lg"
        backdrop="static"
        keyboard={false}
      >
        <Modal.Header closeButton>
          <Modal.Title>対局を開始</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form onSubmit={handleSubmit}>
            <div className="position-relative">
              {errors.global && (
                <Alert variant="danger" className="mb-3">
                  {errors.global.map((error, index) => (
                    <div key={index}>{error}</div>
                  ))}
                </Alert>
              )}
              <div className="row g-3">
                {players.map((player, index) => (
                  <div key={player.id} className="col-6">
                    <div className="card h-100">
                      <div className="card-body">
                        <h5 className="card-title mb-3">{POSITION_LABELS[player.position]}</h5>
                        <Form.Select
                          className="mb-2"
                          value={player.type}
                          onChange={(e) => handlePlayerTypeChange(index, e.target.value as PlayerType)}
                          disabled={player.isCurrentUser}
                        >
                          <option value="manual">手動入力</option>
                          <option value="friend">フレンドから選択</option>
                          <option value="id">ユーザーIDで指定</option>
                          <option value="email">メールアドレスで指定</option>
                        </Form.Select>

                        {player.type === 'friend' && (
                          <Form.Select
                            value={player.userId || ''}
                            onChange={(e) => {
                              const friend = friends.find(f => f.friend.id === e.target.value);
                              if (friend) handleFriendSelect(index, friend);
                            }}
                            onBlur={() => handlePlayerBlur(index)}
                            disabled={player.isCurrentUser}
                            isInvalid={!!errors[player.id]?.length}
                          >
                            <option value="">フレンドを選択</option>
                            {friends.length > 0 ? (
                              friends.map((friend) => (
                                <option key={friend.friend.id} value={friend.friend.id}>
                                  {friend.friend.name || '名無し'} @{friend.friend.id}
                                </option>
                              ))
                            ) : (
                              <option value="" disabled>フレンドが登録されていません</option>
                            )}
                          </Form.Select>
                        )}

                        {player.type === 'id' && (
                          <Form.Control
                            type="text"
                            placeholder="ユーザーID"
                            value={player.userId || ''}
                            onChange={(e) => handlePlayerChange(index, 'userId', e.target.value)}
                            onBlur={() => handlePlayerBlur(index)}
                            disabled={player.isCurrentUser}
                            isInvalid={!!errors[player.id]?.length}
                          />
                        )}

                        {player.type === 'email' && (
                          <Form.Control
                            type="email"
                            placeholder="メールアドレス"
                            value={player.email || ''}
                            onChange={(e) => handlePlayerChange(index, 'email', e.target.value)}
                            onBlur={() => handlePlayerBlur(index)}
                            disabled={player.isCurrentUser}
                            isInvalid={!!errors[player.id]?.length}
                          />
                        )}

                        {player.type === 'manual' && (
                          <Form.Control
                            type="text"
                            placeholder="プレイヤー名"
                            value={player.name}
                            onChange={(e) => handlePlayerChange(index, 'name', e.target.value)}
                            onBlur={() => handlePlayerBlur(index)}
                            disabled={player.isCurrentUser}
                            isInvalid={!!errors[player.id]?.length}
                          />
                        )}

                        {errors[player.id]?.length > 0 && (
                          <Alert variant="danger" className="mt-2">
                            {errors[player.id].map((error, i) => (
                              <div key={i}>{error}</div>
                            ))}
                          </Alert>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 位置変更ボタン */}
              <div className="position-absolute" style={{ 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)',
                width: '100%',
                height: '100%',
                pointerEvents: 'none'
              }}>
                <div className="d-flex flex-column align-items-center justify-content-center h-100">
                  <div className="d-flex align-items-center gap-4 mb-4">
                    <div style={{ pointerEvents: 'auto' }}>
                      <PositionSwapButton
                        direction="horizontal"
                        onClick={() => swapPositions(0, 1)} // 東と南を入れ替え
                      />
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-4">
                    <div style={{ pointerEvents: 'auto' }}>
                      <PositionSwapButton
                        direction="vertical"
                        onClick={() => swapPositions(0, 2)} // 東と西を入れ替え
                      />
                    </div>
                    <div style={{ pointerEvents: 'auto' }}>
                      <PositionSwapButton
                        direction="vertical"
                        onClick={() => swapPositions(1, 3)} // 南と北を入れ替え
                      />
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-4 mt-4">
                    <div style={{ pointerEvents: 'auto' }}>
                      <PositionSwapButton
                        direction="horizontal"
                        onClick={() => swapPositions(2, 3)} // 西と北を入れ替え
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 text-end">
              <Button variant="secondary" onClick={onClose} className="me-2">
                キャンセル
              </Button>
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? '開始中...' : '設定に進む'}
              </Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>

      <GameSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onStart={handleSettingsSubmit}
        initialSettings={gameSettings}
      />
    </>
  );
} 