// src/components/dashboard/TimeGroupedVisits.tsx

import { Bar } from "react-chartjs-2";
import { chartTheme, ChartCard, useBaseOptions } from "./ChartKit";
import type { RangeKey, TimeBucket } from "@/types/dashboard";

export default function TimeGroupedVisits({
  data,
  range,
  loading,
}: {
  data: TimeBucket[];
  range: RangeKey;
  loading?: boolean;
}) {
  const labels = (data || []).map((d) => d.label);
  const ds = {
    labels,
    datasets: [
      {
        label: "Visitors",
        data: data.map((d) => d.visitors),
        backgroundColor: chartTheme.primary,
        borderRadius: 6,
        barPercentage: 0.7,
        categoryPercentage: 0.6,
      },
      {
        label: "Views",
        data: data.map((d) => d.views),
        backgroundColor: "rgba(99,102,241,0.25)",
        borderRadius: 6,
        barPercentage: 0.7,
        categoryPercentage: 0.6,
      },
    ],
  };
  const options = useBaseOptions({ stacked: false, yBeginAtZero: true, showLegend: true });
  const title =
    { "24h": "Visits – Today", "7d": "Visits – Last 7 Days", "30d": "Visits – Last 30 Days", "90d": "Visits – Last 90 Days", "12mo": "Visits – Last 12 Months" }[
      range
    ] || "Visits";

  return (
    <ChartCard title={title} info="Visitors & page views over the selected period." loading={loading}>
      <Bar data={ds} options={options} />
    </ChartCard>
  );
}
