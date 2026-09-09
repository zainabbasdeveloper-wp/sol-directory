import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

interface Props {
  series: { date: string; count: number }[];
}

export default function UserGrowthChart({ series }: Props) {
  if (series.length === 0) {
    return <p style={{ color: 'var(--color-text-muted, #5A6B84)', fontSize: 13.5 }}>No registration data for this period.</p>;
  }

  // Sparse x-axis labels — showing every single date on a 90-day
  // chart would be unreadable, so this thins them out based on the
  // series length rather than a fixed interval.
  const labelEvery = Math.max(1, Math.ceil(series.length / 8));

  return (
    <div style={{ height: 220 }}>
      <Line
        data={{
          labels: series.map((s, i) => (i % labelEvery === 0 ? new Date(s.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '')),
          datasets: [{
            data: series.map((s) => s.count),
            borderColor: '#1769E0',
            backgroundColor: 'rgba(23, 105, 224, 0.10)',
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 4,
            borderWidth: 2,
          }],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 500 },
          scales: {
            x: { grid: { display: false }, ticks: { autoSkip: false, font: { size: 11 } } },
            y: { beginAtZero: true, grid: { color: '#E8EEF7' }, ticks: { precision: 0, font: { size: 11 } } },
          },
          plugins: {
            tooltip: {
              callbacks: {
                title: (items) => new Date(series[items[0].dataIndex].date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }),
                label: (ctx) => `${ctx.raw} registration${ctx.raw === 1 ? '' : 's'}`,
              },
            },
          },
        }}
      />
    </div>
  );
}
