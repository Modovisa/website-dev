// src/components/dashboard/EventVolume.tsx

import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import { ChartCard, chartTheme, useBaseOptions } from "./ChartKit";

type Row = { label: string; count: number };

export default function EventVolume({ data, loading }: { data: Row[]; loading?: boolean }) {
  const safe = Array.isArray(data) ? data : [];
  const labels = useMemo(() => safe.map((d) => String(d.label ?? "")), [safe]);
  const values = useMemo(() => safe.map((d) => Number(d.count ?? 0)), [safe]);

  const ds = useMemo(
    () => ({
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
    }),
    [labels, values]
  );

  const options = useBaseOptions({ yBeginAtZero: true, showLegend: false });

  return (
    <ChartCard title="Event Volume" loading={loading} height={300}>
      <Line data={ds} options={options} updateMode="none" redraw={false} />
    </ChartCard>
  );
}
