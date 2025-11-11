// src/components/dashboard/EventVolume.tsx

import { Line } from "react-chartjs-2";
import { ChartCard, chartTheme, useBaseOptions } from "./ChartKit";
import type { LabelCount } from "@/types/dashboard";

export default function EventVolume({ data, loading }: { data: LabelCount[]; loading?: boolean }) {
  const labels = (data || []).map((d) => d.label);
  const ds = {
    labels,
    datasets: [
      {
        label: "Events",
        data: data.map((d) => d.count),
        borderColor: chartTheme.info,
        backgroundColor: "rgba(59,130,246,0.18)",
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  };
  const options = useBaseOptions({ yBeginAtZero: true, showLegend: true });
  return (
    <ChartCard title="Event Volume" info="Total tracked events per time bucket." loading={loading}>
      <Line data={ds} options={options} />
    </ChartCard>
  );
}
