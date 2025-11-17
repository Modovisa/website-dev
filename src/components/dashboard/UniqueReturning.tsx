// src/components/dashboard/UniqueReturning.tsx

import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import { ChartCard, chartTheme, useBaseOptions } from "./ChartKit";

type Row = { label: string; unique: number; returning: number };

export default function UniqueReturning({
  data,
  loading,
  version,
}: {
  data: Row[];
  loading?: boolean;
  version?: number;
}) {
  const labels = useMemo(() => (data || []).map((d) => d.label), [data, version]);
  const uniques = useMemo(() => (data || []).map((d) => d.unique || 0), [data, version]);
  const returning = useMemo(() => (data || []).map((d) => d.returning || 0), [data, version]);

  const ds = useMemo(() => ({
    labels,
    datasets: [
      {
        label: "Unique",
        data: uniques.slice(),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(55, 128, 246,0.55)",
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 3,
        borderWidth: 2,
        stack: "uvr",
      },
      {
        label: "Returning",
        data: returning.slice(),
        borderColor: "#22c55e",
        backgroundColor: "rgba(34,197,94,0.20)",
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 3,
        borderWidth: 2,
        stack: "uvr",
      },
    ],
  }), [labels, uniques, returning, version]);

  const base = useBaseOptions({ stacked: true, yBeginAtZero: true, showLegend: true });

  const options = useMemo(() => ({
    ...base,
    plugins: {
      legend: { position: "bottom" as const, labels: { usePointStyle: true } },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        callbacks: {
          footer: (items: any[]) => {
            const sum = items.reduce((a, i) => a + (Number(i.raw) || 0), 0);
            if (!sum) return "";
            const u = Number(items.find((i) => i.dataset.label === "Unique")?.raw || 0);
            const r = Number(items.find((i) => i.dataset.label === "Returning")?.raw || 0);
            const up = ((u / sum) * 100).toFixed(0);
            const rp = ((r / sum) * 100).toFixed(0);
            return `Total: ${sum}  •  U ${up}%  •  R ${rp}%`;
          },
        },
      },
    },
    scales: {
      x: { stacked: true, grid: { display: true, color: "rgba(0,0,0,0.03)" } },
      y: { stacked: true, beginAtZero: true, grid: { color: chartTheme.grid } },
    },
  } as const), [base]);

  return (
    <ChartCard
      title="Unique vs Returning"
      info="Tracks how many users are first-time visitors vs. returning ones. Helpful for measuring engagement and repeat visits."
      loading={loading}
      height={300}
    >
      <Line data={ds} options={options} />
    </ChartCard>
  );
}