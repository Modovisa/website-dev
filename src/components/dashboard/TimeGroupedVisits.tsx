// src/components/dashboard/TimeGroupedVisits.tsx

import { useMemo } from "react";
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
  const safe = Array.isArray(data) ? data : [];
  const labels = useMemo(() => safe.map((d) => String(d.label ?? "")), [safe]);
  const visitors = useMemo(() => safe.map((d) => Number(d.visitors ?? 0)), [safe]);
  const views = useMemo(() => safe.map((d) => Number(d.views ?? 0)), [safe]);

  const totalBars = labels.length;
  const barPct = totalBars > 30 ? 0.5 : totalBars > 20 ? 0.6 : totalBars > 10 ? 0.7 : 0.8;

  const ds = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "Visitors",
          data: visitors,
          backgroundColor: chartTheme.primary,
          borderRadius: 4,
          stack: "stack1",
          barPercentage: barPct,
          categoryPercentage: 0.9,
        },
        {
          label: "Views",
          data: views,
          backgroundColor: chartTheme.primarySoft,
          borderRadius: 4,
          stack: "stack1",
          barPercentage: barPct,
          categoryPercentage: 0.9,
        },
      ],
    }),
    [labels, visitors, views, barPct]
  );

  const base = useBaseOptions({ stacked: true, yBeginAtZero: true, showLegend: true });

  const titleMap: Record<string, string> = {
    "24h": "Visits — Today",
    "7d": "Visits — Last 7 Days",
    "30d": "Visits — Last 30 Days",
    "90d": "Visits — Last 90 Days",
    "12mo": "Visits — Last 12 Months",
  };

  return (
    <ChartCard
      title={titleMap[range] || "Visits"}
      info="Visitors and page views over time."
      loading={loading}
      height={360}
    >
      <Bar data={ds} options={base} updateMode="none" redraw={false} />
    </ChartCard>
  );
}
