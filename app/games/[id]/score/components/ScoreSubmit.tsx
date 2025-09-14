'use client';

interface ScoreSubmitProps {
  gameId: string;
  round: number;
  onSuccess: () => void;
}

export default function ScoreSubmit({ onSuccess }: ScoreSubmitProps) {
  return (
    <div className="d-grid gap-2">
      <button
        className="btn btn-primary"
        onClick={onSuccess}
      >
        登録
      </button>
    </div>
  );
} 