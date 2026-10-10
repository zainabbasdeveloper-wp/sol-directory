import { Chart } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, BarController, LineElement, LineController, PointElement, Tooltip, Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, BarController, LineElement, LineController, PointElement, Tooltip, Legend);

export interface MonthlyRow {
  month: string;
  worker: number; provider: number; coordinator: number; participant: number;
  cumulativeUsers: number; enquiries: number; emailsSent: number;
}

const ROLE_COLOURS: { key: 'worker' | 'provider' | 'coordinator' | 'participant'; label: string; color: string }[] = [
  { key: 'worker', label: 'NDIS workers', color: '#1769E0' },
  { key: 'provider', label: 'Providers', color: '#0B2D5C' },
  { key: 'coordinator', label: 'Coordinators', color: '#2FA7A0' },
  { key: 'participant', label: 'Participants / families', color: '#E0A021' },
];

const label = (m: string) => new Date(`${m}-15T12:00:00`).toLocaleDateString('en-AU', { month: 'short', year: '2-digit' });

/** Monthly sign-ups by role (stacked bars) with the running total of all users as a line on its own axis. */
export default function GrowthChart({ rows }: { rows: MonthlyRow[] }) {
  return (
    <div style={{ height: 300 }}>
      <Chart
        type="bar"
        data={{
          labels: rows.map((r) => label(r.month)),
          datasets: [
            ...ROLE_COLOURS.map((r) => ({ type: 'bar' as const, label: r.label, data: rows.map((row) => row[r.key]), backgroundColor: r.color, borderRadius: 3, stack: 'signups', yAxisID: 'y', maxBarThickness: 34 })),
            { type: 'line' as const, label: 'Total users (running)', data: rows.map((r) => r.cumulativeUsers), borderColor: '#D64545', backgroundColor: '#D64545', borderWidth: 2.5, tension: 0.3, pointRadius: 3, yAxisID: 'y2' },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          animation: { duration: 500 },
          scales: {
            x: { stacked: true, grid: { display: false }, ticks: { font: { size: 11 } } },
            y: { stacked: true, beginAtZero: true, grid: { color: '#E8EEF7' }, ticks: { precision: 0, font: { size: 11 } }, title: { display: true, text: 'New sign-ups', font: { size: 11 } } },
            y2: { position: 'right', beginAtZero: true, grid: { display: false }, ticks: { precision: 0, font: { size: 11 } }, title: { display: true, text: 'Total users', font: { size: 11 } } },
          },
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
        }}
      />
    </div>
  );
}
