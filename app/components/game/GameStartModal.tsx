import { useState, useEffect } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useSession } from 'next-auth/react';
import { Player, PlayerType, Position, Friend, GameStartModalProps } from './types';

const POSITION_LABELS: Record<Position, string> = {
  east: '東家',
  south: '南家',
  west: '西家',
  north: '北家'
};

const POSITION_ORDER: Position[] = ['east', 'south', 'west', 'north'];

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

  useEffect(() => {
    if (isOpen && session?.user) {
      const initialPlayers = [
        {
          id: 'player-1',
          type: 'manual' as PlayerType,
          name: session.user.name || '自分',
          userId: session.user.id,
          position: 'east' as Position,
          isCurrentUser: true
        },
        {
          id: 'player-2',
          type: 'manual' as PlayerType,
          name: '',
          position: 'south' as Position,
          isCurrentUser: false
        },
        {
          id: 'player-3',
          type: 'manual' as PlayerType,
          name: '',
          position: 'west' as Position,
          isCurrentUser: false
        },
        {
          id: 'player-4',
          type: 'manual' as PlayerType,
          name: '',
          position: 'north' as Position,
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
      const data = await response.json();
      if (response.ok) {
        setFriends(data.friends);
      }
    } catch (error) {
      console.error('フレンド取得エラー:', error);
    }
  };

  const handlePlayerTypeChange = (index: number, type: PlayerType) => {
    setPlayers(prevPlayers => {
      const newPlayers = [...prevPlayers];
      newPlayers[index] = {
        ...newPlayers[index],
        type,
        userId: undefined,
        email: undefined
      };
      return newPlayers;
    });
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
  };

  const handleFriendSelect = (index: number, friend: Friend) => {
    setPlayers(prevPlayers => {
      const newPlayers = [...prevPlayers];
      newPlayers[index] = {
        ...newPlayers[index],
        type: 'friend',
        name: friend.friend.name || '名無し',
        userId: friend.friend.id
      };
      return newPlayers;
    });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validPlayers = players.map(player => ({
      name: player.name,
      userId: player.userId,
      position: player.position
    }));
    onStart(validPlayers);
  };

  if (!isOpen || !session?.user || players.length === 0) {
    return null;
  }

  return (
    <Modal show={isOpen} onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>対局を開始</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <div className="position-relative">
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
                          disabled={player.isCurrentUser}
                        >
                          <option value="">フレンドを選択</option>
                          {friends.map((friend) => (
                            <option key={friend.friend.id} value={friend.friend.id}>
                              {friend.friend.name || '名無し'} @{friend.friend.id}
                            </option>
                          ))}
                        </Form.Select>
                      )}

                      {player.type === 'id' && (
                        <Form.Control
                          type="text"
                          placeholder="ユーザーID"
                          value={player.userId || ''}
                          onChange={(e) => handlePlayerChange(index, 'userId', e.target.value)}
                          disabled={player.isCurrentUser}
                        />
                      )}

                      {player.type === 'email' && (
                        <Form.Control
                          type="email"
                          placeholder="メールアドレス"
                          value={player.email || ''}
                          onChange={(e) => handlePlayerChange(index, 'email', e.target.value)}
                          disabled={player.isCurrentUser}
                        />
                      )}

                      {player.type === 'manual' && (
                        <Form.Control
                          type="text"
                          placeholder="プレイヤー名"
                          value={player.name}
                          onChange={(e) => handlePlayerChange(index, 'name', e.target.value)}
                          required
                          disabled={player.isCurrentUser}
                        />
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

          <div className="mt-3">
            <Button
              type="submit"
              variant="primary"
              className="w-100"
              disabled={!players.every(player => player.name)}
            >
              対局を開始
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
} 