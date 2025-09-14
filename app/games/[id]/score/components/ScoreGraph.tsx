'use client';

import { useState, useEffect, useCallback } from 'react';
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Score {
  id: string;
  round: number;
  east: number;
  south: number;
  west: number;
  north: number;
}

interface ScoreGraphProps {
  gameId: string;
  onScoreUpdate?: () => void;
}

export default function ScoreGraph({ gameId, onScoreUpdate }: ScoreGraphProps) {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScores = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/games/${gameId}/scores`);
      const data = await response.json();
      if (response.ok) {
        setScores(data.scores);
      }
    } catch (error) {
      console.error('Error fetching scores:', error);
    }
    setLoading(false);
  }, [gameId]);

  useEffect(() => {
    fetchScores();
  }, [gameId, fetchScores]);

  // スコアが更新されたときに履歴を更新
  useEffect(() => {
    if (onScoreUpdate) {
      fetchScores();
    }
  }, [onScoreUpdate, fetchScores]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center my-3">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // エラー表示を削除

  // 累計スコアを計算
  const cumulativeScores = scores.reduce((acc, score) => {
    const lastScores = acc.length > 0 ? acc[acc.length - 1] : { east: 0, south: 0, west: 0, north: 0 };
    acc.push({
      east: lastScores.east + score.east,
      south: lastScores.south + score.south,
      west: lastScores.west + score.west,
      north: lastScores.north + score.north,
    });
    return acc;
  }, [] as { east: number; south: number; west: number; north: number }[]);

  const data = {
    labels: scores.map((_, index) => `${index + 1}局`),
    datasets: [
      {
        label: '東家',
        data: cumulativeScores.map(score => score.east),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        tension: 0.1,
      },
      {
        label: '南家',
        data: cumulativeScores.map(score => score.south),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        tension: 0.1,
      },
      {
        label: '西家',
        data: cumulativeScores.map(score => score.west),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.1,
      },
      {
        label: '北家',
        data: cumulativeScores.map(score => score.north),
        borderColor: 'rgb(255, 205, 86)',
        backgroundColor: 'rgba(255, 205, 86, 0.5)',
        tension: 0.1,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'スコア推移',
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: function(value) {
            return value.toLocaleString();
          }
        }
      }
    }
  };

  return (
    <div style={{ height: '250px' }}>
      <Line options={options} data={data} />
    </div>
  );
}