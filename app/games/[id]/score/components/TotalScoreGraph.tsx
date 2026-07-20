'use client';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { SEATS, SEAT_LABEL, calcRoundFinals, round1, type Seat, type SeatRecord, type ScoreSettings } from '@/lib/score';
import { useGameScores } from './useGameScores';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const SEAT_COLOR = {
  east: 'rgb(239, 68, 68)',
  south: 'rgb(59, 130, 246)',
  west: 'rgb(16, 185, 129)',
  north: 'rgb(245, 158, 11)',
} as const;

interface TotalScoreGraphProps {
  gameId: string;
  settings: ScoreSettings;
  refreshToken?: number;
}

/** 精算得点の累計推移。 */
export default function TotalScoreGraph({ gameId, settings, refreshToken = 0 }: TotalScoreGraphProps) {
  const { scores, loading, error } = useGameScores(gameId, refreshToken);

  if (loading) {
    return (
      <div className="d-flex justify-content-center my-3">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger" role="alert">{error}</div>;
  }

  // 累計 final を計算
  const cumulative: SeatRecord<number>[] = [];
  const running: SeatRecord<number> = { east: 0, south: 0, west: 0, north: 0 };
  scores.forEach((s) => {
    const finals = calcRoundFinals(
      { east: s.east, south: s.south, west: s.west, north: s.north },
      s.yakitori ?? { east: false, south: false, west: false, north: false },
      settings,
    );
    SEATS.forEach((seat) => { running[seat] += finals[seat]; });
    cumulative.push({ ...running });
  });

  const data = {
    labels: scores.map((_, i) => `${i + 1}`),
    datasets: SEATS.map((seat: Seat) => ({
      label: SEAT_LABEL[seat],
      data: cumulative.map((c) => round1(c[seat])),
      borderColor: SEAT_COLOR[seat],
      backgroundColor: SEAT_COLOR[seat],
      tension: 0.2,
    })),
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: '累計得点' },
    },
    scales: { y: { ticks: { callback: (v) => `${v}` } } },
  };

  return (
    <div style={{ height: 260 }}>
      <Line options={options} data={data} />
    </div>
  );
}
