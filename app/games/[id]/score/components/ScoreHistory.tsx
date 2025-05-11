'use client';

interface Score {
  id: string;
  round: number;
  east: number;
  south: number;
  west: number;
  north: number;
}

interface ScoreHistoryProps {
  gameId: string;
  scores: Score[];
}

export default function ScoreHistory({ gameId, scores }: ScoreHistoryProps) {
  return (
    <div className="table-responsive">
      <table className="table table-bordered">
        <thead>
          <tr>
            <th>局</th>
            <th>東家</th>
            <th>南家</th>
            <th>西家</th>
            <th>北家</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((score) => (
            <tr key={score.id}>
              <td>{score.round}</td>
              <td>{score.east.toLocaleString()}</td>
              <td>{score.south.toLocaleString()}</td>
              <td>{score.west.toLocaleString()}</td>
              <td>{score.north.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 