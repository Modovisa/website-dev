// src/components/dashboard/EventVolume.tsx

import { Line } from "react-chartjs-2";
import { ChartCard, chartTheme, useBaseOptions } from "./ChartKit";

type Row = { label: string; count: number };

export default function EventVolume({
  data,
  loading,
}: {
  data: Row[];
  loading?: boolean;
}) {
  const labels = (data || []).map((d) => d.label);
  const values = (data || []).map((d) => d.count || 0);

  const ds = {
    labels,
    datasets: [
      {
        label: "Events",
        data: values,
        borderColor: "rgba(54,162,235,1)",
        backgroundColor: "rgba(54,162,235,0.20)",
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
        spanGaps: true,
      },
    ],
  };

  const options = {
    ...useBaseOptions({ yBeginAtZero: true, showLegend: false }),
    scales: {
      x: { grid: { display: true, color: "rgba(0,0,0,0.03)" } },
      y: { beginAtZero: true, grid: { color: chartTheme.grid } },
    },
  } as const;

  return (
    <ChartCard title="Event Volume" loading={loading} height={300}>
      <Line data={ds} options={options} />
    </ChartCard>
  );
}
