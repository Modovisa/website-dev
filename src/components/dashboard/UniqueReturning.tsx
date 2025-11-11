// src/components/dashboard/UniqueReturning.tsx

import { Line } from "react-chartjs-2";
import { ChartCard, chartTheme, useBaseOptions } from "./ChartKit";

type Row = { label: string; unique: number; returning: number };

export default function UniqueReturning({ data, loading }: { data: Row[]; loading?: boolean }) {
  const labels = (data || []).map((d) => d.label);
  const ds = {
    labels,
    datasets: [
      {
        label: "Unique",
        data: data.map((d) => d.unique),
        borderColor: chartTheme.info,
        backgroundColor: "rgba(59,130,246,0.20)",
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        borderWidth: 2,
        stack: "s",
      },
      {
        label: "Returning",
        data: data.map((d) => d.returning),
        borderColor: chartTheme.success,
        backgroundColor: "rgba(34,197,94,0.20)",
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        borderWidth: 2,
        stack: "s",
      },
    ],
  };
  const options = useBaseOptions({ stacked: true, yBeginAtZero: true, showLegend: true });
  return (
    <ChartCard title="Unique vs Returning" info="First-time vs repeat visitors." loading={loading}>
      <Line data={ds} options={options} />
    </ChartCard>
  );
}
