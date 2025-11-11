// src/components/dashboard/PerformanceLine.tsx

import { Line } from "react-chartjs-2";
import { ChartCard, chartTheme, useBaseOptions } from "./ChartKit";

type Row = { label: string; count: number };

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const to = (s: string) => parseInt(s, 16);
  if (h.length === 3) {
    const r = to(h[0] + h[0]), g = to(h[1] + h[1]), b = to(h[2] + h[2]);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  const r = to(h.slice(0, 2)), g = to(h.slice(2, 4)), b = to(h.slice(4, 6));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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
  const dsCurrent = labels.map((l) => current.find((c) => c.label === l)?.count ?? null);
  const dsPrev = labels.map((l) => prevMap.get(l) ?? null);

  const background = filled ? hexToRgba(color, 0.18) : "transparent";

  const ds = {
    labels,
    datasets: [
      {
        label: title,
        data: dsCurrent,
        borderColor: color,
        backgroundColor: background,
        fill: filled ? { target: "origin" } : false, // <<< ensures visible area
        tension: 0.35,
        pointRadius: filled ? 3 : 0,
        pointHoverRadius: filled ? 5 : 0,
        pointBorderWidth: filled ? 2 : 0,
        pointBackgroundColor: color,
        pointBorderColor: "#fff",
        borderWidth: 2,
        spanGaps: true,
        clip: false,
      },
      {
        label: "Previous Period",
        data: dsPrev,
        borderColor: chartTheme.gray,
        borderDash: [5, 5],
        backgroundColor: "transparent",
        fill: false,
        tension: 0.35,
        pointRadius: 0,
        borderWidth: 2,
        spanGaps: true,
      },
    ],
  };

  const options = {
    ...useBaseOptions({ yBeginAtZero: true, showLegend: true }),
    interaction: { mode: "index" as const, intersect: false },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, grid: { color: chartTheme.grid } },
    },
    plugins: {
      legend: { position: "bottom" as const, labels: { usePointStyle: true } },
      tooltip: { mode: "index" as const, intersect: false },
    },
    maintainAspectRatio: false,
  } as const;

  return (
    <ChartCard title={title} loading={loading} height={260}>
      <Line data={ds} options={options} />
    </ChartCard>
  );
}
