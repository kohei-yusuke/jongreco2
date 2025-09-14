'use client';

import { useState, useEffect, useCallback } from 'react';

interface Score {
  id: string;
  round: number;
  east: number;
  south: number;
  west: number;
  north: number;
  yakitori?: {
    east: boolean;
    south: boolean;
    west: boolean;
    north: boolean;
  };
}


interface ScoreHistoryProps {
  gameId: string;
  onScoreUpdate?: () => void;
  chipEnabled?: boolean;
  chipPoints?: number;
}

export default function ScoreHistory({ gameId, onScoreUpdate, chipEnabled, chipPoints }: ScoreHistoryProps) {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmScore, setDeleteConfirmScore] = useState<Score | null>(null);
  const [gameSettings, setGameSettings] = useState<{
    uma: {
      first: number;
      second: number;
      third: number;
      fourth: number;
    };
    yakitori: number;
    returnPoints: number;
  } | null>(null);
  const [chipInputs, setChipInputs] = useState<Record<string, { value: string; isPositive: boolean }>>({
    east: { value: '', isPositive: true },
    south: { value: '', isPositive: true },
    west: { value: '', isPositive: true },
    north: { value: '', isPositive: true }
  });

  const fetchGameSettings = useCallback(async () => {
    try {
      const response = await fetch(`/api/games/${gameId}`);
      if (!response.ok) {
        throw new Error('ゲーム設定の取得に失敗しました');
      }
      const data = await response.json();
      setGameSettings({
        uma: {
          first: data.uma1 || 10,
          second: data.uma2 || 5,
          third: data.uma3 || -5,
          fourth: data.uma4 || -10
        },
        yakitori: data.yakitoriPoints || 6000,
        returnPoints: data.returnPoints || 30000
      });
    } catch (error) {
      console.error('Error fetching game settings:', error);
    }
  }, [gameId]);

  const fetchScores = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/games/${gameId}/scores`);
      if (!response.ok) {
        throw new Error('スコアデータの取得に失敗しました');
      }
      const data = await response.json();
      setScores(data.scores || []);
    } catch (error) {
      console.error('Error fetching scores:', error);
      setError(error instanceof Error ? error.message : 'スコアデータの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchGameSettings();
    fetchScores();
  }, [gameId, fetchGameSettings, fetchScores]);

  // スコアが更新されたときに履歴を更新
  useEffect(() => {
    if (onScoreUpdate) {
      fetchScores();
    }
  }, [onScoreUpdate, fetchScores]);

  const handleDelete = async (score: Score) => {
    try {
      const response = await fetch(`/api/games/${gameId}/scores/${score.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('スコアの削除に失敗しました');
      }

      // スコアリストを更新
      await fetchScores();
      // 親コンポーネントに更新を通知
      if (onScoreUpdate) {
        onScoreUpdate();
      }
    } catch (error) {
      console.error('Error deleting score:', error);
      alert('スコアの削除に失敗しました');
    } finally {
      setDeleteConfirmScore(null);
    }
  };

  const handleChipChange = (position: string, value: string) => {
    if (value !== '' && !/^\d*$/.test(value)) {
      return;
    }
    setChipInputs(prev => ({
      ...prev,
      [position]: { ...prev[position], value }
    }));
  };

  const toggleChipSign = (position: string) => {
    setChipInputs(prev => ({
      ...prev,
      [position]: { ...prev[position], isPositive: !prev[position].isPositive }
    }));
  };

  const calculateChipPoints = (position: string) => {
    const input = chipInputs[position];
    if (!input.value) return 0;
    const points = parseInt(input.value) * (chipPoints || 0);
    return input.isPositive ? points : -points;
  };

  // 焼き鳥調整の計算
  const calculateYakitoriAdjustment = (isYakitori: boolean, allYakitori: { east: boolean; south: boolean; west: boolean; north: boolean }, yakitoriPenalty: number): number => {
    const yakitoriPlayers = Object.values(allYakitori).filter(Boolean).length;
    const nonYakitoriPlayers = 4 - yakitoriPlayers;
    const yakitoriDistribution = yakitoriPlayers > 0 ? (yakitoriPenalty * yakitoriPlayers) / nonYakitoriPlayers : 0;
    
    if (isYakitori) {
      return -yakitoriPenalty; // 焼き鳥プレイヤーはペナルティ
    } else if (yakitoriPlayers > 0) {
      return yakitoriDistribution; // 焼き鳥でないプレイヤーは分配を受ける
    }
    return 0;
  };

  // 得点計算関数（返し点・焼き鳥分配対応）
  const calculateScore = (points: number, rank: number, yakitori: boolean = false, allYakitori: { east: boolean; south: boolean; west: boolean; north: boolean } = { east: false, south: false, west: false, north: false }, allScores?: Record<string, number>, allRanks?: Record<string, number>): string => {
    if (!gameSettings) return '0';

    // 1位の場合は2-4位の合計の-1倍を返す
    if (rank === 1 && allScores && allRanks) {
      let othersTotal = 0;
      const positions = ['east', 'south', 'west', 'north'];
      
      positions.forEach(pos => {
        const r = allRanks[pos];
        if (r > 1) {
          // 2-4位の点数を計算
          const pts = allScores[pos];
          const adjustedPoints = pts - gameSettings.returnPoints;
          const yak = allYakitori[pos as keyof typeof allYakitori];
          const yakAdj = calculateYakitoriAdjustment(yak, allYakitori, gameSettings.yakitori);
          let uma = 0;
          if (r === 2) uma = gameSettings.uma.second;
          else if (r === 3) uma = gameSettings.uma.third;
          else if (r === 4) uma = gameSettings.uma.fourth;
          othersTotal += (adjustedPoints + yakAdj) / 1000 + uma;
        }
      });

      return (-othersTotal).toFixed(1);
    }

    // 2-4位の場合の計算
    let adjustedPoints = points;
    if (rank > 1) {
      adjustedPoints = points - gameSettings.returnPoints;
    }

    // 焼き鳥の調整を計算
    const yakitoriAdjustment = calculateYakitoriAdjustment(yakitori, allYakitori, gameSettings.yakitori);

    // ウマの取得
    let uma = 0;
    if (rank === 2) uma = gameSettings.uma.second;
    else if (rank === 3) uma = gameSettings.uma.third;
    else if (rank === 4) uma = gameSettings.uma.fourth;
    
    // 点数計算：(素点 - 返し点 + 焼き鳥調整) ÷ 1000 + ウマ
    const baseScore = (adjustedPoints + yakitoriAdjustment) / 1000;
    return (baseScore + uma).toFixed(1);
  };

  // ウマ取得関数
  const getUma = (rank: number) => {
    if (!gameSettings) return 0;
    switch (rank) {
      case 1: return gameSettings.uma.first;
      case 2: return gameSettings.uma.second;
      case 3: return gameSettings.uma.third;
      case 4: return gameSettings.uma.fourth;
      default: return 0;
    }
  };

  // 総得点の計算を修正
  const calculateTotalScores = () => {
    const totals = {
      east: 0,
      south: 0,
      west: 0,
      north: 0
    };

    // 各プレイヤーの総得点を計算（得点ベース）
    scores.forEach(score => {
      // まず順位を計算
      const positions = [
        { position: 'east', score: score.east },
        { position: 'south', score: score.south },
        { position: 'west', score: score.west },
        { position: 'north', score: score.north }
      ].sort((a, b) => b.score - a.score);

      // 順位マップを作成
      const rankMap = Object.fromEntries(
        positions.map((item, index) => [item.position, index + 1])
      );

      // 各局の得点を計算（返し点・焼き鳥分配対応）
      const allYakitori = score.yakitori || { east: false, south: false, west: false, north: false };
      const scoreMap = {
        east: score.east,
        south: score.south,
        west: score.west,
        north: score.north
      };

      const eastScore = parseFloat(calculateScore(score.east, rankMap['east'], allYakitori.east, allYakitori, scoreMap, rankMap));
      const southScore = parseFloat(calculateScore(score.south, rankMap['south'], allYakitori.south, allYakitori, scoreMap, rankMap));
      const westScore = parseFloat(calculateScore(score.west, rankMap['west'], allYakitori.west, allYakitori, scoreMap, rankMap));
      const northScore = parseFloat(calculateScore(score.north, rankMap['north'], allYakitori.north, allYakitori, scoreMap, rankMap));

      // 順位を計算
      const roundScores = [
        { position: 'east', score: eastScore },
        { position: 'south', score: southScore },
        { position: 'west', score: westScore },
        { position: 'north', score: northScore }
      ].sort((a, b) => b.score - a.score);

      // ウマを加算
      roundScores.forEach((player, index) => {
        const rank = index + 1;
        const uma = getUma(rank);
        const finalScore = player.score + uma;
        
        if (player.position === 'east') totals.east += finalScore;
        if (player.position === 'south') totals.south += finalScore;
        if (player.position === 'west') totals.west += finalScore;
        if (player.position === 'north') totals.north += finalScore;
      });
    });

    // チップポイントを加算（得点ベース）
    if (chipEnabled) {
      totals.east += calculateChipPoints('east') / 1000;
      totals.south += calculateChipPoints('south') / 1000;
      totals.west += calculateChipPoints('west') / 1000;
      totals.north += calculateChipPoints('north') / 1000;
    }

    // 順位付け
    const sortedScores = Object.entries(totals)
      .map(([position, total]) => ({
        position,
        total,
      }))
      .sort((a, b) => b.total - a.total);

    return {
      totals,
      ranks: sortedScores.reduce((acc, { position }, index) => {
        acc[position] = index + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center my-3">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  const { totals, ranks } = calculateTotalScores();

  return (
    <div className="card mt-4">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="card-title mb-0">スコア履歴</h5>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={fetchScores}
        >
          更新
        </button>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-bordered mb-0">
            <thead>
              <tr>
                <th className="w-10 text-center">局</th>
                <th className="w-22 text-center">東家</th>
                <th className="w-22 text-center">南家</th>
                <th className="w-22 text-center">西家</th>
                <th className="w-22 text-center">北家</th>
                <th className="w-10 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score) => {
                // 各局の得点を計算（焼き鳥分配対応）
                const allYakitori = score.yakitori || { east: false, south: false, west: false, north: false };
                // まず順位を計算
                const positions = [
                  { position: 'east', score: score.east },
                  { position: 'south', score: score.south },
                  { position: 'west', score: score.west },
                  { position: 'north', score: score.north }
                ].sort((a, b) => b.score - a.score);

                // 順位マップを作成
                const rankMap = Object.fromEntries(
                  positions.map((item, index) => [item.position, index + 1])
                );

                // 得点を計算
                const eastScore = parseFloat(calculateScore(score.east, rankMap['east'], allYakitori.east, allYakitori));
                const southScore = parseFloat(calculateScore(score.south, rankMap['south'], allYakitori.south, allYakitori));
                const westScore = parseFloat(calculateScore(score.west, rankMap['west'], allYakitori.west, allYakitori));
                const northScore = parseFloat(calculateScore(score.north, rankMap['north'], allYakitori.north, allYakitori));

                // 順位を計算
                const roundScores = [
                  { position: 'east', score: eastScore },
                  { position: 'south', score: southScore },
                  { position: 'west', score: westScore },
                  { position: 'north', score: northScore }
                ].sort((a, b) => b.score - a.score);

                // ウマを加算した最終得点を計算
                const finalScores = {
                  east: eastScore + getUma(roundScores.find(p => p.position === 'east')?.score === eastScore ? roundScores.findIndex(p => p.position === 'east') + 1 : 0),
                  south: southScore + getUma(roundScores.find(p => p.position === 'south')?.score === southScore ? roundScores.findIndex(p => p.position === 'south') + 1 : 0),
                  west: westScore + getUma(roundScores.find(p => p.position === 'west')?.score === westScore ? roundScores.findIndex(p => p.position === 'west') + 1 : 0),
                  north: northScore + getUma(roundScores.find(p => p.position === 'north')?.score === northScore ? roundScores.findIndex(p => p.position === 'north') + 1 : 0)
                };

                return (
                  <tr key={score.id}>
                    <td className="text-center">{score.round}</td>
                    <td className={`text-end ${finalScores.east > 0 ? 'text-success' : finalScores.east < 0 ? 'text-danger' : ''}`}>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="d-none d-sm-inline">{finalScores.east > 0 ? '+' : ''}{finalScores.east.toFixed(1)}</span>
                        <span className="d-inline d-sm-none">{finalScores.east > 0 ? '+' : ''}{finalScores.east.toFixed(1)}</span>
                        {score.yakitori?.east && <span className="ms-1">🐔</span>}
                      </div>
                    </td>
                    <td className={`text-end ${finalScores.south > 0 ? 'text-success' : finalScores.south < 0 ? 'text-danger' : ''}`}>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="d-none d-sm-inline">{finalScores.south > 0 ? '+' : ''}{finalScores.south.toFixed(1)}</span>
                        <span className="d-inline d-sm-none">{finalScores.south > 0 ? '+' : ''}{finalScores.south.toFixed(1)}</span>
                        {score.yakitori?.south && <span className="ms-1">🐔</span>}
                      </div>
                    </td>
                    <td className={`text-end ${finalScores.west > 0 ? 'text-success' : finalScores.west < 0 ? 'text-danger' : ''}`}>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="d-none d-sm-inline">{finalScores.west > 0 ? '+' : ''}{finalScores.west.toFixed(1)}</span>
                        <span className="d-inline d-sm-none">{finalScores.west > 0 ? '+' : ''}{finalScores.west.toFixed(1)}</span>
                        {score.yakitori?.west && <span className="ms-1">🐔</span>}
                      </div>
                    </td>
                    <td className={`text-end ${finalScores.north > 0 ? 'text-success' : finalScores.north < 0 ? 'text-danger' : ''}`}>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="d-none d-sm-inline">{finalScores.north > 0 ? '+' : ''}{finalScores.north.toFixed(1)}</span>
                        <span className="d-inline d-sm-none">{finalScores.north > 0 ? '+' : ''}{finalScores.north.toFixed(1)}</span>
                        {score.yakitori?.north && <span className="ms-1">🐔</span>}
                      </div>
                    </td>
                    <td className="text-center">
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => setDeleteConfirmScore(score)}
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                );
              })}
              {chipEnabled && (
                <tr className="table-light">
                  <td className="text-center">チップ</td>
                  {['east', 'south', 'west', 'north'].map(position => (
                    <td key={position} className="text-end">
                      <div className="input-group input-group-sm">
                        <button
                          className="btn btn-outline-secondary"
                          type="button"
                          onClick={() => toggleChipSign(position)}
                        >
                          {chipInputs[position].isPositive ? '+' : '-'}
                        </button>
                        <input
                          type="text"
                          className="form-control"
                          value={chipInputs[position].value}
                          onChange={(e) => handleChipChange(position, e.target.value)}
                          placeholder="枚数"
                        />
                        <span className="input-group-text">枚</span>
                      </div>
                    </td>
                  ))}
                  <td></td>
                </tr>
              )}
              <tr className="table-secondary">
                <td className="text-center">総得点</td>
                <td className={`text-end ${totals.east > 0 ? 'text-success' : totals.east < 0 ? 'text-danger' : ''}`}>
                  {totals.east > 0 ? '+' : ''}{totals.east.toFixed(1)}
                </td>
                <td className={`text-end ${totals.south > 0 ? 'text-success' : totals.south < 0 ? 'text-danger' : ''}`}>
                  {totals.south > 0 ? '+' : ''}{totals.south.toFixed(1)}
                </td>
                <td className={`text-end ${totals.west > 0 ? 'text-success' : totals.west < 0 ? 'text-danger' : ''}`}>
                  {totals.west > 0 ? '+' : ''}{totals.west.toFixed(1)}
                </td>
                <td className={`text-end ${totals.north > 0 ? 'text-success' : totals.north < 0 ? 'text-danger' : ''}`}>
                  {totals.north > 0 ? '+' : ''}{totals.north.toFixed(1)}
                </td>
                <td></td>
              </tr>
              <tr className="table-secondary">
                <td className="text-center">順位</td>
                <td className="text-center">
                  {ranks.east === 1 ? '👑 ' : ''}{ranks.east}位
                </td>
                <td className="text-center">
                  {ranks.south === 1 ? '👑 ' : ''}{ranks.south}位
                </td>
                <td className="text-center">
                  {ranks.west === 1 ? '👑 ' : ''}{ranks.west}位
                </td>
                <td className="text-center">
                  {ranks.north === 1 ? '👑 ' : ''}{ranks.north}位
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 削除確認モーダル */}
      {deleteConfirmScore && (
        <div className="modal show d-block" tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">スコアの削除</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setDeleteConfirmScore(null)}
                ></button>
              </div>
              <div className="modal-body">
                <p>{deleteConfirmScore.round}局のスコアを削除してもよろしいですか？</p>
                <p className="text-danger">この操作は取り消せません。</p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDeleteConfirmScore(null)}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleDelete(deleteConfirmScore)}
                >
                  削除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {deleteConfirmScore && <div className="modal-backdrop show"></div>}
    </div>
  );
}