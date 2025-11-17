// src/components/dashboard/EventVolume.tsx

import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import { ChartCard, chartTheme, useBaseOptions } from "./ChartKit";

type Row = { label: string; count: number };

export default function EventVolume({
  data,
  loading,
  hasData,
  version,
}: {
  data: Row[];
  loading?: boolean;
  hasData?: boolean;
  version?: number;
}) {
  const labels = useMemo(() => (data || []).map((d) => d.label), [data, version]);
  const values = useMemo(() => (data || []).map((d) => d.count || 0), [data, version]);

  const ds = useMemo(() => ({
    labels,
    datasets: [
      {
        label: "Events",
        data: values.slice(),
        borderColor: "rgba(54,162,235,1)",
        backgroundColor: "rgba(54,162,235,0.20)",
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
        spanGaps: true,
      },
    ],
  }), [labels, values, version]);

  const base = useBaseOptions({ yBeginAtZero: true, showLegend: false });

  const options = useMemo(() => ({
    ...base,
    scales: {
      x: { grid: { display: true, color: "rgba(0,0,0,0.03)" } },
      y: { beginAtZero: true, grid: { color: chartTheme.grid } },
    },
  } as const), [base]);

  return (
    <ChartCard
      title="Event Volume"
      info="Total number of pageviews, clicks, and other user events tracked during the selected time period. Useful for gauging overall interaction."
      loading={loading}
      height={300}
    >
      <Line data={ds} options={options} />
    </ChartCard>
  );
}