import { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import { GameSettings } from './types';

interface GameSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (settings: GameSettings) => void;
  initialSettings: GameSettings;
}


export default function GameSettingsModal({ isOpen, onClose, onStart, initialSettings }: GameSettingsModalProps) {
  const [settings, setSettings] = useState<GameSettings>(initialSettings);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // ウマ合計が0でないとゼロサムが崩れる（一般ルール）
      const umaTotal = settings.uma1 + settings.uma2 + settings.uma3 + settings.uma4;
      if (umaTotal !== 0) {
        const proceed = confirm(
          `ウマの合計が ${umaTotal > 0 ? '+' : ''}${umaTotal} で、0ではありません。\n` +
          `合計得点がゼロサムになりません。このまま開始しますか？`,
        );
        if (!proceed) return;
      }
      onStart(settings);
      onClose();
    } catch (error) {
      console.error('Error updating settings:', error);
      alert(error instanceof Error ? error.message : '設定の更新に失敗しました');
    }
  };

  const handleChange = (field: keyof GameSettings, value: number | boolean | 'distribution' | 'winner_takes_all') => {
    // 焼き鳥は点数単位（100の倍数）でのみ受け付ける。
    // ※ かつて「3で割り切れること」を要求していたが、分配先の人数は
    //   1〜3人で可変なので不正な制約だった（削除）。
    if (field === 'yakitoriPoints' && typeof value === 'number') {
      if (value % 100 !== 0) {
        alert('焼き鳥の点数は100の倍数で入力してください');
        return;
      }
    }

    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Modal show={isOpen} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>対局設定</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <div className="mb-4">
            <Form.Group className="mb-3">
              <Form.Label>
                配給原点
                <OverlayTrigger
                  placement="right"
                  overlay={
                    <Tooltip>
                      対局開始時の各プレイヤーの持ち点です。一般的には25,000点から開始します。
                    </Tooltip>
                  }
                >
                  <span className="ms-2" style={{ 
                    cursor: 'help',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#e0e0e0',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>?</span>
                </OverlayTrigger>
              </Form.Label>
              <Form.Control
                type="number"
                value={settings.initialPoints}
                onChange={(e) => handleChange('initialPoints', parseInt(e.target.value))}
                min={1000}
                step={1000}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>
                返し点
                <OverlayTrigger
                  placement="right"
                  overlay={
                    <Tooltip>
                      対局終了時の基準点です。一般的には30,000点に設定し、差額分がトップ賞となります。
                    </Tooltip>
                  }
                >
                  <span className="ms-2" style={{ 
                    cursor: 'help',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#e0e0e0',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>?</span>
                </OverlayTrigger>
              </Form.Label>
              <Form.Control
                type="number"
                value={settings.returnPoints}
                onChange={(e) => handleChange('returnPoints', parseInt(e.target.value))}
                min={1000}
                step={1000}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>
                ウマ
                <OverlayTrigger
                  placement="right"
                  overlay={
                    <Tooltip>
                      各順位のウマを設定します。一般的には1位+20、2位+10、3位-10、4位-20に設定します。
                    </Tooltip>
                  }
                >
                  <span className="ms-2" style={{ 
                    cursor: 'help',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#e0e0e0',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>?</span>
                </OverlayTrigger>
              </Form.Label>
              <div className="row g-2">
                <div className="col">
                  <Form.Label className="small text-muted">1位</Form.Label>
                  <Form.Control
                    type="number"
                    value={settings.uma1}
                    onChange={(e) => handleChange('uma1', parseInt(e.target.value))}
                  />
                </div>
                <div className="col">
                  <Form.Label className="small text-muted">2位</Form.Label>
                  <Form.Control
                    type="number"
                    value={settings.uma2}
                    onChange={(e) => handleChange('uma2', parseInt(e.target.value))}
                  />
                </div>
                <div className="col">
                  <Form.Label className="small text-muted">3位</Form.Label>
                  <Form.Control
                    type="number"
                    value={settings.uma3}
                    onChange={(e) => handleChange('uma3', parseInt(e.target.value))}
                  />
                </div>
                <div className="col">
                  <Form.Label className="small text-muted">4位</Form.Label>
                  <Form.Control
                    type="number"
                    value={settings.uma4}
                    onChange={(e) => handleChange('uma4', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="chip-enabled"
                label={
                  <span>
                    チップ機能
                    <OverlayTrigger
                      placement="right"
                      overlay={
                        <Tooltip>
                          チップ機能を有効にすると、各局でチップを設定できます。チップは局の点数に加算され、和了者に支払われます。
                        </Tooltip>
                      }
                    >
                      <span className="ms-2" style={{ 
                        cursor: 'help',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#e0e0e0',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>?</span>
                    </OverlayTrigger>
                  </span>
                }
                checked={settings.chipEnabled}
                onChange={(e) => handleChange('chipEnabled', e.target.checked)}
              />
              {settings.chipEnabled && (
                <>
                  <Form.Label className="small text-muted">1枚当たりの点数</Form.Label>
                  <Form.Control
                    type="number"
                    value={settings.chipPoints}
                    onChange={(e) => handleChange('chipPoints', parseInt(e.target.value))}
                    min={0}
                    step={100}
                    className="mt-2"
                    placeholder="チップの点数を入力"
                  />
                </>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="yakitori-enabled"
                label={
                  <span>
                    焼き鳥機能
                    <OverlayTrigger
                      placement="right"
                      overlay={
                        <Tooltip>
                          焼き鳥機能を有効にすると、各局で焼き鳥を設定できます。焼き鳥は局の点数に加算され、設定したプレイヤーに支払われます。
                        </Tooltip>
                      }
                    >
                      <span className="ms-2" style={{ 
                        cursor: 'help',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#e0e0e0',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>?</span>
                    </OverlayTrigger>
                  </span>
                }
                checked={settings.yakitoriEnabled}
                onChange={(e) => handleChange('yakitoriEnabled', e.target.checked)}
              />
              {settings.yakitoriEnabled && (
                <>
                  <Form.Label className="small text-muted">焼き鳥の人が支払う点数</Form.Label>
                  <Form.Control
                    type="number"
                    value={settings.yakitoriPoints}
                    onChange={(e) => handleChange('yakitoriPoints', parseInt(e.target.value))}
                    min={0}
                    step={100}
                    className="mt-2"
                    placeholder="焼き鳥の点数を入力"
                  />
                  <Form.Select
                    className="mt-2"
                    value={settings.yakitoriMode}
                    onChange={(e) => handleChange('yakitoriMode', e.target.value as 'distribution' | 'winner_takes_all')}
                  >
                    <option value="distribution">分配モード（焼き鳥以外の全員に支払う）</option>
                    <option value="winner_takes_all">総どりモード（1位が総取り）</option>
                  </Form.Select>
                </>
              )}
            </Form.Group>
          </div>

          <div className="text-end">
            <Button variant="secondary" onClick={onClose} className="me-2">
              キャンセル
            </Button>
            <Button variant="primary" type="submit">
              対局を開始
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
} 