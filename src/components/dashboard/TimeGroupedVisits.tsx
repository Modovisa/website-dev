// src/components/dashboard/TimeGroupedVisits.tsx
import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { chartTheme, ChartCard, useBaseOptions } from "./ChartKit";
import type { RangeKey, TimeBucket } from "@/types/dashboard";

type Props = {
  data: TimeBucket[];
  range: RangeKey;
  loading?: boolean;
  hasData?: boolean;

  /** Optional: bumps when you want to recompute datasets/options without remounting */
  version?: number;

  /** 🔑 CRITICAL: pass the WS-driven frameKey from useDashboardRealtime to re-animate on each live frame */
  frameKey?: number;
};

export default function TimeGroupedVisits({
  data,
  range,
  loading,
  hasData,
  version,
  frameKey,
}: Props) {
  // base chart options shared across charts
  const base = useBaseOptions({ stacked: true, yBeginAtZero: true, showLegend: true });

  // map buckets → arrays
  const labels = useMemo(() => (data || []).map((d) => d.label), [data, version]);
  const visitors = useMemo(() => (data || []).map((d) => d.visitors || 0), [data, version]);
  const views = useMemo(() => (data || []).map((d) => d.views || 0), [data, version]);

  const { ds, options } = useMemo(() => {
    const maxValue = Math.max(0, ...visitors, ...views);
    const approxStep = Math.ceil(maxValue / 5 || 1);
    const stepSize = Math.pow(10, Math.floor(Math.log10(approxStep)));

    // adjust bar width by bucket count (keeps dense ranges readable)
    const totalBars = labels.length;
    const barPct =
      totalBars > 30 ? 0.5 :
      totalBars > 20 ? 0.6 :
      totalBars > 10 ? 0.7 : 0.8;

    const datasets = [
      {
        datasetIdKey: "visitors",
        label: "Visitors",
        data: visitors.slice(),
        backgroundColor: chartTheme.primary,
        borderRadius: 4,
        stack: "stack1",
        barPercentage: barPct,
        categoryPercentage: 0.9,
      },
      {
        datasetIdKey: "views",
        label: "Views",
        data: views.slice(),
        backgroundColor: chartTheme.primarySoft,
        borderRadius: 4,
        stack: "stack1",
        barPercentage: barPct,
        categoryPercentage: 0.9,
      },
    ];

    const options = {
      ...base,
      animation: { duration: 600 }, // plays on mount (remount is driven by frameKey)
      scales: {
        x: {
          ...(base as any).scales.x,
          ticks: { color: chartTheme.axis, maxRotation: 45, minRotation: 0 },
          grid: { display: true, color: "rgba(0,0,0,0.03)" },
          stacked: true,
        },
        y: {
          ...(base as any).scales.y,
          beginAtZero: true,
          stacked: true,
          ticks: { color: chartTheme.axis, stepSize },
          grid: { color: chartTheme.grid },
        },
      },
      plugins: {
        ...base.plugins,
        legend: { position: "bottom" as const },
        tooltip: {
          callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${ctx.raw}` },
        },
      },
      responsive: true,
      maintainAspectRatio: false,
    } as const;

    return { ds: { labels: labels.slice(), datasets }, options };
  }, [labels, visitors, views, base, version]);

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
      hasData={hasData}
      height={360}
    >
      {/* 🔑 This forces Chart.js to remount on each WS frame → fresh animation, Bootstrap-style */}
      <Bar key={frameKey ?? version ?? 0} data={ds} options={options} />
    </ChartCard>
  );
}
