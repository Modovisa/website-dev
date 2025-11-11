// src/components/dashboard/Donut.tsx

import { Doughnut } from "react-chartjs-2";
import { ChartCard } from "./ChartKit";

export default function Donut({
  data,
  nameKey,
  valueKey,
  title,
  info,
  loading,
}: {
  data: any[];
  nameKey: string;
  valueKey: string;
  title?: string;
  info?: string;
  loading?: boolean;
}) {
  const labels = (data || []).map((d) => d[nameKey]);
  const values = (data || []).map((d) => d[valueKey]);
  const colors = labels.map((_, i) => `hsl(${(i * 57) % 360},70%,65%)`);
  const ds = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: colors,
        borderWidth: 1,
      },
    ],
  };
  const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" as const } } };

  return (
    <ChartCard title={title || "Donut"} info={info} loading={loading}>
      {labels.length ? <Doughnut data={ds} options={options} /> : <div className="text-muted-foreground">No data</div>}
    </ChartCard>
  );
}
