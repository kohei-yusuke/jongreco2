import { useState, useEffect } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Image from 'next/image';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QRCodeModal({ isOpen, onClose }: QRCodeModalProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchQRCode();
    }
  }, [isOpen]);

  const fetchQRCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/users/qr');
      const data = await response.json();
      if (response.ok) {
        setQrCode(data.qrCode);
      } else {
        setError(data.error || 'QRコードの取得に失敗しました');
      }
    } catch (error) {
      setError('QRコードの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={isOpen} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>フレンド追加用QRコード</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        {loading ? (
          <div className="d-flex justify-content-center">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">読み込み中...</span>
            </div>
          </div>
        ) : error ? (
          <div className="text-danger">{error}</div>
        ) : qrCode ? (
          <div>
            <Image
              src={qrCode}
              alt="フレンド追加用QRコード"
              width={300}
              height={300}
              className="img-fluid"
            />
            <p className="mt-3 text-muted">
              このQRコードをフレンドに読み取ってもらうと、自動的にフレンドリクエストが送信されます
            </p>
          </div>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          閉じる
        </Button>
      </Modal.Footer>
    </Modal>
  );
} 