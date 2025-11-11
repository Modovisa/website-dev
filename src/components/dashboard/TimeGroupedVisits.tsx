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
  const visitors = (data || []).map((d) => d.visitors || 0);
  const views = (data || []).map((d) => d.views || 0);

  // Step sizing like Bootstrap: ~5 ticks
  const maxValue = Math.max(0, ...visitors, ...views);
  const approxStep = Math.ceil(maxValue / 5 || 1);
  const stepSize = Math.pow(10, Math.floor(Math.log10(approxStep)));

  // Dynamic bar width like Bootstrap
  const totalBars = labels.length;
  const barPct = totalBars > 30 ? 0.5 : totalBars > 20 ? 0.6 : totalBars > 10 ? 0.7 : 0.8;

  const ds = {
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
  };

  const options = {
    ...useBaseOptions({ stacked: true, yBeginAtZero: true, showLegend: true }),
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
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${ctx.raw}`,
        },
      },
    },
  } as const;

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
      info="Shows the number of visitors and page views over time based on the selected range. Helps spot engagement trends."
      loading={loading}
      height={360}
    >
      <Bar data={ds} options={options} />
    </ChartCard>
  );
}
