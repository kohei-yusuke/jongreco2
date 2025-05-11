'use client';

import { useState, useEffect } from 'react';

interface ScoreSummaryProps {
  scores: {
    east: number;
    south: number;
    west: number;
    north: number;
  };
  gameSettings: {
    initialPoints: number;
    returnPoints: number;
    uma1: number;
    uma2: number;
    uma3: number;
    uma4: number;
    yakitoriPoints: number;
    yakitoriEnabled: boolean;
  };
  players: {
    id: string;
    name: string;
    position: string;
  }[];
  onSubmit: (scores: { east: number; south: number; west: number; north: number }) => void;
}

interface PlayerScore {
  id: string;
  name: string;
  position: string;
  rawScore: number;
  yakitori: boolean;
  uma: number;
  totalScore: number;
  rank: number;
}

export default function ScoreSummary({ scores, gameSettings, players, onSubmit }: ScoreSummaryProps) {
  const [yakitori, setYakitori] = useState({
    east: false,
    south: false,
    west: false,
    north: false,
  });

  const [showSettings, setShowSettings] = useState(false);
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>([]);

  // プレイヤーの得点を計算
  const calculateScores = (): PlayerScore[] => {
    const calculatedScores: PlayerScore[] = players.map(player => {
      const rawScore = scores[player.position as keyof typeof scores];
      const yakitoriPoints = yakitori[player.position as keyof typeof yakitori] ? gameSettings.yakitoriPoints * 3 : 0;
      const adjustedScore = (rawScore - gameSettings.returnPoints - yakitoriPoints) / 100;

      return {
        id: player.id,
        name: player.name,
        position: player.position,
        rawScore,
        yakitori: yakitori[player.position as keyof typeof yakitori],
        uma: 0, // 後で計算
        totalScore: adjustedScore,
        rank: 0, // 後で計算
      };
    });

    // 順位付け
    calculatedScores.sort((a: PlayerScore, b: PlayerScore) => b.totalScore - a.totalScore);
    calculatedScores.forEach((score: PlayerScore, index: number) => {
      score.rank = index + 1;
      // ウマの設定
      switch (score.rank) {
        case 1:
          score.uma = gameSettings.uma1;
          break;
        case 2:
          score.uma = gameSettings.uma2;
          break;
        case 3:
          score.uma = gameSettings.uma3;
          break;
        case 4:
          score.uma = gameSettings.uma4;
          break;
      }
    });

    // 1位の得点を再計算
    const firstPlace = calculatedScores.find((score: PlayerScore) => score.rank === 1);
    if (firstPlace) {
      const othersTotal = calculatedScores
        .filter((score: PlayerScore) => score.rank !== 1)
        .reduce((sum: number, score: PlayerScore) => sum + score.totalScore, 0);
      firstPlace.totalScore = -1 * othersTotal;
    }

    return calculatedScores;
  };

  useEffect(() => {
    const newScores = calculateScores();
    setPlayerScores(newScores);
  }, [scores, yakitori, gameSettings]);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="card-title mb-0">入力値集計</h5>
        <button
          type="button"
          className="btn btn-link"
          onClick={() => setShowSettings(!showSettings)}
        >
          設定値
        </button>
      </div>

      {showSettings && (
        <div className="card mb-3">
          <div className="card-body">
            <h6 className="card-subtitle mb-2">ゲーム設定</h6>
            <dl className="row mb-0">
              <dt className="col-sm-4">持ち点</dt>
              <dd className="col-sm-8">{gameSettings.initialPoints.toLocaleString()}</dd>
              <dt className="col-sm-4">返し点</dt>
              <dd className="col-sm-8">{gameSettings.returnPoints.toLocaleString()}</dd>
              <dt className="col-sm-4">ウマ</dt>
              <dd className="col-sm-8">
                1位: {gameSettings.uma1} / 2位: {gameSettings.uma2} / 3位: {gameSettings.uma3} / 4位: {gameSettings.uma4}
              </dd>
              <dt className="col-sm-4">焼き鳥</dt>
              <dd className="col-sm-8">
                {gameSettings.yakitoriEnabled ? `${gameSettings.yakitoriPoints.toLocaleString()}点` : '無効'}
              </dd>
            </dl>
          </div>
        </div>
      )}

      <div className="table-responsive">
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>項目</th>
              {playerScores.map(score => (
                <th key={score.id}>{score.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>素点</th>
              {playerScores.map(score => (
                <td key={score.id}>{score.rawScore !== undefined ? score.rawScore.toLocaleString() : ''}</td>
              ))}
            </tr>
            {gameSettings.yakitoriEnabled && (
              <tr>
                <th>焼き鳥</th>
                {playerScores.map(score => (
                  <td key={score.id}>
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={score.yakitori}
                        onChange={(e) => setYakitori(prev => ({
                          ...prev,
                          [score.position]: e.target.checked,
                        }))}
                      />
                    </div>
                  </td>
                ))}
              </tr>
            )}
            <tr>
              <th>ウマ</th>
              {playerScores.map(score => (
                <td key={score.id}>{score.uma !== undefined ? score.uma : ''}</td>
              ))}
            </tr>
            <tr>
              <th>合計得点</th>
              {playerScores.map(score => (
                <td key={score.id}>{score.totalScore !== undefined ? score.totalScore.toLocaleString() : ''}</td>
              ))}
            </tr>
            <tr>
              <th>順位</th>
              {playerScores.map(score => (
                <td key={score.id}>{score.rank !== undefined ? `${score.rank}位` : ''}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-3">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onSubmit(scores)}
        >
          登録
        </button>
      </div>
    </div>
  );
} 