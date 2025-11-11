// src/components/dashboard/PerformanceLine.tsx

import { Line } from "react-chartjs-2";
import { ChartCard, chartTheme, useBaseOptions } from "./ChartKit";

type Row = { label: string; count: number };

function hexToRgba(hex: string, alpha: number) {
  // supports #RGB, #RRGGBB, #RRGGBBAA; falls back to hex with added alpha if valid
  const h = hex.replace("#", "");
  const parse = (s: string) => parseInt(s, 16);
  if (h.length === 3) {
    const r = parse(h[0] + h[0]), g = parse(h[1] + h[1]), b = parse(h[2] + h[2]);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (h.length >= 6) {
    const r = parse(h.slice(0, 2)), g = parse(h.slice(2, 4)), b = parse(h.slice(4, 6));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
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

  const bg = filled ? hexToRgba(color, 0.18) : "transparent";

  const ds = {
    labels,
    datasets: [
      {
        label: title,
        data: dsCurrent,
        borderColor: color,
        backgroundColor: bg,   // translucent area for current series
        fill: filled,
        tension: 0.35,
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
        tension: 0.35,
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
      tooltip: { mode: "index" as const, intersect: false },
    },
  } as const;

  return (
    <ChartCard title={title} loading={loading} height={260}>
      <Line data={ds} options={options} />
    </ChartCard>
  );
}
