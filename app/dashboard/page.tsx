'use client';

import { useState } from 'react';
import GameSetupModal from '../components/GameSetupModal';

export default function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="container mt-4">
      <h1>ダッシュボード</h1>
      <div className="mb-4">
        <button
          className="btn btn-primary"
          onClick={() => setIsModalOpen(true)}
        >
          新規対局作成
        </button>
      </div>
      <div>
        <h2>過去の対局</h2>
        <p>（今後ここに対局履歴が表示されます）</p>
      </div>

      <GameSetupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
} 