// src/components/dashboard/PerformanceLine.tsx

import { Line } from "react-chartjs-2";
import { ChartCard, chartTheme, useBaseOptions } from "./ChartKit";

type Row = { label: string; count: number };

function withAlphaHex(hex: string, alpha: number) {
  const a = Math.max(0, Math.min(1, alpha));
  const aa = Math.round(a * 255).toString(16).padStart(2, "0");
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  return `#${full}${aa}`;
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

  const bg = filled ? withAlphaHex(color, 0.18) : "transparent";

  const ds = {
    labels,
    datasets: [
      {
        label: title,
        data: dsCurrent,
        borderColor: color,
        backgroundColor: bg,
        fill: filled ? true : false,
        tension: 0.35,
        pointRadius: filled ? 3 : 0,
        pointHoverRadius: filled ? 5 : 0,
        pointBorderWidth: filled ? 2 : 0,
        pointBackgroundColor: color,
        pointBorderColor: "#fff",
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
    interaction: { mode: "index" as const, intersect: false },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, grid: { color: chartTheme.grid } },
    },
    plugins: {
      legend: { position: "bottom" as const, labels: { usePointStyle: true } },
      tooltip: { mode: "index" as const, intersect: false },
      filler: { propagate: false },
    },
  } as const;

  return (
    <ChartCard title={title} loading={loading} height={260}>
      <Line data={ds} options={options} />
    </ChartCard>
  );
}
