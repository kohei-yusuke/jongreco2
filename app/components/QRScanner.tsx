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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const newScanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 5,
          qrbox: { width: 250, height: 250 },
          videoConstraints: {
            facingMode: "environment"
          }
        },
        false // verbose flag
      );

      newScanner.render((decodedText) => {
        console.log('QRコード読み取り成功:', decodedText);
        try {
          // QRコードから読み取ったユーザーIDを処理
          onScan(decodedText);
          if (scanner) {
            scanner.clear();
          }
          onClose();
        } catch (err) {
          console.error('QRコード処理エラー:', err);
          setError('QRコードの処理中にエラーが発生しました');
        }
      }, (errorMessage) => {
        console.error('QRコードスキャンエラー:', errorMessage);
      });

      setScanner(newScanner);
    }

    return () => {
      if (scanner) {
        scanner.clear();
      }
    };
  }, [isOpen, onClose, onScan, scanner]);

  const handleClose = () => {
    if (scanner) {
      scanner.clear();
    }
    setError(null);
    onClose();
  };

  return (
    <Modal show={isOpen} onHide={handleClose} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>QRコードをスキャン</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
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