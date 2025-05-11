'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface GameSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GameSetupModal({ isOpen, onClose }: GameSetupModalProps) {
  const router = useRouter();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [players, setPlayers] = useState({
    east: '',
    south: '',
    west: '',
    north: '',
  });

  const [settings, setSettings] = useState({
    initialPoints: 25000,
    returnPoints: 30000,
    uma1: 20,
    uma2: 10,
    uma3: -10,
    uma4: -20,
    chipPoints: 0,
    chipEnabled: false,
    yakitoriPoints: 0,
    yakitoriEnabled: false,
  });

  const handlePlayerChange = (position: string, value: string) => {
    console.log(`Updating player ${position}:`, value);
    setPlayers(prev => {
      const newPlayers = {
        ...prev,
        [position]: value,
      };
      console.log('New players state:', newPlayers);
      return newPlayers;
    });
  };

  const handleSettingChange = (key: string, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      console.log('Current players state:', players);

      // プレイヤー名のバリデーション
      const emptyPlayers = Object.entries(players).filter(([_, name]) => {
        console.log('Checking player name:', name);
        return !name || name.trim() === '';
      });

      console.log('Empty players:', emptyPlayers);

      if (emptyPlayers.length > 0) {
        const positions = emptyPlayers.map(([position]) => {
          switch (position) {
            case 'east': return '東家';
            case 'south': return '南家';
            case 'west': return '西家';
            case 'north': return '北家';
            default: return position;
          }
        });
        throw new Error(`${positions.join('、')}のプレイヤー名を入力してください`);
      }

      // プレイヤーデータを配列形式に変換
      const playersArray = Object.entries(players).map(([position, name]) => {
        const trimmedName = name.trim();
        console.log(`Converting player ${position}:`, { position, name, trimmedName });
        return {
          id: `${position}-${trimmedName}`,
          position,
          name: trimmedName,
        };
      });

      console.log('Converted players array:', playersArray);

      const response = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          players: {
            east: players.east.trim(),
            south: players.south.trim(),
            west: players.west.trim(),
            north: players.north.trim(),
          },
          settings: {
            initialPoints: settings.initialPoints,
            returnPoints: settings.returnPoints,
            uma1: settings.uma1,
            uma2: settings.uma2,
            uma3: settings.uma3,
            uma4: settings.uma4,
            chipPoints: settings.chipPoints,
            chipEnabled: settings.chipEnabled,
            yakitoriPoints: settings.yakitoriPoints,
            yakitoriEnabled: settings.yakitoriEnabled,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to create game');
      }

      const game = await response.json();
      console.log('Game created:', game);

      onClose();
      const gameData = JSON.stringify({
        id: game.id,
        players: playersArray,
        settings: {
          uma: {
            first: settings.uma1,
            second: settings.uma2,
            third: settings.uma3,
            fourth: settings.uma4,
          },
          yakitori: settings.yakitoriPoints,
          initialPoints: settings.initialPoints,
          returnPoints: settings.returnPoints,
        },
      });

      console.log('Navigating to:', `/games/${game.id}/score?gameData=${encodeURIComponent(gameData)}`);
      router.push(`/games/${game.id}/score?gameData=${encodeURIComponent(gameData)}`);
    } catch (error) {
      console.error('Error creating game:', error);
      alert(error instanceof Error ? error.message : '対局の作成に失敗しました。もう一度お試しください。');
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
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">対局設定</h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              {/* プレイヤー設定 */}
              <div className="mb-4">
                <h6>プレイヤー設定</h6>
                <div className="row">
                  <div className="col-md-3 mb-3">
                    <label className="form-label">東家</label>
                    <input
                      type="text"
                      className="form-control"
                      value={players.east}
                      onChange={(e) => handlePlayerChange('east', e.target.value)}
                      placeholder="プレイヤー名"
                      required
                    />
                  </div>
                  <div className="col-md-3 mb-3">
                    <label className="form-label">南家</label>
                    <input
                      type="text"
                      className="form-control"
                      value={players.south}
                      onChange={(e) => handlePlayerChange('south', e.target.value)}
                      placeholder="プレイヤー名"
                      required
                    />
                  </div>
                  <div className="col-md-3 mb-3">
                    <label className="form-label">西家</label>
                    <input
                      type="text"
                      className="form-control"
                      value={players.west}
                      onChange={(e) => handlePlayerChange('west', e.target.value)}
                      placeholder="プレイヤー名"
                      required
                    />
                  </div>
                  <div className="col-md-3 mb-3">
                    <label className="form-label">北家</label>
                    <input
                      type="text"
                      className="form-control"
                      value={players.north}
                      onChange={(e) => handlePlayerChange('north', e.target.value)}
                      placeholder="プレイヤー名"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 基本設定 */}
              <div className="mb-4">
                <h6>基本設定</h6>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">配給原点</label>
                    <input
                      type="number"
                      className="form-control"
                      value={settings.initialPoints}
                      onChange={(e) => handleSettingChange('initialPoints', parseInt(e.target.value))}
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">返し点</label>
                    <input
                      type="number"
                      className="form-control"
                      value={settings.returnPoints}
                      onChange={(e) => handleSettingChange('returnPoints', parseInt(e.target.value))}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* ウマ設定 */}
              <div className="mb-4">
                <h6>ウマ設定</h6>
                <div className="row">
                  <div className="col-md-3 mb-3">
                    <label className="form-label">1位</label>
                    <input
                      type="number"
                      className="form-control"
                      value={settings.uma1}
                      onChange={(e) => handleSettingChange('uma1', parseInt(e.target.value))}
                      required
                    />
                  </div>
                  <div className="col-md-3 mb-3">
                    <label className="form-label">2位</label>
                    <input
                      type="number"
                      className="form-control"
                      value={settings.uma2}
                      onChange={(e) => handleSettingChange('uma2', parseInt(e.target.value))}
                      required
                    />
                  </div>
                  <div className="col-md-3 mb-3">
                    <label className="form-label">3位</label>
                    <input
                      type="number"
                      className="form-control"
                      value={settings.uma3}
                      onChange={(e) => handleSettingChange('uma3', parseInt(e.target.value))}
                      required
                    />
                  </div>
                  <div className="col-md-3 mb-3">
                    <label className="form-label">4位</label>
                    <input
                      type="number"
                      className="form-control"
                      value={settings.uma4}
                      onChange={(e) => handleSettingChange('uma4', parseInt(e.target.value))}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 詳細設定 */}
              <div className="mb-4">
                <button
                  type="button"
                  className="btn btn-link p-0 mb-3"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? '▽ 詳細設定を隠す' : '▽ 詳細設定を表示'}
                </button>

                {showAdvanced && (
                  <div className="card">
                    <div className="card-body">
                      {/* チップ設定 */}
                      <div className="mb-4">
                        <h6>チップ設定</h6>
                        <div className="row">
                          <div className="col-md-6 mb-3">
                            <div className="form-check">
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={settings.chipEnabled}
                                onChange={(e) => handleSettingChange('chipEnabled', e.target.checked)}
                              />
                              <label className="form-check-label">チップを使用する</label>
                            </div>
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label">チップ1枚の点数</label>
                            <input
                              type="number"
                              className="form-control"
                              value={settings.chipPoints}
                              onChange={(e) => handleSettingChange('chipPoints', parseInt(e.target.value))}
                              disabled={!settings.chipEnabled}
                            />
                          </div>
                        </div>
                      </div>

                      {/* 焼き鳥設定 */}
                      <div className="mb-4">
                        <h6>焼き鳥設定</h6>
                        <div className="row">
                          <div className="col-md-6 mb-3">
                            <div className="form-check">
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={settings.yakitoriEnabled}
                                onChange={(e) => handleSettingChange('yakitoriEnabled', e.target.checked)}
                              />
                              <label className="form-check-label">焼き鳥を使用する</label>
                            </div>
                          </div>
                          <div className="col-md-6 mb-3">
                            <label className="form-label">焼き鳥の点数</label>
                            <input
                              type="number"
                              className="form-control"
                              value={settings.yakitoriPoints}
                              onChange={(e) => handleSettingChange('yakitoriPoints', parseInt(e.target.value))}
                              disabled={!settings.yakitoriEnabled}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
              >
                対局開始
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 