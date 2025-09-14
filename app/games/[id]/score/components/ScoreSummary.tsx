'use client';

import { useState, useEffect, useCallback } from 'react';

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

  const calculateScores = useCallback((): PlayerScore[] => {
    const calculatedScores: PlayerScore[] = players.map(player => ({
      id: player.id,
      name: player.name,
      position: player.position,
      rawScore: scores[player.position as keyof typeof scores],
      yakitori: yakitori[player.position as keyof typeof yakitori],
      uma: 0,
      totalScore: 0,
      rank: 0,
    }));

    // 素点で順位付け
    calculatedScores.sort((a, b) => b.rawScore - a.rawScore);
    calculatedScores.forEach((score, index) => {
      score.rank = index + 1;
    });

    // 各プレイヤーの得点を計算
    calculatedScores.forEach(score => {
      if (score.rank === 1) {
        // 1位の場合は2-4位の合計のマイナスを取る
        const othersTotal = calculatedScores
          .filter(s => s.rank > 1)
          .reduce((sum, s) => {
            // 2-4位の点数計算
            const adjustedPoints = s.rawScore - gameSettings.returnPoints;
            const yakitoriAdj = s.yakitori ? -gameSettings.yakitoriPoints : 0;
            let uma = 0;
            if (s.rank === 2) uma = gameSettings.uma2;
            else if (s.rank === 3) uma = gameSettings.uma3;
            else if (s.rank === 4) uma = gameSettings.uma4;
            const total = (adjustedPoints + yakitoriAdj) / 1000 + uma;
            return sum + total;
          }, 0);
        score.totalScore = -othersTotal;
        score.uma = gameSettings.uma1;
      } else {
        // 2-4位の計算
        const adjustedPoints = score.rawScore - gameSettings.returnPoints;
        const yakitoriAdj = score.yakitori ? -gameSettings.yakitoriPoints : 0;
        let uma = 0;
        if (score.rank === 2) uma = gameSettings.uma2;
        else if (score.rank === 3) uma = gameSettings.uma3;
        else if (score.rank === 4) uma = gameSettings.uma4;
        score.uma = uma;
        score.totalScore = (adjustedPoints + yakitoriAdj) / 1000 + uma;
      }
    });

    return calculatedScores;
  }, [scores, yakitori, gameSettings, players]);

  useEffect(() => {
    const newScores = calculateScores();
    setPlayerScores(newScores);
  }, [scores, yakitori, gameSettings, calculateScores]);

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