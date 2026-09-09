import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  data: Record<string, number>;
}

// Matches the app's existing accent palette rather than Chart.js
// defaults — same colors used for role badges elsewhere in the admin
// pages (status pills, chips).
const COLORS: Record<string, string> = {
  worker: '#1769E0',
  provider: '#2F80ED',
  coordinator: '#0F4FA8',
  participant: '#7FB2F0',
  admin: '#0B2D5C',
};

export default function RoleDonutChart({ data }: Props) {
  const labels = Object.keys(data).filter((k) => data[k] > 0);
  const values = labels.map((l) => data[l]);
  const total = values.reduce((a, b) => a + b, 0);

  if (total === 0) {
    return <p style={{ color: 'var(--color-text-muted, #5A6B84)', fontSize: 13.5 }}>No users yet.</p>;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
      <div style={{ width: 160, height: 160, flex: 'none' }}>
        <Doughnut
          data={{
            labels: labels.map((l) => l[0].toUpperCase() + l.slice(1)),
            datasets: [{
              data: values,
              backgroundColor: labels.map((l) => COLORS[l] ?? '#94A3B8'),
              borderWidth: 2,
              borderColor: '#fff',
            }],
          }}
          options={{
            cutout: '68%',
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const pct = ((Number(ctx.raw) / total) * 100).toFixed(1);
                    return `${ctx.label}: ${ctx.raw} (${pct}%)`;
                  },
                },
              },
            },
          }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 140 }}>
        {labels.map((l) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13.5 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[l] ?? '#94A3B8', flex: 'none' }} />
              <span style={{ textTransform: 'capitalize' }}>{l}</span>
            </span>
            <span style={{ fontWeight: 700 }}>{data[l]} <span style={{ fontWeight: 400, color: 'var(--color-text-muted, #5A6B84)' }}>({((data[l] / total) * 100).toFixed(0)}%)</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}
