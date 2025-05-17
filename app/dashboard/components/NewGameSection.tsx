import { useState } from 'react';
import GameSetupModal from '../../components/GameSetupModal';

export default function NewGameSection() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="card mb-4">
      <div className="card-body">
        <h2 className="card-title h4 mb-4">新規対局</h2>
        <p className="card-text mb-4">
          新しい対局を開始して、スコアを記録しましょう。
        </p>
        <button
          className="btn btn-primary"
          onClick={() => setIsModalOpen(true)}
        >
          新規対局作成
        </button>
      </div>

      <GameSetupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
} 