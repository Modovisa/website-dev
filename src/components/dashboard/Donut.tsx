// src/components/dashboard/Donut.tsx

import { Doughnut } from "react-chartjs-2";
import { ChartCard } from "./ChartKit";
import {
  Chart as ChartJS,
  TooltipItem,
  Plugin,
  ArcElement,
} from "chart.js";

ChartJS.register(ArcElement);

// Subtle, Bootstrap-like palette (stable order)
const PALETTE = [
  "#e0adff", // primary
  "#b3d6ff", // info
  "#94f5e8", // success
  "#ffd895", // warning
  "#fe93a3", // red
  "#fe9aef", // violet
  "#71e4d7", // cyan
  "#ceeea5", // lime
];

export default function Donut({
  data,
  nameKey,
  valueKey,
  title,
  info,
  loading,
}: {
  data: any[];
  nameKey: string;
  valueKey: string;
  title?: string;
  info?: string;
  loading?: boolean;
}) {
  const rows = (data || []).slice().sort((a, b) => (b[valueKey] ?? 0) - (a[valueKey] ?? 0));
  const labels = rows.map((d) => String(d[nameKey] ?? "—"));
  const values = rows.map((d) => Number(d[valueKey] ?? 0));
  const total = values.reduce((a, v) => a + v, 0);

  const ds = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]),
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  };

  const centerText: Plugin<"doughnut"> = {
    id: "centerText",
    afterDraw(chart) {
      const { ctx, chartArea } = chart;
      if (!ctx || !chartArea) return;
      const txt = total ? String(total) : "0";
      ctx.save();
      ctx.font = "600 14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.fillStyle = "#111827";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const { left, right, top, bottom } = chartArea;
      ctx.fillText(txt, (left + right) / 2, (top + bottom) / 2);
      ctx.restore();
    },
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "68%",
    plugins: {
      legend: {
        display: true,
        position: "bottom" as const,
        labels: { usePointStyle: true },
      },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<"doughnut">) => {
            const v = Number(ctx.parsed) || 0;
            const pct = total ? Math.round((v / total) * 100) : 0;
            return `${ctx.label}: ${v} (${pct}%)`;
          },
        },
      },
    },
  } as const;

  return (
    <ChartCard title={title || "Donut"} info={info} loading={loading} height={280}>
      {labels.length ? (
        <Doughnut data={ds} options={options} plugins={[centerText]} />
      ) : (
        <div className="text-muted-foreground text-sm">No data</div>
      )}
    </ChartCard>
  );
}
