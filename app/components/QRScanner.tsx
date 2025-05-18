import { useState, useEffect } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (userId: string) => void;
}

export default function QRScanner({ isOpen, onClose, onScan }: QRScannerProps) {
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isOpen) {
      const newScanner = new Html5QrcodeScanner('qr-reader', {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      });

      newScanner.render((decodedText) => {
        // QRコードから読み取ったユーザーIDを処理
        onScan(decodedText);
        newScanner.clear();
        onClose();
      }, (error) => {
        // エラーは無視（継続的にスキャンするため）
      });

      setScanner(newScanner);
    }

    return () => {
      if (scanner) {
        scanner.clear();
      }
    };
  }, [isOpen]);

  return (
    <Modal show={isOpen} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>QRコードをスキャン</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div id="qr-reader" className="w-100"></div>
        <p className="mt-3 text-muted text-center">
          フレンドのQRコードをカメラで読み取ってください
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          キャンセル
        </Button>
      </Modal.Footer>
    </Modal>
  );
} 