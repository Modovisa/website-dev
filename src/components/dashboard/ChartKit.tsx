// src/components/dashboard/ChartKit.tsx
import React from "react";

// ✅ Chart.js v3+ needs explicit registration
import {
  Chart as ChartJS,
  registerables,
  type ChartOptions,
} from "chart.js";
ChartJS.register(...registerables);

// ✅ If you use the funnel chart, load its plugin once
// (it self-registers its controller/elements on import)
import "chartjs-chart-funnel";

// 🔧 Theme tokens
export const chartTheme = {
  primary: "#635bff",
  primarySoft: "rgba(99,91,255,0.30)",
  info: "#0ea5e9",
  gray: "#9ca3af",
  axis: "#1f2937",
  grid: "rgba(0,0,0,0.06)",
};

// 🌐 Global defaults (safe to set once per bundle)
ChartJS.defaults.font.family = "'Modovisa', sans-serif";
ChartJS.defaults.color = "#1f2937";
ChartJS.defaults.plugins.legend.labels.color = "#1f2937";
ChartJS.defaults.plugins.tooltip.backgroundColor = "#ffffff";
ChartJS.defaults.plugins.tooltip.titleColor = "#000";
ChartJS.defaults.plugins.tooltip.bodyColor = "#000";
ChartJS.defaults.plugins.tooltip.borderColor = "#e5e7eb";
ChartJS.defaults.plugins.tooltip.borderWidth = 1;
ChartJS.defaults.plugins.tooltip.cornerRadius = 4;

/**
 * Base options for line/bar charts (stacking-friendly).
 * Note: in Chart.js v4, `parsing` is typed as `false | object`. Use `{}` to enable.
 */
export function useBaseOptions(opts?: {
  stacked?: boolean;
  yBeginAtZero?: boolean;
  showLegend?: boolean;
}): ChartOptions<"line" | "bar"> {
  const { stacked = false, yBeginAtZero = true, showLegend = true } = opts || {};

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    normalized: true,
    parsing: {}, // ✅ keep parsing ON (object or omit; never `true`)
    interaction: { mode: "index", intersect: false },
    scales: {
      x: {
        stacked,
        grid: { color: "rgba(0,0,0,0.03)" },
        ticks: { color: chartTheme.axis },
      },
      y: {
        stacked,
        beginAtZero: yBeginAtZero,
        grid: { color: chartTheme.grid },
        ticks: { color: chartTheme.axis },
      },
    },
    plugins: {
      legend: {
        display: showLegend,
        position: "bottom",
        labels: { usePointStyle: true },
      },
      tooltip: { mode: "index", intersect: false },
    },
  };
}

export function ChartCard({
  title,
  info,
  height = 280,
  loading,
  children,
}: {
  title: string;
  info?: string;
  height?: number;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-medium text-gray-800">{title}</h3>
        {info ? <span className="text-xs text-gray-500">{info}</span> : null}
      </div>
      <div className="p-4" style={{ height }}>
        {loading ? (
          <div className="h-full w-full animate-pulse rounded-xl bg-gray-100" />
        ) : (
          children
        )}
      </div>
    </div>
  );
}
