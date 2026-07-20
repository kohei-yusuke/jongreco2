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
import { SEATS, SEAT_LABEL, calcRoundFinals, round1, type ScoreSettings } from '@/lib/score';
import { useGameScores } from './useGameScores';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const SEAT_COLOR = {
  east: 'rgb(239, 68, 68)',
  south: 'rgb(59, 130, 246)',
  west: 'rgb(16, 185, 129)',
  north: 'rgb(245, 158, 11)',
} as const;

interface ScoreGraphProps {
  gameId: string;
  settings: ScoreSettings;
  refreshToken?: number;
}

/** 各半荘ごとの精算得点（増減）の推移。 */
export default function ScoreGraph({ gameId, settings, refreshToken = 0 }: ScoreGraphProps) {
  const { scores, loading } = useGameScores(gameId, refreshToken);

  if (loading) {
    return (
      <div className="d-flex justify-content-center my-3">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const perRound = scores.map((s) =>
    calcRoundFinals(
      { east: s.east, south: s.south, west: s.west, north: s.north },
      s.yakitori ?? { east: false, south: false, west: false, north: false },
      settings,
    ),
  );

  const data = {
    labels: scores.map((_, i) => `${i + 1}`),
    datasets: SEATS.map((s) => ({
      label: SEAT_LABEL[s],
      data: perRound.map((r) => round1(r[s])),
      borderColor: SEAT_COLOR[s],
      backgroundColor: SEAT_COLOR[s],
      tension: 0.2,
    })),
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: '半荘ごとの得点' },
    },
    scales: { y: { ticks: { callback: (v) => `${v}` } } },
  };

  return (
    <div style={{ height: 260 }}>
      <Line options={options} data={data} />
    </div>
  );
}
