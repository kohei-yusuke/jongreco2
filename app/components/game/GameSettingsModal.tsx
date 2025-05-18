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
  gameId: string;
  initialSettings: GameSettings;
}

const DEFAULT_SETTINGS: GameSettings = {
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
};

export default function GameSettingsModal({ isOpen, onClose, gameId, initialSettings }: GameSettingsModalProps) {
  const [settings, setSettings] = useState<GameSettings>(initialSettings);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/games/${gameId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('設定の更新に失敗しました');
      }

      onClose();
    } catch (error) {
      console.error('Error updating settings:', error);
      alert('設定の更新に失敗しました');
    }
  };

  const handleChange = (field: keyof GameSettings, value: number | boolean | 'distribution' | 'winner_takes_all') => {
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
            <h5>基本設定</h5>
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
                      対局終了時の基準点です。一般的には30,000点に設定し、差額分がトップ賞となります。例えば、配給原点25,000点、返し点30,000点の場合、トップ賞は20,000点となります。
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
          </div>

          <div className="mb-4">
            <h5>ウマ設定</h5>
            <div className="row">
              <div className="col-6">
                <Form.Group className="mb-3">
                  <Form.Label>
                    1位
                    <OverlayTrigger
                      placement="right"
                      overlay={
                        <Tooltip>
                          1位のプレイヤーが他のプレイヤーから受け取る点数です。一般的には+20点に設定します。例えば、1位が+20点の場合、他のプレイヤーから5点ずつ受け取ります。
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
                    value={settings.uma1}
                    onChange={(e) => handleChange('uma1', parseInt(e.target.value))}
                    step={1}
                  />
                </Form.Group>
              </div>
              <div className="col-6">
                <Form.Group className="mb-3">
                  <Form.Label>
                    2位
                    <OverlayTrigger
                      placement="right"
                      overlay={
                        <Tooltip>
                          2位のプレイヤーが他のプレイヤーから受け取る点数です。一般的には+10点に設定します。例えば、2位が+10点の場合、3位と4位から5点ずつ受け取ります。
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
                    value={settings.uma2}
                    onChange={(e) => handleChange('uma2', parseInt(e.target.value))}
                    step={1}
                  />
                </Form.Group>
              </div>
              <div className="col-6">
                <Form.Group className="mb-3">
                  <Form.Label>
                    3位
                    <OverlayTrigger
                      placement="right"
                      overlay={
                        <Tooltip>
                          3位のプレイヤーが他のプレイヤーに支払う点数です。一般的には-10点に設定します。例えば、3位が-10点の場合、1位と2位に5点ずつ支払います。
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
                    value={settings.uma3}
                    onChange={(e) => handleChange('uma3', parseInt(e.target.value))}
                    step={1}
                  />
                </Form.Group>
              </div>
              <div className="col-6">
                <Form.Group className="mb-3">
                  <Form.Label>
                    4位
                    <OverlayTrigger
                      placement="right"
                      overlay={
                        <Tooltip>
                          4位のプレイヤーが他のプレイヤーに支払う点数です。一般的には-20点に設定します。例えば、4位が-20点の場合、1位に10点、2位に10点支払います。
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
                    value={settings.uma4}
                    onChange={(e) => handleChange('uma4', parseInt(e.target.value))}
                    step={1}
                  />
                </Form.Group>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h5>機能設定</h5>
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
                          チップ機能を有効にすると、各局でチップを設定できます。チップは局の点数に加算され、和了者に支払われます。一般的には100点単位で設定します。
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
                <Form.Control
                  type="number"
                  value={settings.chipPoints}
                  onChange={(e) => handleChange('chipPoints', parseInt(e.target.value))}
                  min={0}
                  step={100}
                  className="mt-2"
                  placeholder="チップの点数を入力"
                />
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
                          1対局で1回も上がれなかった人に対する罰則です。分配モードの場合、設定した点数を焼き鳥以外の各プレーヤーに支払います。総どりモードの場合、1位にのみ設定した点数が支払われます。
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
                    <option value="distribution">分配モード（焼き鳥以外で分配）</option>
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