// src/components/dashboard/PerformanceLine.tsx

import { Line } from "react-chartjs-2";
import { ChartCard, chartTheme, useBaseOptions } from "./ChartKit";
type Row = { label: string; count: number };

export default function PerformanceLine({
  title,
  current,
  previous,
  color = chartTheme.info,
  filled = false,
  loading,
}: {
  title: string;
  current: Row[];
  previous?: Row[];
  color?: string;
  filled?: boolean;
  loading?: boolean;
}) {
  const labels = (current || previous || []).map((d) => d.label);
  const prevMap = new Map((previous || []).map((r) => [r.label, r.count]));
  const dsCurrent = labels.map((l) => (current.find((c) => c.label === l)?.count ?? null));
  const dsPrev = labels.map((l) => prevMap.get(l) ?? null);

  const ds = {
    labels,
    datasets: [
      {
        label: title,
        data: dsCurrent,
        borderColor: color,
        backgroundColor: filled ? `${color}20` : "transparent",
        fill: filled,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
        spanGaps: true,
      },
      {
        label: "Previous Period",
        data: dsPrev,
        borderColor: chartTheme.gray,
        borderDash: [5, 5],
        backgroundColor: "transparent",
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
        spanGaps: true,
      },
    ],
  };

  const options = {
    ...useBaseOptions({ yBeginAtZero: true, showLegend: true }),
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, grid: { color: chartTheme.grid } },
    },
    plugins: {
      legend: { position: "bottom" as const, labels: { usePointStyle: true } },
      tooltip: {
        mode: "index" as const,
        intersect: false,
      },
    },
  } as const;

  return (
    <ChartCard title={title} loading={loading} height={260}>
      <Line data={ds} options={options} />
    </ChartCard>
  );
}
