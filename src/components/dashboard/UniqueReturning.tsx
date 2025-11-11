// src/components/dashboard/UniqueReturning.tsx

import { Line } from "react-chartjs-2";
import { ChartCard, chartTheme, useBaseOptions } from "./ChartKit";

type Row = { label: string; unique: number; returning: number };

export default function UniqueReturning({
  data,
  loading,
}: {
  data: Row[];
  loading?: boolean;
}) {
  const labels = (data || []).map((d) => d.label);
  const uniques = (data || []).map((d) => d.unique || 0);
  const returning = (data || []).map((d) => d.returning || 0);

  const ds = {
    labels,
    datasets: [
      {
        label: "Unique",
        data: uniques,
        borderColor: "#3b82f6",      // solid blue
        backgroundColor: "transparent",
        fill: true,                  // no area fill
        tension: 0.35,
        pointRadius: 2,               // show points
        pointHoverRadius: 3,
        borderWidth: 2,
        spanGaps: true,
      },
      {
        label: "Returning",
        data: returning,
        borderColor: "#22c55e",      // solid green
        backgroundColor: "transparent",
        fill: true,                  // no area fill
        tension: 0.35,
        pointRadius: 2,               // show points
        pointHoverRadius: 3,
        borderWidth: 2,
        spanGaps: true,
      },
    ],
  };

  const options = {
    ...useBaseOptions({ stacked: false, yBeginAtZero: true, showLegend: true }),
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
      x: { grid: { display: true, color: "rgba(0,0,0,0.03)" } },
      y: { beginAtZero: true, grid: { color: chartTheme.grid } },
    },
  } as const;

  return (
    <ChartCard
      title="Unique vs Returning"
      info="Unique and returning visitors over time."
      loading={loading}
      height={300}
    >
      <Line data={ds} options={options} />
    </ChartCard>
  );
}
