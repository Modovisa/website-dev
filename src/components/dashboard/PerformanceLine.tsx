// src/components/dashboard/PerformanceLine.tsx

import { useEffect, useRef } from "react";
import { Chart } from "chart.js";
import { ChartCard, chartTheme, useBaseOptions } from "./ChartKit";

type Row = { label: string; count: number };

function withAlphaHex(hex: string, alpha: number) {
  const a = Math.max(0, Math.min(1, alpha));
  const aa = Math.round(a * 255).toString(16).padStart(2, "0");
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  return `#${full}${aa}`;
}

export default function PerformanceLine({
  title,
  current,
  previous,
  color = chartTheme.info,
  filled = false,
  loading,
}: {
  title: string;
  current: Row[];
  previous?: Row[];
  color?: string;
  filled?: boolean;
  loading?: boolean;
}) {
  const allLabels = (current || previous || []).map((d) => d.label);
  const prevMap = new Map((previous || []).map((r) => [r.label, r.count]));
  const dsCurrent = allLabels.map((l) => current.find((c) => c.label === l)?.count ?? null);
  const dsPrev = allLabels.map((l) => prevMap.get(l) ?? null);
  const bg = filled ? withAlphaHex(color, 0.18) : "transparent";

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const baseOpts = useBaseOptions({ yBeginAtZero: true, showLegend: true });

  // init once
  useEffect(() => {
    if (!canvasRef.current || chartRef.current) return;

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: allLabels,
        datasets: [
          {
            label: title,
            data: dsCurrent,
            borderColor: color,
            backgroundColor: bg,
            fill: !!filled,
            tension: 0.35,
            pointRadius: filled ? 3 : 0,
            pointHoverRadius: filled ? 5 : 0,
            pointBorderWidth: filled ? 2 : 0,
            pointBackgroundColor: color,
            pointBorderColor: "#fff",
            borderWidth: 2,
            spanGaps: true,
          },
          {
            label: "Previous Period",
            data: dsPrev,
            borderColor: chartTheme.gray,
            borderDash: [5, 5],
            backgroundColor: "transparent",
            fill: false,
            tension: 0.35,
            pointRadius: 0,
            borderWidth: 2,
            spanGaps: true,
          },
        ],
      },
      options: {
        ...baseOpts,
        animation: false,
        interaction: { mode: "index" as const, intersect: false },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, grid: { color: chartTheme.grid } },
        },
        plugins: {
          legend: { position: "bottom" as const, labels: { usePointStyle: true } },
          tooltip: { mode: "index" as const, intersect: false },
          filler: { propagate: false },
        },
        maintainAspectRatio: false,
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // incremental updates
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const labels = (current || previous || []).map((d) => d.label);
    const prevMapU = new Map((previous || []).map((r) => [r.label, r.count]));
    const cur = labels.map((l) => current.find((c) => c.label === l)?.count ?? null);
    const prev = labels.map((l) => prevMapU.get(l) ?? null);

    chart.data.labels = labels;
    (chart.data.datasets[0].data as (number | null)[]) = cur;
    (chart.data.datasets[1].data as (number | null)[]) = prev;

    // keep fill/color in sync if props change
    (chart.data.datasets[0] as any).borderColor = color;
    (chart.data.datasets[0] as any).backgroundColor = filled ? withAlphaHex(color, 0.18) : "transparent";
    (chart.data.datasets[0] as any).fill = !!filled;
    (chart.data.datasets[0] as any).pointRadius = filled ? 3 : 0;
    (chart.data.datasets[0] as any).pointHoverRadius = filled ? 5 : 0;
    (chart.data.datasets[0] as any).pointBorderWidth = filled ? 2 : 0;

    chart.update("none");
  }, [title, color, filled, current, previous]);

  return (
    <ChartCard title={title} loading={loading} height={260}>
      <canvas ref={canvasRef} />
    </ChartCard>
  );
}
