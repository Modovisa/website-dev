// src/components/dashboard/PerformanceLine.tsx

import { Line } from "react-chartjs-2";
import { ChartCard, chartTheme, useBaseOptions } from "./ChartKit";
type Row = { label: string; count: number };

export default function PerformanceLine({
  title,
  current,
  previous,
  color = chartTheme.info,
  loading,
}: {
  title: string;
  current: Row[];
  previous?: Row[];
  color?: string;
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
        backgroundColor: "transparent",
        fill: false,
        tension: 0.35,
        pointRadius: 0,
        borderWidth: 2,
      },
      {
        label: "Previous",
        data: dsPrev,
        borderColor: chartTheme.gray,
        borderDash: [5, 5],
        backgroundColor: "transparent",
        fill: false,
        tension: 0.35,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  };
  const options = useBaseOptions({ yBeginAtZero: true, showLegend: true });

  return (
    <ChartCard title={title} loading={loading}>
      <Line data={ds} options={options} />
    </ChartCard>
  );
}
