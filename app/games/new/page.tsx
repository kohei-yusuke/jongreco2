'use client';

import { useState } from 'react';
import GameSetupModal from '../../components/GameSetupModal';

export default function NewGamePage() {
  const [isModalOpen, setIsModalOpen] = useState(true);

  return (
    <div className="container mt-4">
      <h1>新規対局</h1>
      <GameSetupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
} 