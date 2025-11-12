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
  const labels = useMemo(() => (data || []).map((d) => d.label), [data]);
  const visitors = useMemo(() => (data || []).map((d) => d.visitors || 0), [data]);
  const views = useMemo(() => (data || []).map((d) => d.views || 0), [data]);

  const maxValue = useMemo(() => Math.max(0, ...visitors, ...views), [visitors, views]);
  const approxStep = useMemo(() => Math.ceil(maxValue / 5 || 1), [maxValue]);
  const stepSize = useMemo(() => Math.pow(10, Math.floor(Math.log10(approxStep))), [approxStep]);

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

  // ✅ Hook at top level
  const base = useBaseOptions({ stacked: true, yBeginAtZero: true, showLegend: true });

  const options = useMemo(
    () => ({
      ...base,
      scales: {
        x: {
          ticks: { color: chartTheme.axis, maxRotation: 45, minRotation: 0 },
          grid: { display: true, color: "rgba(0,0,0,0.03)" },
          stacked: true,
        },
        y: {
          beginAtZero: true,
          stacked: true,
          ticks: { color: chartTheme.axis, stepSize },
          grid: { color: chartTheme.grid },
        },
      },
      plugins: {
        legend: { position: "bottom" as const },
        tooltip: { callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${ctx.raw}` } },
      },
    }),
    [base, stepSize]
  );

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
      info="Shows visitors and page views over time for the selected range."
      loading={loading}
      height={360}
    >
      <Bar data={ds} options={options} updateMode="none" redraw={false} />
    </ChartCard>
  );
}
