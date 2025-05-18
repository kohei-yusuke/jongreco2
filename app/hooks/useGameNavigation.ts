import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface UseGameNavigationProps {
  gameId: string;
}

export const useGameNavigation = ({ gameId }: UseGameNavigationProps) => {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveAndNavigate = async (destination: string) => {
    try {
      setIsSaving(true);
      const response = await fetch(`/api/games/${gameId}/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'draft' }),
      });

      if (!response.ok) {
        throw new Error('対局履歴の保存に失敗しました');
      }

      // 保存成功後、指定されたページに遷移
      router.push(destination);
    } catch (error) {
      console.error('Error saving game history:', error);
      alert('対局履歴の保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isSaving,
    handleSaveAndNavigate,
  };
}; 