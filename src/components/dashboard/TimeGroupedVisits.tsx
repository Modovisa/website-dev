// src/components/dashboard/TimeGroupedVisits.tsx

import { useEffect, useRef } from "react";
import { Chart } from "chart.js";
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

  // Step sizing like your original (~5 ticks)
  const maxValue = Math.max(0, ...visitors, ...views);
  const approxStep = Math.ceil(maxValue / 5 || 1);
  const stepSize = Math.pow(10, Math.floor(Math.log10(approxStep)));

  // Dynamic bar width like your original
  const totalBars = labels.length;
  const barPct = totalBars > 30 ? 0.5 : totalBars > 20 ? 0.6 : totalBars > 10 ? 0.7 : 0.8;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  const baseOpts = useBaseOptions({ stacked: true, yBeginAtZero: true, showLegend: true });

  // init once (no remounts)
  useEffect(() => {
    if (!canvasRef.current || chartRef.current) return;

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
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
      },
      options: {
        ...baseOpts,
        animation: false,
        scales: {
          x: {
            stacked: true,
            ticks: { color: chartTheme.axis, maxRotation: 45, minRotation: 0 },
            grid: { display: true, color: "rgba(0,0,0,0.03)" },
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
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // incremental updates only (no flicker)
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    chart.data.labels = labels;
    chart.data.datasets[0].data = visitors;
    chart.data.datasets[1].data = views;

    // keep your responsive bar width behavior
    (chart.data.datasets[0] as any).barPercentage = barPct;
    (chart.data.datasets[1] as any).barPercentage = barPct;

    // update step & y-scale smoothly
    (chart.options.scales!.y as any).ticks.stepSize = stepSize;

    chart.update("none");
  }, [labels, visitors, views, barPct, stepSize]);

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
      className="chart-card"
    >
      <canvas ref={canvasRef} />
    </ChartCard>
  );
}
