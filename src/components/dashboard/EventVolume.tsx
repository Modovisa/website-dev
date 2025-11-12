// src/components/dashboard/EventVolume.tsx

import { useEffect, useRef } from "react";
import { Chart } from "chart.js";
import { ChartCard, chartTheme, useBaseOptions } from "./ChartKit";

type Row = { label: string; count: number };

export default function EventVolume({
  data = [],
  loading,
}: {
  data: Row[];
  loading?: boolean;
}) {
  const labels = data.map((d) => d.label);
  const values = data.map((d) => d.count || 0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const baseOpts = useBaseOptions({ yBeginAtZero: true, showLegend: false });

  // init once
  useEffect(() => {
    if (!canvasRef.current || chartRef.current) return;

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
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
      },
      options: {
        ...baseOpts,
        animation: false,
        scales: {
          x: { grid: { display: true, color: "rgba(0,0,0,0.03)" } },
          y: { beginAtZero: true, grid: { color: chartTheme.grid } },
        },
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
    chart.data.labels = labels;
    (chart.data.datasets[0].data as number[]) = values;
    chart.update("none");
  }, [labels, values]);

  return (
    <ChartCard title="Event Volume" loading={loading} height={300}>
      <canvas ref={canvasRef} />
    </ChartCard>
  );
}
