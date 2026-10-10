import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

interface Props {
  labels: string[];
  values: number[];
  color?: string;
  noun: string;
  height?: number;
}

/** A simple column chart for categories (months, weekdays, …) rather than dates. */
export default function LabelBarChart({ labels, values, color = '#1769E0', noun, height = 190 }: Props) {
  return (
    <div style={{ height }}>
      <Bar
        data={{ labels, datasets: [{ data: values, backgroundColor: color, borderRadius: 4, maxBarThickness: 34 }] }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 400 },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11 } } },
            y: { beginAtZero: true, grid: { color: '#E8EEF7' }, ticks: { precision: 0, font: { size: 11 } } },
          },
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.raw} ${noun}` } } },
        }}
      />
    </div>
  );
}
