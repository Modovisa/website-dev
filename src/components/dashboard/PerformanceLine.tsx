// src/components/dashboard/PerformanceLine.tsx

import { useMemo } from "react";
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
  const labels = useMemo(() => (current || previous || []).map((d) => d.label), [current, previous]);
  const prevMap = useMemo(() => new Map((previous || []).map((r) => [r.label, r.count])), [previous]);
  const dsCurrent = useMemo(() => labels.map((l) => current.find((c) => c.label === l)?.count ?? null), [labels, current]);
  const dsPrev = useMemo(() => labels.map((l) => prevMap.get(l) ?? null), [labels, prevMap]);

  const bg = filled ? withAlphaHex(color, 0.18) : "transparent";

  const ds = useMemo(
    () => ({
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
    }),
    [labels, dsCurrent, dsPrev, color, bg, filled, title]
  );

  // ✅ Call hook at top level, not inside useMemo
  const base = useBaseOptions({ yBeginAtZero: true, showLegend: true });

  const options = useMemo(
    () => ({
      ...base,
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
    }),
    [base]
  );

  return (
    <ChartCard title={title} loading={loading} height={260}>
      <Line data={ds} options={options} updateMode="none" redraw={false} />
    </ChartCard>
  );
}
