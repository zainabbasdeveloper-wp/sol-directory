import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface Props {
  dates: string[];
  /** One entry per bar series; more than one stacks them. */
  series: { label: string; values: number[]; color: string }[];
  noun: string;
}

export default function DailyBarChart({ dates, series, noun }: Props) {
  const stacked = series.length > 1;
  return (
    <div style={{ height: 190 }}>
      <Bar
        data={{
          labels: dates.map((d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })),
          datasets: series.map((s) => ({ label: s.label, data: s.values, backgroundColor: s.color, borderRadius: 3, maxBarThickness: 22 })),
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 400 },
          scales: {
            x: { stacked, grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 } },
            y: { stacked, beginAtZero: true, grid: { color: '#E8EEF7' }, ticks: { precision: 0, font: { size: 11 } } },
          },
          plugins: {
            legend: { display: stacked, position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
            tooltip: { callbacks: { label: (ctx) => `${ctx.raw} ${stacked ? ctx.dataset.label : noun}` } },
          },
        }}
      />
    </div>
  );
}
