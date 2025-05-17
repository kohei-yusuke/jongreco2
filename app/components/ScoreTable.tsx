import { Player } from '@prisma/client';

interface Score {
  round: number;
  score: number;
}

interface PlayerStats {
  id: string;
  name: string;
  position: string;
  scores: Score[];
  totalScore: number;
  rank: number;
}

interface ScoreTableProps {
  players: PlayerStats[];
  rounds: number;
}

export default function ScoreTable({ players, rounds }: ScoreTableProps) {
  return (
    <div className="card mt-4">
      <div className="card-body">
        <h5 className="card-title mb-4">スコア集計</h5>
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>順位</th>
                <th>名前</th>
                {Array.from({ length: rounds }, (_, i) => (
                  <th key={i + 1}>第{i + 1}局</th>
                ))}
                <th>総得点</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id}>
                  <td>{player.rank}位</td>
                  <td>{player.name}</td>
                  {Array.from({ length: rounds }, (_, i) => {
                    const score = player.scores[i]?.score;
                    return (
                      <td key={i + 1} className={score ? (score > 0 ? 'text-success' : 'text-danger') : ''}>
                        {score ? score.toLocaleString() : '-'}
                      </td>
                    );
                  })}
                  <td className={player.totalScore > 0 ? 'text-success' : 'text-danger'}>
                    {player.totalScore.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 