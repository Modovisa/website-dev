// src/components/dashboard/TimeGroupedVisits.tsx
import { useEffect, useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { chartTheme, ChartCard, useBaseOptions } from "./ChartKit";
import type { RangeKey, TimeBucket } from "@/types/dashboard";

type Props = {
  data: TimeBucket[];
  range: RangeKey;
  loading?: boolean;
  hasData?: boolean;
  /** Optional: recompute datasets/options without forcing remount */
  version?: number;
  /** 🔑 Remount-on-frame for WS animation */
  frameKey?: number;
};

function niceStep(maxValue: number) {
  const approx = Math.max(1, Math.ceil((maxValue || 0) / 5));
  const pow10 = Math.pow(10, Math.floor(Math.log10(approx)));
  const cands = [1, 2, 5, 10].map((m) => m * pow10);
  for (const s of cands) if (approx <= s) return s;
  return cands[cands.length - 1] || 1;
}

export default function TimeGroupedVisits({
  data,
  range,
  loading,
  hasData,
  version,
  frameKey,
}: Props) {
  const base = useBaseOptions({ stacked: true, yBeginAtZero: true, showLegend: true });

  const labels = useMemo(() => (data || []).map((d) => d.label), [data, version]);
  const visitors = useMemo(() => (data || []).map((d) => Number(d.visitors) || 0), [data, version]);
  const views = useMemo(() => (data || []).map((d) => Number(d.views) || 0), [data, version]);

  // Optional debug: set window.__mvDashDbg = true in console
  useEffect(() => {
    if ((window as any).__mvDashDbg) {
      const vSum = visitors.reduce((s, n) => s + (n || 0), 0);
      const wSum = views.reduce((s, n) => s + (n || 0), 0);
      const last = labels[labels.length - 1];
      console.debug(
        `📊 [TGV] range=${range} points=${labels.length} last="${last}" visitorsSum=${vSum} viewsSum=${wSum}`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameKey, version]);

  const { ds, options } = useMemo(() => {
    const maxValue = Math.max(0, ...visitors, ...views);
    const stepSize = niceStep(maxValue);

    const totalBars = labels.length;
    const barPct =
      totalBars > 30 ? 0.5 : totalBars > 20 ? 0.6 : totalBars > 10 ? 0.7 : 0.8;

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
      animation: { duration: 600 },
      scales: {
        x: {
          ...(base as any).scales?.x,
          ticks: { color: chartTheme.axis, maxRotation: 45, minRotation: 0 },
          grid: { display: true, color: "rgba(0,0,0,0.03)" },
          stacked: true,
        },
        y: {
          ...(base as any).scales?.y,
          beginAtZero: true,
          stacked: true,
          ticks: { color: chartTheme.axis, stepSize },
          grid: { color: chartTheme.grid },
        },
      },
      plugins: {
        ...base.plugins,
        legend: { position: "bottom" as const },
        tooltip: { callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${ctx.raw}` } },
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
      {/* Force re-mount per WS frame → fresh animation */}
      <Bar key={frameKey ?? version ?? 0} data={ds} options={options} />
    </ChartCard>
  );
}
